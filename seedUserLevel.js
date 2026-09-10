const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

const seedUserLevel = async () => {
  try {
    // ✅ Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/angelx"
    );

    console.log("Connected to MongoDB");

    // ✅ Update all users who don't have level field
    const result = await User.updateMany(
      { level: { $exists: false } }, // only users without level
      { $set: { level: "Base" } }
    );

    console.log(`Updated ${result.modifiedCount} users to Base level`);

    console.log("User level seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
};

seedUserLevel();