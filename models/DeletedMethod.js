const mongoose = require('mongoose');

const deletedMethodSchema = new mongoose.Schema(
  {
    originalMethodId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeMethod' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bankName: String,
    accountNo: String,
    ifscCode: String,
    accountName: String,
    deletedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Model renamed here 👇
module.exports = mongoose.model('DeletedMethod', deletedMethodSchema);
