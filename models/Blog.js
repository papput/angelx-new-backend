const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema(
  {
    id: String,
    type: {
      type: String,
      enum: ["paragraph", "heading", "table"],
      default: "paragraph",
    },
    level: String,
    text: String,
    table: mongoose.Schema.Types.Mixed,
  },
  { _id: false },
);

const sectionSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    blocks: [blockSchema],
  },
  { _id: false },
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subtitle: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    contentType: {
      type: String,
      enum: ["blog_post", "current_affairs"],
      default: "blog_post",
    },
    author: { type: String, default: "" },
    authorName: { type: String, default: "AngelX Team" },
    tags: [{ type: String, trim: true }],
    featuredImage: { type: String, default: "" },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    sections: { type: [sectionSchema], default: [] },
    metaDescription: { type: String, default: "" },
    ogTitle: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    ogDescription: { type: String, default: "" },
    canonicalUrl: { type: String, default: "" },
    robotsMeta: { type: String, default: "index, follow" },
    structuredData: { type: String, default: "" },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

blogSchema.index({ isPublished: 1, isFeatured: -1, publishedAt: -1 });
blogSchema.index({ title: "text", excerpt: "text", tags: "text" });

module.exports = mongoose.model("Blog", blogSchema);
