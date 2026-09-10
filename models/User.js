const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v); // 10-digit phone validation
        },
        message: "Phone must be 10 digits",
      },
    },

    // ✅ Balances
    availableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ✅ Limit balance (e.g., daily or transaction limit)
    limitBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ✅ User Level
    level: {
      type: String,
      enum: ["Base", "VIP", "Gold"],
      default: "Base",
    },

    // ✅ Custom Price Rate (User Specific)
    priceRate: {
      type: Number,
      default: 0, // 0 means use global/default rate
      min: 0,
    },

    // ✅ Transaction password
    transactionPassword: {
      type: String,
      minlength: 6,
      maxlength: 6,
      select: false, // Hidden by default
    },
  },
  {
    timestamps: true,
  },
);

// ✅ Generate JWT token
userSchema.methods.getJwtToken = function () {
  return jwt.sign(
    { id: this._id, type: "user" },
    process.env.JWT_SECRET || "angelx-secret-key-2024",
    { expiresIn: process.env.JWT_EXPIRE || "30d" },
  );
};

// ✅ Compare transaction password (plain text)
userSchema.methods.compareTransactionPassword = async function (
  enteredPassword,
) {
  if (!this.transactionPassword) {
    return false;
  }
  return this.transactionPassword === enteredPassword;
};

// ✅ Remove hashing middleware (plain text storage)
userSchema.pre("save", function (next) {
  next();
});

// ✅ Index for phone number
userSchema.index({ phone: 1 });

module.exports = mongoose.model("User", userSchema);
