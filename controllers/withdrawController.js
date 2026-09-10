const Withdraw = require("../models/Withdraw");
const DeletedWallet = require("../models/DeletedWallet");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const catchAsyncError = require("../utils/catchAsyncError");
const { ErrorHandler } = require("../utils/ErrorHandler");

// @desc    Create new withdrawal request
// @access  Private
const createWithdrawal = catchAsyncError(async (req, res, next) => {
  const { walletId, amount, transactionPassword } = req.body;

  // ✅ Basic Validation
  if (!walletId || !amount || amount <= 0) {
    return next(
      new ErrorHandler("Wallet ID and valid amount are required", 400)
    );
  }

  // ✅ Check if transaction password is provided
  if (!transactionPassword) {
    return next(new ErrorHandler("Transaction password is required", 400));
  }

  // ✅ Check if wallet exists and belongs to the user
  const wallet = await Wallet.findOne({
    _id: walletId,
    userId: req.user._id,
  });

  if (!wallet) {
    return next(new ErrorHandler("Wallet not found", 404));
  }

  // ✅ Fetch user with transaction password field
  const user = await User.findById(req.user._id).select("+transactionPassword");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // ✅ Check minimum limit condition
  if (amount < user.limitBalance) {
    return next(
      new ErrorHandler(
        `Withdrawal amount must be greater than or equal to your limit balance of ${user.limitBalance} USDT`,
        400
      )
    );
  }

  // ✅ Check available balance
  if (user.availableBalance < amount) {
    return next(new ErrorHandler("Insufficient balance", 400));
  }

  // ✅ Transaction Password Logic
  if (!user.transactionPassword) {
    // User has no transaction password yet → set it now
    user.transactionPassword = transactionPassword;
    await user.save({ validateBeforeSave: false });
  } else {
    // User already has a password → compare
    const isPasswordValid = await user.compareTransactionPassword(
      transactionPassword
    );
    if (!isPasswordValid) {
      return next(new ErrorHandler("Invalid transaction password", 400));
    }
  }

  // ✅ Deduct withdrawal amount from user's available balance
  user.availableBalance -= amount;
  await user.save({ validateBeforeSave: false });

  // ✅ Create withdrawal record
  const withdrawal = new Withdraw({
    userId: req.user._id,
    walletId,
    method: wallet.currency, // Correct field usage
    walletAddress: wallet.walletAddress,
    amount,
    status: "pending",
  });

  await withdrawal.save();

  // ✅ Response
  res.status(201).json({
    success: true,
    message: user.transactionPassword
      ? "Withdrawal request created successfully"
      : "Withdrawal request created and transaction password set successfully",
    data: {
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        wallet: {
          method: withdrawal.method,
          walletAddress: withdrawal.walletAddress,
        },
        createdAt: withdrawal.createdAt,
      },
      updatedBalance: user.availableBalance, // Optional new balance
    },
  });
});

// @desc    Get user's withdrawal history
// @access  Private
const getWithdrawalHistory = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { userId: req.user._id };
  if (status) {
    query.status = status;
  }

  const withdrawals = await Withdraw.find(query)
    .populate("walletId", "currency walletAddress") // Changed from 'method walletAddress' to 'currency walletAddress'
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select("-__v");

  const total = await Withdraw.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    data: {
      withdrawals,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
      },
    },
  });
});

// @desc    Get single withdrawal details
// @access  Private
const getWithdrawalById = catchAsyncError(async (req, res, next) => {
  const withdrawal = await Withdraw.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate("walletId", "currency walletAddress"); // Changed from 'method walletAddress' to 'currency walletAddress'

  if (!withdrawal) {
    return next(new ErrorHandler("Withdrawal not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      withdrawal,
    },
  });
});

// @desc    Cancel withdrawal request (only if pending)
// @access  Private
const cancelWithdrawal = catchAsyncError(async (req, res, next) => {
  const withdrawal = await Withdraw.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!withdrawal) {
    return next(new ErrorHandler("Withdrawal not found", 404));
  }

  // Only allow canceling pending withdrawals
  if (withdrawal.status !== "pending") {
    return next(new ErrorHandler("Can only cancel pending withdrawals", 400));
  }

  // Refund balance
  const user = await User.findById(req.user._id);
  user.balance += withdrawal.amount;
  await user.save();

  withdrawal.status = "cancelled";
  await withdrawal.save();

  res.status(200).json({
    success: true,
    message: "Withdrawal request cancelled successfully",
    data: {
      withdrawalId: withdrawal._id,
      status: withdrawal.status,
    },
  });
});

// @desc    Get withdrawal statistics for user
// @access  Private
const getWithdrawalStats = catchAsyncError(async (req, res, next) => {
  const stats = await Withdraw.aggregate([
    { $match: { userId: req.user._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats,
    },
  });
});

// // @desc    Get all withdrawals (admin)
// // @access  Private (Admin)
// const getAllWithdrawals = catchAsyncError(async (req, res, next) => {
//   const { page = 1, limit = 20, status, userId } = req.query;

//   const query = {};
//   if (status) query.status = status;
//   if (userId) query.userId = userId;

//   const withdrawals = await Withdraw.find(query)
//     .populate("userId", "phone")
//     .sort({ createdAt: -1 })
//     .limit(limit * 1)
//     .skip((page - 1) * limit)
//     .select("-__v");

//   const total = await Withdraw.countDocuments(query);
//   const totalPages = Math.ceil(total / limit);

//   res.status(200).json({
//     success: true,
//     data: {
//       withdrawals,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages,
//         totalRecords: total,
//       },
//     },
//   });
// });

// @desc    Get all withdrawals (admin)
// @access  Private (Admin)
const getAllWithdrawals = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 20, status, userId } = req.query;

  const query = {};
  if (status) query.status = status;
  if (userId) query.userId = userId;

  // Fetch withdrawals
  const withdrawals = await Withdraw.find(query)
    .populate("userId", "phone")
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .select("-__v");

  // Process wallet addresses
  const updatedWithdrawals = await Promise.all(
    withdrawals.map(async (withdraw) => {
      // Skip if no walletAddress available
      if (!withdraw.walletAddress) {
        withdraw.walletAddress = "Address not available";
        return withdraw;
      }

      let wallet = await Wallet.findOne({
        walletAddress: withdraw.walletAddress,
      });

      if (wallet) {
        withdraw.walletAddress = wallet.walletAddress;
      } else {
        // Try deleted wallet
        const deletedWallet = await DeletedWallet.findOne({
          walletAddress: withdraw.walletAddress,
        }).select("walletAddress");

        if (deletedWallet) {
          withdraw.walletAddress = deletedWallet.walletAddress;
        } else {
          withdraw.walletAddress = "Address not available";
        }
      }

      return withdraw;
    })
  );

  // Pagination
  const total = await Withdraw.countDocuments(query);
  const totalPages = Math.ceil(total / Number(limit));

  return res.status(200).json({
    success: true,
    data: {
      withdrawals: updatedWithdrawals,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalRecords: total,
      },
    },
  });
});

// // @desc    Update withdrawal status (admin)
// // @access  Private (Admin)
// const updateWithdrawalStatus = catchAsyncError(async (req, res, next) => {
//   const { status } = req.body;
//   const validStatuses = ["pending", "approved", "rejected"];

//   if (!validStatuses.includes(status)) {
//     return next(new ErrorHandler("Invalid status", 400));
//   }

//   const withdrawal = await Withdraw.findById(req.params.id).populate(
//     "userId",
//     "phone balance"
//   );

//   if (!withdrawal) {
//     return next(new ErrorHandler("Withdrawal not found", 404));
//   }

//   const oldStatus = withdrawal.status;
//   withdrawal.status = status;

//   // If withdrawal is rejected, refund amount to user
//   if (status === "rejected" && oldStatus === "pending") {
//     const user = await User.findById(withdrawal.userId._id);
//     if (user) {
//       user.balance += withdrawal.amount;
//       await user.save();

//       // Create transaction record
//       const transaction = new Transaction({
//         userId: user._id,
//         type: "withdrawal_refund",
//         amount: withdrawal.amount,
//         status: "completed",
//       });
//       await transaction.save();
//     }
//   }

//   // If withdrawal is approved, create transaction record
//   if (status === "approved" && oldStatus === "pending") {
//     // Deduct balance only after successful creation
//     const user = await User.findById(withdrawal.userId._id);
//     user.balance -= withdrawal.amount;
//     await user.save();
//     const transaction = new Transaction({
//       userId: withdrawal.userId._id,
//       type: "withdrawal",
//       amount: withdrawal.amount,
//       status: "completed",
//     });
//     await transaction.save();
//   }

//   await withdrawal.save();

//   res.status(200).json({
//     success: true,
//     message: "Withdrawal status updated successfully",
//     data: {
//       withdrawal,
//       oldStatus,
//       newStatus: status,
//     },
//   });
// });

// @desc    Update withdrawal status (admin)
// @access  Private (Admin)
const updateWithdrawalStatus = catchAsyncError(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ["pending", "approved", "rejected"];

  if (!validStatuses.includes(status)) {
    return next(new ErrorHandler("Invalid status", 400));
  }

  const withdrawal = await Withdraw.findById(req.params.id).populate(
    "userId",
    "phone availableBalance totalBalance"
  );

  if (!withdrawal) {
    return next(new ErrorHandler("Withdrawal not found", 404));
  }

  const oldStatus = withdrawal.status;
  withdrawal.status = status;

  if (status === "rejected" && oldStatus === "pending") {
    const user = await User.findById(withdrawal.userId._id);
    if (user) {
      user.availableBalance += withdrawal.amount;
      await user.save();

      // await new Transaction({
      //   userId: user._id,
      //   type: "withdrawal_refund",
      //   amount: withdrawal.amount,
      //   status: "completed",
      // }).save();
    }
  }

  if (status === "approved" && oldStatus === "pending") {
    const user = await User.findById(withdrawal.userId._id);
    if (!user || user.totalBalance < withdrawal.amount) {
      return next(new ErrorHandler("Insufficient total balance", 400));
    }

    user.totalBalance -= withdrawal.amount;
    await user.save();

    await new Transaction({
      userId: user._id,
      type: "withdrawal",
      amount: withdrawal.amount,
      status: "completed",
    }).save();
  }

  await withdrawal.save();

  res.status(200).json({
    success: true,
    message: "Withdrawal status updated successfully",
    data: { withdrawal, oldStatus, newStatus: status },
  });
});

// @desc    Get withdrawal statistics (admin)
// @access  Private (Admin)
const getAdminWithdrawalStats = catchAsyncError(async (req, res, next) => {
  const totalWithdrawals = await Withdraw.countDocuments();

  const totalAmount = await Withdraw.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const statusStats = await Withdraw.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalWithdrawals,
      totalAmount: totalAmount[0]?.total || 0,
      statusStats,
    },
  });
});

module.exports = {
  createWithdrawal,
  getWithdrawalHistory,
  getWithdrawalById,
  cancelWithdrawal,
  getWithdrawalStats,
  getAllWithdrawals,
  updateWithdrawalStatus,
  getAdminWithdrawalStats,
};
