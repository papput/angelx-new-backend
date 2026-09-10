const mongoose = require("mongoose");

const deletedWalletSchema = new mongoose.Schema(
  {
    originalWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currency: {
      type: String,
      enum: ["USDT", "PAYX"],
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
      trim: true,
    },
    network: {
      type: String,
      trim: true,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // user/admin who deleted this wallet
      required: true,
    },

    deletedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Indexes for fast searching
deletedWalletSchema.index({ userId: 1 });
deletedWalletSchema.index({ walletAddress: 1 });
deletedWalletSchema.index({ currency: 1 });
deletedWalletSchema.index({ deletedAt: -1 });

module.exports = mongoose.model("DeletedWallet", deletedWalletSchema);
