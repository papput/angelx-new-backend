const Admin = require("../models/Admin");
const User = require("../models/User");
const DepositMethod = require("../models/DepositMethod");
const Deposit = require("../models/Deposit");
const { Exchange } = require("../models/Exchange");
const Withdraw = require("../models/Withdraw");
const WhatsAppConfig = require("../models/WhatsAppConfig");
const mongoose = require("mongoose");
const { generateToken } = require("../middleware/auth");
const catchAsyncError = require("../utils/catchAsyncError");
const sendToken = require("../utils/sendToken");
const { ErrorHandler } = require("../utils/ErrorHandler");
const UserActivity = require("../models/UserActivity");

// @desc    Register initial admin user
// @access  Public
const registerAdmin = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if admin already exists
  const existingAdmin = await Admin.findOne();
  console.log("existingAdmin:", existingAdmin);
  if (existingAdmin) {
    return next(
      new ErrorHandler(
        "Admin already exists. Use login endpoint instead.",
        400,
      ),
    );
  }

  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required", 400));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new ErrorHandler("Please provide a valid email address", 400));
  }

  // Validate password strength
  if (password.length < 6) {
    return next(
      new ErrorHandler("Password must be at least 6 characters long", 400),
    );
  }

  // Create admin user
  const admin = new Admin({
    email: email.toLowerCase().trim(),
    password,
  });

  await admin.save();

  // Send token using sendToken utility
  sendToken(admin, 201, res, "admin");
});

// @desc    Admin login
// @access  Public
const adminLogin = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if admin exists
  const existingAdmin = await Admin.findOne();

  if (!existingAdmin) {
    return next(
      new ErrorHandler("No admin exists. Please register first.", 400),
    );
  }

  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required", 400));
  }

  // Find admin
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

  if (!admin) {
    return next(new ErrorHandler("Invalid credentials", 401));
  }

  // Check password
  const isValidPassword = await admin.comparePassword(password);

  if (!isValidPassword) {
    return next(new ErrorHandler("Invalid credentials", 401));
  }

  // Send token using sendToken utility
  sendToken(admin, 200, res, "admin");
});

// @desc    Admin logout
// @access  Private (Admin)
const adminLogout = catchAsyncError(async (req, res, next) => {
  res.cookie("adminToken", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Admin logged out successfully",
  });
});

// // @desc    Get admin dashboard data
// // @access  Private (Admin)
// const getAdminDashboard = catchAsyncError(async (req, res, next) => {
//   // Get various statistics
//   const totalUsers = await User.countDocuments();
//   const totalBalance = await User.aggregate([
//     { $group: { _id: null, total: { $sum: '$totalBalance' } } }
//   ]);

//   const userStats = await User.aggregate([
//     {
//       $group: {
//         _id: {
//           $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
//         },
//         count: { $sum: 1 }
//       }
//     },
//     { $sort: { _id: -1 } },
//     { $limit: 7 }
//   ]);

//   res.status(200).json({
//     success: true,
//     data: {
//       totalUsers,
//       totalBalance: totalBalance[0]?.total || 0,
//       recentUserRegistrations: userStats.reverse(),
//       admin: {
//         id: req.admin._id,
//         email: req.admin.email
//       }
//     }
//   });
// });

// @desc    Get admin dashboard data
// @access  Private (Admin)
const getAdminDashboard = catchAsyncError(async (req, res, next) => {
  try {
    // --- User Statistics ---
    const totalUsers = await User.countDocuments();
    const totalBalance = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$totalBalance" } } }, // make sure field is 'balance'
    ]);

    // --- Pending Transaction Stats ---
    const pendingDeposits = await Deposit.countDocuments({ status: "pending" });
    const pendingWithdrawals = await Withdraw.countDocuments({
      status: "pending",
    });
    const pendingExchanges = await Exchange.countDocuments({
      status: "pending",
    });

    // --- Blocked Users ---
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalBalance: totalBalance[0]?.total || 0,
        blockedUsers,
        // pendingDeposits,
        // pendingWithdrawals,
        // pendingExchanges,
        totalPending: pendingDeposits + pendingWithdrawals + pendingExchanges,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return next(
      new ErrorHandler(error.message || "Internal server error", 500),
    );
  }
});

// @desc Get all recent user activities
// @route GET /api/v1/admin/activity
// @access Private (Admin)
const getUserActivityFeed = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;

  const activities = await UserActivity.find()
    .populate("userId", "phone") // Show phone if available
    .sort({ createdAt: -1 }) // Latest first
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  const total = await UserActivity.countDocuments();
  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    data: {
      activities,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
      },
    },
  });
});

// @desc    Get all users with pagination
// @access  Private (Admin)
const getAllUsers = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 20, search } = req.query;

  let query = {};
  if (search) {
    query.phone = { $regex: search, $options: "i" };
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select("-__v");

  const total = await User.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
      },
    },
  });
});

// @desc    Update user balance
// @access  Private (Admin)
const updateUserBalance = catchAsyncError(async (req, res, next) => {
  const { balance, operation } = req.body;

  if (typeof balance !== "number" || balance < 0) {
    return next(new ErrorHandler("Balance must be a non-negative number", 400));
  }

  if (!["set", "add", "subtract"].includes(operation)) {
    return next(
      new ErrorHandler("Operation must be set, add, or subtract", 400),
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const oldBalance = user.balance;

  switch (operation) {
    case "set":
      user.balance = balance;
      break;
    case "add":
      user.balance += balance;
      break;
    case "subtract":
      user.balance = Math.max(0, user.balance - balance);
      break;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "User balance updated successfully",
    data: {
      userId: user._id,
      oldBalance,
      newBalance: user.balance,
      operation,
      amount: balance,
      updatedBy: req.admin.email,
    },
  });
});

// // @desc    Update admin WhatsApp number
// // @access  Private (Admin)
// const updateWhatsAppNumber = catchAsyncError(async (req, res, next) => {
//   const { whatsappNumber } = req.body;

//   if (!whatsappNumber) {
//     return next(new ErrorHandler("WhatsApp number is required", 400));
//   }

//   // Validate WhatsApp number format (basic validation)
//   // This regex allows for international format with optional + and spaces
//   const whatsappRegex = /^\+?[1-9]\d{1,14}$/;
//   if (!whatsappRegex.test(whatsappNumber.replace(/\s+/g, ""))) {
//     return next(
//       new ErrorHandler("Please provide a valid WhatsApp number", 400)
//     );
//   }

//   // Update admin's WhatsApp number
//   const admin = await Admin.findByIdAndUpdate(
//     req.admin._id,
//     { whatsappNumber: whatsappNumber.trim() },
//     { new: true, runValidators: true }
//   ).select("-password -__v");

//   if (!admin) {
//     return next(new ErrorHandler("Admin not found", 404));
//   }

//   res.status(200).json({
//     success: true,
//     message: "WhatsApp number updated successfully",
//     data: {
//       admin,
//     },
//   });
// });

// @desc Update admin WhatsApp number
const updateWhatsAppNumber = catchAsyncError(async (req, res, next) => {
  const { phoneNumber, defaultMessage } = req.body;

  if (!phoneNumber) {
    return next(new ErrorHandler("WhatsApp number is required", 400));
  }

  const whatsappRegex = /^\+?[1-9]\d{1,14}$/;

  if (!whatsappRegex.test(phoneNumber.replace(/\s+/g, ""))) {
    return next(
      new ErrorHandler("Please provide a valid WhatsApp number", 400),
    );
  }

  const config = await WhatsAppConfig.findOneAndUpdate(
    {},
    {
      phoneNumber: phoneNumber.trim(),
      defaultMessage:
        defaultMessage || "Hello, I need help with AngelX platform.",
    },
    { new: true, upsert: true },
  );

  res.status(200).json({
    success: true,
    message: "WhatsApp number updated successfully",
    data: config,
  });
});

// @desc    Get admin profile with WhatsApp number
// @access  Private (Admin)
const getAdminProfile = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.findById(req.admin._id).select("-password -__v");

  if (!admin) {
    return next(new ErrorHandler("Admin not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      admin,
    },
  });
});

const createDepositMethod = catchAsyncError(async (req, res, next) => {
  const { name, networkCode, address, qrPath } = req.body;

  if (!name || !networkCode || !address) {
    return next(
      new ErrorHandler("Name, network code, and address are required", 400),
    );
  }

  // Check if network code already exists
  const existingMethod = await DepositMethod.findOne({ networkCode });
  if (existingMethod) {
    return next(new ErrorHandler("Network code already exists", 400));
  }

  const depositMethod = new DepositMethod({
    name: name.trim(),
    networkCode: networkCode.trim(),
    address: address.trim(),
    qrPath: qrPath ? qrPath.trim() : null,
  });

  await depositMethod.save();

  res.status(201).json({
    success: true,
    message: "Deposit method created successfully",
    data: {
      method: depositMethod,
    },
  });
});

const getDepositMethods = catchAsyncError(async (req, res, next) => {
  try {
    const deposits = await Deposit.find()
      .populate("userId", "phone") // 👈 This fetches phone from users collection
      .populate("methodId", "name networkCode")
      .sort({ createdAt: -1 })
      .lean();

    // Convert nested userId.phone into separate fields
    const formattedDeposits = deposits.map((deposit) => ({
      ...deposit,
      userId: deposit.userId?._id, // keep ObjectId
      phone: deposit.userId?.phone, // separate phone
    }));

    return res.status(200).json({
      success: true,
      data: formattedDeposits,
    });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// @desc    Update deposit method
// @access  Private (Admin)
const updateDepositMethod = catchAsyncError(async (req, res, next) => {
  const { name, address, qrPath, isActive } = req.body;

  const method = await DepositMethod.findById(req.params.id);

  if (!method) {
    return next(new ErrorHandler("Deposit method not found", 404));
  }

  if (name) method.name = name.trim();
  if (address) method.address = address.trim();
  if (qrPath !== undefined) method.qrPath = qrPath ? qrPath.trim() : null;
  if (typeof isActive === "boolean") method.isActive = isActive;

  await method.save();

  res.status(200).json({
    success: true,
    message: "Deposit method updated successfully",
    data: {
      method,
    },
  });
});

// @desc    Delete deposit method
// @access  Private (Admin)
const deleteDepositMethod = catchAsyncError(async (req, res, next) => {
  const method = await DepositMethod.findById(req.params.id);

  if (!method) {
    return next(new ErrorHandler("Deposit method not found", 404));
  }

  await DepositMethod.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Deposit method deleted successfully",
    data: {
      deletedMethod: {
        id: method._id,
        name: method.name,
        networkCode: method.networkCode,
      },
    },
  });
});

// @desc    Bulk delete deposits
// @access  Private (Admin)
const bulkDeleteDeposits = catchAsyncError(async (req, res, next) => {
  const { ids } = req.body;

  // Validation
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(
      new ErrorHandler("IDs array is required and cannot be empty", 400),
    );
  }

  // Validate each ID
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler(`Invalid ID: ${id}`, 400));
    }
  }

  // Delete deposits
  const result = await Deposit.deleteMany({ _id: { $in: ids } });

  res.status(200).json({
    success: true,
    message: `Successfully deleted ${result.deletedCount} deposit(s)`,
    data: {
      deletedCount: result.deletedCount,
      requestedCount: ids.length,
    },
  });
});

// @desc    Bulk delete exchanges
// @access  Private (Admin)
const bulkDeleteExchanges = catchAsyncError(async (req, res, next) => {
  const { ids } = req.body;

  // Validation
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(
      new ErrorHandler("IDs array is required and cannot be empty", 400),
    );
  }

  // Validate each ID
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler(`Invalid ID: ${id}`, 400));
    }
  }

  // Delete exchanges
  const result = await Exchange.deleteMany({ _id: { $in: ids } });

  res.status(200).json({
    success: true,
    message: `Successfully deleted ${result.deletedCount} exchange(s)`,
    data: {
      deletedCount: result.deletedCount,
      requestedCount: ids.length,
    },
  });
});

// @desc    Bulk delete withdrawals
// @access  Private (Admin)
const bulkDeleteWithdrawals = catchAsyncError(async (req, res, next) => {
  const { ids } = req.body;

  // Validation
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(
      new ErrorHandler("IDs array is required and cannot be empty", 400),
    );
  }

  // Validate each ID
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler(`Invalid ID: ${id}`, 400));
    }
  }

  // Delete withdrawals
  const result = await Withdraw.deleteMany({ _id: { $in: ids } });

  res.status(200).json({
    success: true,
    message: `Successfully deleted ${result.deletedCount} withdrawal(s)`,
    data: {
      deletedCount: result.deletedCount,
      requestedCount: ids.length,
    },
  });
});

const getAllDeposits = catchAsyncError(async (req, res, next) => {
  const now = new Date();

  // ⭐ 1. Auto-expire overdue deposits BEFORE listing them
  await Deposit.updateMany(
    {
      status: { $in: ["pending", "processing"] },
      expiresAt: { $lte: now },
    },
    { $set: { status: "expired" } },
  );

  // ⭐ 2. Fetch updated deposits
  const deposits = await Deposit.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: deposits,
  });
});

const getAllWithdrawals = catchAsyncError(async (req, res, next) => {
  const withdrawals = await Withdraw.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: withdrawals });
});

const getAllExchanges = catchAsyncError(async (req, res, next) => {
  const exchanges = await Exchange.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: exchanges });
});

// 🚀 UPDATE USER (Balances + Level + Price Rate)
const updateUserLimit = catchAsyncError(async (req, res, next) => {
  const { limitBalance, totalBalance, availableBalance, level, priceRate } =
    req.body;

  // ✅ Validate numeric inputs
  if (
    (limitBalance !== undefined && typeof limitBalance !== "number") ||
    (totalBalance !== undefined && typeof totalBalance !== "number") ||
    (availableBalance !== undefined && typeof availableBalance !== "number") ||
    (priceRate !== undefined && typeof priceRate !== "number")
  ) {
    return res.status(400).json({
      error: "Balance values and price rate must be numbers",
    });
  }

  // ✅ Prevent negative numbers
  if (
    limitBalance < 0 ||
    totalBalance < 0 ||
    availableBalance < 0 ||
    priceRate < 0
  ) {
    return res.status(400).json({
      error: "Values cannot be negative",
    });
  }

  // ✅ Validate level
  const allowedLevels = ["Base", "VIP", "Gold"];
  if (level !== undefined && !allowedLevels.includes(level)) {
    return res.status(400).json({
      error: "Level must be Base, VIP, or Gold",
    });
  }

  // ✅ Build update object dynamically
  const updateData = {};

  if (limitBalance !== undefined) updateData.limitBalance = limitBalance;
  if (totalBalance !== undefined) updateData.totalBalance = totalBalance;
  if (availableBalance !== undefined)
    updateData.availableBalance = availableBalance;
  if (level !== undefined) updateData.level = level;
  if (priceRate !== undefined) updateData.priceRate = priceRate;

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: {
      limitBalance: user.limitBalance,
      totalBalance: user.totalBalance,
      availableBalance: user.availableBalance,
      level: user.level,
      priceRate: user.priceRate, // ✅ returning price rate
    },
  });
});

// // 🚀 UPDATE USER LIMIT (now supports totalBalance & availableBalance too)
// const updateUserLimit = catchAsyncError(async (req, res, next) => {
//   const { limitBalance, totalBalance, availableBalance } = req.body;

//   // Validate numeric inputs
//   if (
//     (limitBalance !== undefined && typeof limitBalance !== "number") ||
//     (totalBalance !== undefined && typeof totalBalance !== "number") ||
//     (availableBalance !== undefined && typeof availableBalance !== "number")
//   ) {
//     return res
//       .status(400)
//       .json({ error: "All balance values must be numbers" });
//   }

//   // Build update object dynamically (only update provided fields)
//   const updateData = {};
//   if (limitBalance !== undefined) updateData.limitBalance = limitBalance;
//   if (totalBalance !== undefined) updateData.totalBalance = totalBalance;
//   if (availableBalance !== undefined)
//     updateData.availableBalance = availableBalance;

//   const user = await User.findByIdAndUpdate(req.params.id, updateData, {
//     new: true,
//   });

//   if (!user) return res.status(404).json({ error: "User not found" });

//   res.status(200).json({
//     success: true,
//     message: "User balances updated successfully",
//     data: {
//       limitBalance: user.limitBalance,
//       totalBalance: user.totalBalance,
//       availableBalance: user.availableBalance,
//     },
//   });
// });

module.exports = {
  registerAdmin,
  adminLogin,
  adminLogout,
  getAdminDashboard,
  getAllUsers,
  updateUserBalance,
  updateWhatsAppNumber,
  getAdminProfile,
  createDepositMethod,
  updateDepositMethod,
  deleteDepositMethod,
  getDepositMethods,
  bulkDeleteDeposits,
  bulkDeleteExchanges,
  bulkDeleteWithdrawals,
  getAllDeposits,
  getAllWithdrawals,
  getAllExchanges,
  getUserActivityFeed,
  updateUserLimit,
};
