const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    phone: { type: Number, required: false },

    action: { type: String, required: true },

    details: { type: String, default: "" },

    ip: { type: String },

    userAgent: { type: String },

    // 🔥 NEW FIELD — Detect if request came from Web or Mobile
    platform: {
      type: String,
      enum: ["web", "mobile", "unknown"],
      default: "unknown",
    },
  },
  { timestamps: true }
);

// TTL Index: auto delete after 3 days
userActivitySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 3 * 24 * 60 * 60 }
);

module.exports = mongoose.model("UserActivity", userActivitySchema);
