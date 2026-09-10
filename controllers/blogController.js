const Blog = require("../models/Blog");
const Admin = require("../models/Admin");
const BlogAdmin = require("../models/BlogAdmin");
const catchAsyncError = require("../utils/catchAsyncError");
const { ErrorHandler } = require("../utils/ErrorHandler");
const sendToken = require("../utils/sendToken");

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function blocksToPlainText(sections = []) {
  return sections
    .flatMap((s) => s.blocks || [])
    .map((b) => {
      if (b.type === "table") return (b.table?.columns || []).join(" ");
      return b.text || "";
    })
    .join(" ")
    .trim();
}

function sanitizeBlogPayload(body, { partial = false } = {}) {
  const fields = [
    "title",
    "slug",
    "subtitle",
    "excerpt",
    "contentType",
    "author",
    "authorName",
    "tags",
    "featuredImage",
    "isPublished",
    "isFeatured",
    "sections",
    "metaDescription",
    "ogTitle",
    "ogImage",
    "ogDescription",
    "canonicalUrl",
    "robotsMeta",
    "structuredData",
  ];

  const payload = {};
  for (const key of fields) {
    if (body[key] !== undefined) payload[key] = body[key];
  }

  if (!partial && !payload.title?.trim()) {
    throw new ErrorHandler("Title is required", 400);
  }

  if (payload.slug !== undefined) {
    payload.slug = slugify(payload.slug || payload.title || "");
    if (!payload.slug) throw new ErrorHandler("Valid slug is required", 400);
  }

  if (payload.tags && !Array.isArray(payload.tags)) {
    payload.tags = String(payload.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  if (!payload.excerpt && payload.sections) {
    payload.excerpt = blocksToPlainText(payload.sections).slice(0, 200);
  }

  return payload;
}

const blogAdminLogin = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required", 400));
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Blog-only admins (e.g. sankul@angelx.com)
  const blogAdmin = await BlogAdmin.findOne({ email: normalizedEmail });
  if (blogAdmin) {
    const isValid = await blogAdmin.comparePassword(password);
    if (!isValid) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }
    blogAdmin.password = undefined;
    return sendToken(blogAdmin, 200, res, "blog_admin");
  }

  // Exchange admins may also access the blog CMS
  const admin = await Admin.findOne({ email: normalizedEmail });
  if (admin) {
    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }
    admin.password = undefined;
    return sendToken(admin, 200, res, "admin");
  }

  return next(new ErrorHandler("Invalid credentials", 401));
});

const getPublishedBlogs = catchAsyncError(async (req, res) => {
  const { featured, contentType, search, limit = 50 } = req.query;
  const query = { isPublished: true };

  if (featured === "true") query.isFeatured = true;
  if (contentType) query.contentType = contentType;
  if (search?.trim()) {
    query.$text = { $search: search.trim() };
  }

  const blogs = await Blog.find(query)
    .select("-structuredData -createdBy -__v")
    .sort({ isFeatured: -1, publishedAt: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .lean();

  res.json({ success: true, data: blogs });
});

const getPublishedBlogBySlug = catchAsyncError(async (req, res, next) => {
  const blog = await Blog.findOne({
    slug: slugify(req.params.slug),
    isPublished: true,
  })
    .select("-createdBy -__v")
    .lean();

  if (!blog) {
    return next(new ErrorHandler("Blog post not found", 404));
  }

  res.json({ success: true, data: blog });
});

const getAdminStats = catchAsyncError(async (req, res) => {
  const [total, published, drafts, featured] = await Promise.all([
    Blog.countDocuments(),
    Blog.countDocuments({ isPublished: true }),
    Blog.countDocuments({ isPublished: false }),
    Blog.countDocuments({ isFeatured: true, isPublished: true }),
  ]);

  res.json({
    success: true,
    data: { total, published, drafts, featured },
  });
});

const getAllBlogsAdmin = catchAsyncError(async (req, res) => {
  const { status, contentType, search } = req.query;
  const query = {};

  if (status === "published") query.isPublished = true;
  if (status === "draft") query.isPublished = false;
  if (contentType) query.contentType = contentType;
  if (search?.trim()) {
    const term = search.trim();
    query.$or = [
      { title: { $regex: term, $options: "i" } },
      { slug: { $regex: term, $options: "i" } },
      { tags: { $regex: term, $options: "i" } },
    ];
  }

  const blogs = await Blog.find(query)
    .select("-structuredData -__v")
    .sort({ updatedAt: -1 })
    .lean();

  res.json({ success: true, data: blogs });
});

const getBlogAdmin = catchAsyncError(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id).select("-__v").lean();
  if (!blog) return next(new ErrorHandler("Blog post not found", 404));
  res.json({ success: true, data: blog });
});

const createBlog = catchAsyncError(async (req, res, next) => {
  const payload = sanitizeBlogPayload(req.body);

  const exists = await Blog.findOne({ slug: payload.slug });
  if (exists) {
    return next(new ErrorHandler("A post with this slug already exists", 400));
  }

  if (payload.isPublished) {
    payload.publishedAt = new Date();
  }

  const blog = await Blog.create({
    ...payload,
    createdBy: req.blogAdmin?._id || req.admin?._id || null,
  });

  res.status(201).json({ success: true, data: blog });
});

const updateBlog = catchAsyncError(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ErrorHandler("Blog post not found", 404));

  const payload = sanitizeBlogPayload(req.body, { partial: true });

  if (payload.slug && payload.slug !== blog.slug) {
    const exists = await Blog.findOne({
      slug: payload.slug,
      _id: { $ne: blog._id },
    });
    if (exists) {
      return next(new ErrorHandler("A post with this slug already exists", 400));
    }
  }

  if (payload.isPublished === true && !blog.isPublished) {
    payload.publishedAt = new Date();
  }
  if (payload.isPublished === false) {
    payload.publishedAt = null;
  }

  Object.assign(blog, payload);
  await blog.save();

  res.json({ success: true, data: blog });
});

const deleteBlog = catchAsyncError(async (req, res, next) => {
  const blog = await Blog.findByIdAndDelete(req.params.id);
  if (!blog) return next(new ErrorHandler("Blog post not found", 404));
  res.json({ success: true, message: "Blog deleted successfully" });
});

const togglePublish = catchAsyncError(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ErrorHandler("Blog post not found", 404));

  blog.isPublished = !blog.isPublished;
  blog.publishedAt = blog.isPublished ? new Date() : null;
  await blog.save();

  res.json({ success: true, data: blog });
});

const toggleFeatured = catchAsyncError(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ErrorHandler("Blog post not found", 404));

  blog.isFeatured = !blog.isFeatured;
  await blog.save();

  res.json({ success: true, data: blog });
});

const duplicateBlog = catchAsyncError(async (req, res, next) => {
  const source = await Blog.findById(req.params.id).lean();
  if (!source) return next(new ErrorHandler("Blog post not found", 404));

  const baseSlug = `${source.slug}-copy`;
  let slug = baseSlug;
  let counter = 1;
  while (await Blog.findOne({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const copy = await Blog.create({
    title: `${source.title} (Copy)`,
    slug,
    subtitle: source.subtitle,
    excerpt: source.excerpt,
    contentType: source.contentType,
    author: source.author,
    authorName: source.authorName,
    tags: source.tags,
    featuredImage: source.featuredImage,
    isPublished: false,
    isFeatured: false,
    sections: source.sections,
    metaDescription: source.metaDescription,
    ogTitle: source.ogTitle,
    ogImage: source.ogImage,
    ogDescription: source.ogDescription,
    canonicalUrl: "",
    robotsMeta: source.robotsMeta,
    structuredData: source.structuredData,
    createdBy: req.blogAdmin?._id || req.admin?._id || null,
  });

  res.status(201).json({ success: true, data: copy });
});

module.exports = {
  blogAdminLogin,
  getPublishedBlogs,
  getPublishedBlogBySlug,
  getAdminStats,
  getAllBlogsAdmin,
  getBlogAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  togglePublish,
  toggleFeatured,
  duplicateBlog,
};
