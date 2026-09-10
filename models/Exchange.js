const mongoose = require("mongoose");

const exchangeMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankName: { type: String, trim: true },
    accountNo: { type: String, required: true, trim: true },
    ifscCode: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

exchangeMethodSchema.index({ userId: 1 });

const exchangeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    methodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExchangeMethod",
      required: true,
    },

    amount: { type: Number, required: true },
    usdtAmount: { type: Number, required: true },
    fee: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    utr: { type: String, default: "" },

    remark: { type: String, default: "" },

    submittedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exchangeSchema.index({ userId: 1 });

const ExchangeMethod = mongoose.model("ExchangeMethod", exchangeMethodSchema);
const Exchange = mongoose.model("Exchange", exchangeSchema);

module.exports = { ExchangeMethod, Exchange };
