const mongoose = require("mongoose");
require("dotenv").config();

const Blog = require("./models/Blog");

const sampleBlog = {
  title: "How to Sell USDT for INR on AngelX",
  slug: "how-to-sell-usdt-for-inr-on-angelx",
  subtitle: "A step-by-step guide for Indian traders",
  excerpt:
    "Learn how to convert USDT to INR safely on AngelX — from account setup to receiving funds in your bank account.",
  contentType: "blog_post",
  authorName: "AngelX Team",
  tags: ["USDT", "INR", "Guide", "Trading"],
  featuredImage: "",
  isPublished: true,
  isFeatured: true,
  sections: [
    {
      id: "sec_intro",
      title: "Introduction",
      blocks: [
        {
          id: "blk_h1",
          type: "heading",
          level: "h2",
          text: "Why choose AngelX?",
        },
        {
          id: "blk_p1",
          type: "paragraph",
          text: "AngelX is India's trusted platform for converting USDT to INR. With competitive rates, fast payouts, and secure OTP-based login, you can sell crypto with confidence.",
        },
      ],
    },
    {
      id: "sec_steps",
      title: "Getting Started",
      blocks: [
        {
          id: "blk_h2",
          type: "heading",
          level: "h2",
          text: "Step-by-step process",
        },
        {
          id: "blk_p2",
          type: "paragraph",
          text: "1. Sign in with your phone number and verify OTP. 2. Add your bank account details. 3. Check the live USDT/INR rate. 4. Submit your sell order. 5. Receive INR in your bank within hours.",
        },
        {
          id: "blk_table",
          type: "table",
          text: "",
          table: {
            header: true,
            stripe: true,
            columns: ["Step", "Action", "Time"],
            rows: [
              ["1", "Login with OTP", "1 min"],
              ["2", "Add bank account", "2 min"],
              ["3", "Sell USDT", "Instant"],
              ["4", "Receive INR", "1-24 hrs"],
            ],
          },
        },
      ],
    },
  ],
  metaDescription:
    "Step-by-step guide to selling USDT for INR on AngelX. Fast payouts, secure login, and competitive rates for Indian crypto traders.",
  ogTitle: "How to Sell USDT for INR on AngelX",
  robotsMeta: "index, follow",
  publishedAt: new Date(),
};

async function seedBlogs() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/angelx",
    );
    console.log("Connected to MongoDB");

    const exists = await Blog.findOne({ slug: sampleBlog.slug });
    if (exists) {
      console.log("Sample blog already exists — skipping");
    } else {
      await Blog.create(sampleBlog);
      console.log("Sample blog post created:", sampleBlog.slug);
    }

    process.exit(0);
  } catch (err) {
    console.error("Seed blogs error:", err);
    process.exit(1);
  }
}

seedBlogs();
