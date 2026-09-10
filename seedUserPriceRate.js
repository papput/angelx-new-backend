const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");
const ExchangeRate = require("./models/ExchangeRate");

const seedUserPriceRate = async () => {
  try {
    // ✅ Connect DB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/angelx"
    );

    console.log("Connected to MongoDB");

    // ✅ Get latest exchange rate
    let currentRate = await ExchangeRate.findOne().sort({ createdAt: -1 });

    if (!currentRate) {
      console.log("No exchange rate found. Creating default rate (85.0)");
      currentRate = new ExchangeRate({ dollarRate: 85.0 });
      await currentRate.save();
    }

    const rateValue = currentRate.dollarRate;

    // ✅ Update ALL users priceRate
    const result = await User.updateMany(
      {}, // all users
      { $set: { priceRate: rateValue } }
    );

    console.log(
      `Updated ${result.modifiedCount} users with priceRate = ${rateValue}`
    );

    console.log("User price rate seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
};

seedUserPriceRate();