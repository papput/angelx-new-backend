const express = require("express");
const {
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
} = require("../controllers/blogController");
const { authenticateBlogAdmin } = require("../middleware/auth");
const { validateObjectId } = require("../middleware/validation");

const router = express.Router();

router.post("/auth/login", blogAdminLogin);

router.get("/", getPublishedBlogs);
router.get("/admin/stats", authenticateBlogAdmin, getAdminStats);
router.get("/admin", authenticateBlogAdmin, getAllBlogsAdmin);
router.get("/admin/:id", authenticateBlogAdmin, validateObjectId("id"), getBlogAdmin);
router.post("/admin", authenticateBlogAdmin, createBlog);
router.post(
  "/admin/:id/duplicate",
  authenticateBlogAdmin,
  validateObjectId("id"),
  duplicateBlog,
);
router.put("/admin/:id", authenticateBlogAdmin, validateObjectId("id"), updateBlog);
router.patch(
  "/admin/:id/toggle-publish",
  authenticateBlogAdmin,
  validateObjectId("id"),
  togglePublish,
);
router.patch(
  "/admin/:id/toggle-featured",
  authenticateBlogAdmin,
  validateObjectId("id"),
  toggleFeatured,
);
router.delete("/admin/:id", authenticateBlogAdmin, validateObjectId("id"), deleteBlog);

router.get("/:slug", getPublishedBlogBySlug);

module.exports = router;
