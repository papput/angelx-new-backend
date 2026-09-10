const mongoose = require("mongoose");
require("dotenv").config();

const BlogAdmin = require("./models/BlogAdmin");

const BLOG_ADMINS = [
  {
    email: "sankul@angelx.com",
    password: "Sankul@1234",
    name: "Sankul",
  },
];

async function seedBlogAdmins() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/angelx",
    );
    console.log("Connected to MongoDB");

    for (const entry of BLOG_ADMINS) {
      const exists = await BlogAdmin.findOne({ email: entry.email });
      if (exists) {
        exists.password = entry.password;
        exists.name = entry.name;
        await exists.save();
        console.log(`Blog admin reset: ${entry.email}`);
        continue;
      }

      await BlogAdmin.create(entry);
      console.log(`Blog admin created: ${entry.email}`);
    }

    console.log("Blog admin seed completed");
    process.exit(0);
  } catch (err) {
    console.error("Seed blog admin error:", err);
    process.exit(1);
  }
}

seedBlogAdmins();
