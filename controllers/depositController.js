// const DepositMethod = require("../models/DepositMethod");
// const Deposit = require("../models/Deposit");
// const User = require("../models/User");
// const Transaction = require("../models/Transaction");
// const logUserActivity = require("../utils/logUserActivity"); // 👈 Import activity tracker

// const catchAsyncError = require("../utils/catchAsyncError");
// const { ErrorHandler } = require("../utils/ErrorHandler");

// // @desc    Get all active deposit methods
// // @access  Public
// const getDepositMethods = catchAsyncError(async (req, res, next) => {
//   const methods = await DepositMethod.find({ isActive: true })
//     .sort({ _id: 1 })
//     .select("-__v");

//   const userId = req.headers["x-user-id"];

//   // Track guest or logged-in browsing
//   if (userId) {
//     await logUserActivity(
//       req,
//       "view_deposit_methods",
//       "Viewed available deposit methods"
//     );
//   }

//   res.status(200).json({
//     success: true,
//     data: {
//       methods,
//     },
//   });
// });

// // // @desc    Create new deposit request
// // // @access  Private
// // const createDeposit = catchAsyncError(async (req, res, next) => {
// //   const { methodId, amount } = req.body;

// //   // Validation
// //   if (!methodId || !amount || amount <= 0) {
// //     await logUserActivity(
// //       req,
// //       "deposit_failed",
// //       `Invalid request amount ${amount}`
// //     );
// //     return next(
// //       new ErrorHandler("Method ID and valid amount are required", 400)
// //     );
// //   }

// //   // 🧠 Step 1: Check for unfinished deposits
// //   const ongoing = await Deposit.findOne({
// //     userId: req.user._id,
// //     status: { $in: ["pending", "processing"] },
// //   });

// //   if (ongoing) {
// //     return res.status(200).json({
// //       success: false,
// //       message: "You have unfinished orders",
// //       data: {
// //         depositId: ongoing._id,
// //         status: ongoing.status,
// //         createdAt: ongoing.createdAt,
// //       },
// //     });
// //   }

// //   // Step 2: Check if method exists and is active
// //   const method = await DepositMethod.findOne({
// //     _id: methodId,
// //     isActive: true,
// //   });

// //   if (!method) {
// //     return next(new ErrorHandler("Deposit method not found or inactive", 404));
// //   }

// //   // Step 3: Set expiry time (105 minutes from now = 1 hour 45 minutes)
// //   const expiresAt = new Date();
// //   expiresAt.setMinutes(expiresAt.getMinutes() + 105);

// //   // Step 4: Create deposit record
// //   const deposit = new Deposit({
// //     userId: req.user._id,
// //     methodId,
// //     amount,
// //     status: "pending",
// //     expiresAt,
// //   });

// //   await deposit.save();

// //   // Step 5: Populate method details for response
// //   await deposit.populate("methodId", "name networkCode address qrPath");

// //   await logUserActivity(
// //     req,
// //     "deposit_request",
// //     `Created deposit request of ${amount} USDT`
// //   );

// //   // Step 6: Respond success
// //   res.status(201).json({
// //     success: true,
// //     message: "Deposit request created successfully",
// //     data: {
// //       deposit: {
// //         id: deposit._id,
// //         amount: deposit.amount,
// //         status: deposit.status,
// //         expiresAt: deposit.expiresAt,
// //         method: deposit.methodId,
// //         createdAt: deposit.createdAt,
// //       },
// //     },
// //   });
// // });

// // @desc    Create new deposit request
// // @access  Private

// // const createDeposit = catchAsyncError(async (req, res, next) => {
// //   const { methodId, amount } = req.body;

// //   // Validation
// //   if (!methodId || !amount || amount <= 0) {
// //     await logUserActivity(
// //       req,
// //       "deposit_failed",
// //       `Invalid request amount ${amount}`
// //     );
// //     return next(
// //       new ErrorHandler("Method ID and valid amount are required", 400)
// //     );
// //   }

// //   // 🧠 Step 1: Check for unfinished deposits
// //   const ongoing = await Deposit.findOne({
// //     userId: req.user._id,
// //     status: { $in: ["pending", "processing"] },
// //   });

// //   if (ongoing) {
// //     return res.status(200).json({
// //       success: false,
// //       message: "You have unfinished orders",
// //       data: {
// //         depositId: ongoing._id,
// //         status: ongoing.status,
// //         createdAt: ongoing.createdAt,
// //       },
// //     });
// //   }

// //   // Step 2: Check if method exists and is active
// //   const method = await DepositMethod.findOne({
// //     _id: methodId,
// //     isActive: true,
// //   });

// //   if (!method) {
// //     return next(new ErrorHandler("Deposit method not found or inactive", 404));
// //   }

// //   // Step 3: Set expiry time (105 minutes from now = 1 hour 45 minutes)
// //   const expiresAt = new Date();
// //   expiresAt.setMinutes(expiresAt.getMinutes() + 105);

// //   // Step 4: Create deposit record (⛳ UPDATED HERE)
// //   const deposit = new Deposit({
// //     userId: req.user._id,
// //     methodId,
// //     methodName: method.networkCode, // 🆕 Save method name
// //     methodAddress: method.address, // 🆕 Save method address
// //     qrPath: method.qrPath || null, // 🔁 Optional but recommended
// //     amount,
// //     status: "pending",
// //     expiresAt,
// //   });

// //   await deposit.save();

// //   // Step 5: Populate method details (still useful if latest info needed)
// //   await deposit.populate("methodId", "name networkCode address qrPath");

// //   await logUserActivity(
// //     req,
// //     "deposit_request",
// //     `Created deposit request of ${amount} USDT`
// //   );

// //   // Step 6: Respond success
// //   res.status(201).json({
// //     success: true,
// //     message: "Deposit request created successfully",
// //     data: {
// //       deposit: {
// //         id: deposit._id,
// //         // amount: deposit.amount,
// //         // status: deposit.status,
// //         // expiresAt: deposit.expiresAt,
// //         // method: deposit.methodId, // populated method object
// //         // methodName: deposit.methodName, // saved method name
// //         // methodAddress: deposit.methodAddress, // saved method address
// //         // qrPath: deposit.qrPath,
// //         // createdAt: deposit.createdAt,
// //       },
// //     },
// //   });
// // });

// const createDeposit = catchAsyncError(async (req, res, next) => {
//   const { methodId, amount } = req.body;

//   // Validation
//   if (!methodId || !amount || amount <= 0) {
//     await logUserActivity(
//       req,
//       "deposit_failed",
//       `Invalid request amount ${amount}`
//     );
//     return next(
//       new ErrorHandler("Method ID and valid amount are required", 400)
//     );
//   }

//   // ⭐ STEP 1: Auto-expire all user's old pending/processing deposits
//   await Deposit.updateMany(
//     {
//       userId: req.user._id,
//       status: { $in: ["pending", "processing"] },
//       expiresAt: { $lt: new Date() }, // expired by time
//     },
//     { $set: { status: "expired" } }
//   );

//   // ⭐ STEP 2: Now check if any unfinished (not expired) deposits remain
//   const ongoing = await Deposit.findOne({
//     userId: req.user._id,
//     status: { $in: ["pending", "processing"] }, // now these are only valid ones
//   });

//   if (ongoing) {
//     return res.status(200).json({
//       success: false,
//       message: "You have unfinished orders",
//       data: {
//         depositId: ongoing._id,
//         status: ongoing.status,
//         createdAt: ongoing.createdAt,
//       },
//     });
//   }

//   // STEP 3: Check if method exists and active
//   const method = await DepositMethod.findOne({
//     _id: methodId,
//     isActive: true,
//   });

//   if (!method) {
//     return next(new ErrorHandler("Deposit method not found or inactive", 404));
//   }

//   // STEP 4: Set expiry time (105 minutes from now)
//   const expiresAt = new Date();
//   expiresAt.setMinutes(expiresAt.getMinutes() + 105);

//   // STEP 5: Create deposit
//   const deposit = new Deposit({
//     userId: req.user._id,
//     methodId,
//     methodName: method.networkCode,
//     methodAddress: method.address,
//     qrPath: method.qrPath || null,
//     amount,
//     status: "pending",
//     expiresAt,
//   });

//   await deposit.save();

//   await deposit.populate("methodId", "name networkCode address qrPath");

//   await logUserActivity(
//     req,
//     "deposit_request",
//     `Created deposit request of ${amount} USDT`
//   );

//   // STEP 6: Response
//   return res.status(201).json({
//     success: true,
//     message: "Deposit request created successfully",
//     data: { deposit: { id: deposit._id } },
//   });
// });

// // @desc   Check if user has any unfinished deposits
// // @access Private
// const checkUnfinishedDeposits = catchAsyncError(async (req, res, next) => {
//   // Deposits which block new creation: pending OR processing
//   const ongoing = await Deposit.findOne({
//     userId: req.user._id,
//     status: { $in: ["pending", "processing"] },
//   });

//   if (ongoing) {
//     return res.status(200).json({
//       success: false,
//       message: "You have unfinished orders",
//       data: {
//         depositId: ongoing._id,
//         status: ongoing.status,
//         createdAt: ongoing.createdAt,
//       },
//     });
//   }

//   // ✅ No unfinished deposits
//   return res.status(200).json({
//     success: true,
//     message: "No unfinished orders",
//   });
// });

// // @desc    Submit transaction ID for deposit
// // @access  Private
// const submitTxid = catchAsyncError(async (req, res, next) => {
//   const { depositId, txid } = req.body;

//   if (!depositId || !txid || txid.trim().length === 0) {
//     return next(
//       new ErrorHandler("Deposit ID and transaction ID are required", 400)
//     );
//   }

//   // Find deposit
//   const deposit = await Deposit.findOne({
//     _id: depositId,
//     userId: req.user._id,
//   });

//   if (!deposit) {
//     return next(new ErrorHandler("Deposit not found", 404));
//   }

//   // Check if deposit is in correct status
//   if (deposit.status !== "pending") {
//     return next(new ErrorHandler("Deposit is not in pending status", 400));
//   }

//   // Check if not expired
//   if (new Date() > deposit.expiresAt) {
//     deposit.status = "expired";
//     await deposit.save();

//     return next(new ErrorHandler("Deposit request has expired", 400));
//   }

//   // Validate TXID length
//   const cleanTxid = txid.trim();
//   if (cleanTxid.length > 160) {
//     return next(new ErrorHandler("Transaction ID is too long", 400));
//   }

//   // Update deposit with TXID
//   deposit.txid = cleanTxid;
//   deposit.status = "processing";
//   await deposit.save();

//   res.status(200).json({
//     success: true,
//     message:
//       "Transaction ID submitted successfully. Deposit is being processed.",
//     data: {
//       depositId: deposit._id,
//       txid: deposit.txid,
//       status: deposit.status,
//     },
//   });
// });

// // @desc    Get user's deposit history
// // @access  Private
// const getDepositHistory = catchAsyncError(async (req, res, next) => {
//   const { page = 1, limit = 10, status } = req.query;

//   const query = { userId: req.user._id };
//   if (status) {
//     query.status = status;
//   }

//   const options = {
//     page: parseInt(page),
//     limit: parseInt(limit),
//     sort: { createdAt: -1 },
//   };

//   // Find deposits first
//   let deposits = await Deposit.find(query)
//     .populate("methodId", "name networkCode qrPath")
//     .sort(options.sort)
//     .limit(options.limit * 1)
//     .skip((options.page - 1) * options.limit)
//     .select("-__v");

//   // Check for expired deposits and update their status
//   const now = new Date();

//   // Directly update expired deposits in database without creating array
//   await Deposit.updateMany(
//     {
//       userId: req.user._id,
//       status: "pending" || "processing",
//       expiresAt: { $lt: now },
//     },
//     {
//       status: "expired",
//     }
//   );

//   // Re-fetch deposits with updated status if any deposits were potentially expired
//   deposits = await Deposit.find(query)
//     .populate("methodId", "name networkCode qrPath")
//     .sort(options.sort)
//     .limit(options.limit * 1)
//     .skip((options.page - 1) * options.limit)
//     .select("-__v");

//   const total = await Deposit.countDocuments(query);
//   const totalPages = Math.ceil(total / options.limit);

//   res.status(200).json({
//     success: true,
//     data: {
//       deposits,
//       pagination: {
//         currentPage: options.page,
//         totalPages,
//         totalRecords: total,
//         hasNext: options.page < totalPages,
//         hasPrev: options.page > 1,
//       },
//     },
//   });
// });

// // @desc    Get single deposit details
// // @access  Private
// const getDepositById = catchAsyncError(async (req, res, next) => {
//   const deposit = await Deposit.findOne({
//     _id: req.params.id,
//     userId: req.user._id,
//   }).populate("methodId", "name networkCode address qrPath");

//   if (!deposit) {
//     return next(new ErrorHandler("Deposit not found", 404));
//   }

//   // Check if expired and update status
//   if (
//     (deposit.status === "pending" || deposit.status === "processing") &&
//     new Date() > deposit.expiresAt
//   ) {
//     deposit.status = "expired";
//     await deposit.save();
//   }

//   res.status(200).json({
//     success: true,
//     data: {
//       deposit,
//     },
//   });
// });

// // @desc    Cancel deposit request
// // @access  Private
// const cancelDeposit = catchAsyncError(async (req, res, next) => {
//   const deposit = await Deposit.findOne({
//     _id: req.params.id,
//     userId: req.user._id,
//   });

//   if (!deposit) {
//     return next(new ErrorHandler("Deposit not found", 404));
//   }

//   console.log("status --- > ", deposit.status);

//   // Allow cancel only if status is pending or processing
//   if (deposit.status.trim() !== "pending") {
//     await logUserActivity(
//       req,
//       "deposit_cancel_failed",
//       "Tried cancelling non-pending deposit"
//     );

//     console.log("Status allowed:", deposit.status.trim() !== "processing");
//     return next(
//       new ErrorHandler("Can only cancel pending or processing deposits", 400)
//     );
//   }

//   deposit.status = "expired";
//   await deposit.save();

//   await logUserActivity(
//     req,
//     "deposit_cancelled",
//     `Cancelled deposit request of ${deposit.amount}`
//   );

//   res.status(200).json({
//     success: true,
//     message: "Deposit request cancelled successfully",
//     data: {
//       depositId: deposit._id,
//       status: deposit.status,
//     },
//   });
// });

// // @desc    Get all deposits (admin)
// // @access  Private (Admin)
// const getAllDeposits = catchAsyncError(async (req, res, next) => {
//   const { page = 1, limit = 20, status, userId } = req.query;

//   const query = {};
//   if (status) query.status = status;
//   if (userId) query.userId = userId;

//   const deposits = await Deposit.find(query)
//     .populate("userId", "phone")
//     .populate("methodId", "name networkCode address qrPath")
//     .sort({ createdAt: -1 })
//     .limit(limit * 1)
//     .skip((page - 1) * limit)
//     .select("-__v");

//   const total = await Deposit.countDocuments(query);
//   const totalPages = Math.ceil(total / limit);

//   res.status(200).json({
//     success: true,
//     data: {
//       deposits,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages,
//         totalRecords: total,
//       },
//     },
//   });
// });

// // // @desc    Update deposit status (admin)
// // // @access  Private (Admin)
// // const updateDepositStatus = catchAsyncError(async (req, res, next) => {
// //   const { status } = req.body;
// //   const validStatuses = [
// //     "pending",
// //     "processing",
// //     // "completed",
// //     // "failed",
// //     // "expired",
// //   ];

// //   if (!validStatuses.includes(status)) {
// //     return next(new ErrorHandler("Invalid status", 400));
// //   }

// //   const deposit = await Deposit.findById(req.params.id).populate(
// //     "userId",
// //     "phone balance"
// //   );

// //   if (!deposit) {
// //     return next(new ErrorHandler("Deposit not found", 404));
// //   }

// //   const oldStatus = deposit.status;
// //   deposit.status = status;

// //   let updatedUserBalance = null;

// //   // If deposit is completed, add USDT amount directly to user balance (no conversion needed)
// //   if (status === "completed" && oldStatus !== "completed") {
// //     const user = await User.findById(deposit.userId._id);
// //     if (user) {
// //       // Since we're depositing USDT directly, use the deposit amount as-is
// //       const usdtAmount = deposit.amount;

// //       // Add USDT amount to user balance
// //       user.balance += usdtAmount;
// //       await user.save();

// //       // Store the updated balance to return in response
// //       updatedUserBalance = user.balance;

// //       // Create transaction record
// //       const transaction = new Transaction({
// //         userId: user._id,
// //         type: "deposit",
// //         amount: usdtAmount, // Store USDT amount in transaction
// //         status: "completed",
// //       });
// //       await transaction.save();
// //     }
// //   }

// //   await deposit.save();

// //   const responseData = {
// //     success: true,
// //     message: "Deposit status updated successfully",
// //     data: {
// //       deposit,
// //       oldStatus,
// //       newStatus: status,
// //     },
// //   };

// //   // Include updated user balance in response if deposit was completed
// //   if (
// //     status === "completed" &&
// //     oldStatus !== "completed" &&
// //     updatedUserBalance !== null
// //   ) {
// //     responseData.data.updatedUserBalance = updatedUserBalance;
// //   }

// //   res.status(200).json(responseData);
// // });

// // @desc    Update deposit status (admin)
// // @access  Private (Admin)
// // const updateDepositStatus = catchAsyncError(async (req, res, next) => {
// //   const { status } = req.body;
// //   const validStatuses = [
// //     "pending",
// //     "processing",
// //     "completed",
// //     "failed",
// //     "expired",
// //   ];

// //   if (!validStatuses.includes(status)) {
// //     return next(new ErrorHandler("Invalid status", 400));
// //   }

// //   const deposit = await Deposit.findById(req.params.id).populate(
// //     "userId",
// //     "phone availableBalance totalBalance"
// //   );

// //   if (!deposit) {
// //     return next(new ErrorHandler("Deposit not found", 404));
// //   }

// //   const oldStatus = deposit.status;
// //   deposit.status = status;

// //   let updatedUserBalance = null;

// //   // 🟢 If deposit is completed → Update user balances
// //   if (status === "completed" && oldStatus !== "completed") {
// //     const user = await User.findById(deposit.userId._id);

// //     if (user) {
// //       const usdtAmount = deposit.amount;

// //       // 🔹 Add to both total and available balance
// //       user.availableBalance += usdtAmount;
// //       user.totalBalance += usdtAmount;
// //       await user.save();

// //       updatedUserBalance = {
// //         availableBalance: user.availableBalance,
// //         totalBalance: user.totalBalance,
// //       };

// //       // Create transaction record
// //       const transaction = new Transaction({
// //         userId: user._id,
// //         type: "deposit",
// //         amount: usdtAmount,
// //         status: "completed",
// //       });
// //       await transaction.save();
// //     }
// //   }

// //   await deposit.save();

// //   const responseData = {
// //     success: true,
// //     message: "Deposit status updated successfully",
// //     data: {
// //       deposit,
// //       oldStatus,
// //       newStatus: status,
// //     },
// //   };

// //   // Include updated user balances if changed
// //   if (updatedUserBalance !== null) {
// //     responseData.data.updatedUserBalance = updatedUserBalance;
// //   }

// //   res.status(200).json(responseData);
// // });

// const updateDepositStatus = catchAsyncError(async (req, res, next) => {
//   const { status } = req.body;
//   const validStatuses = [
//     "pending",
//     "processing",
//     "completed",
//     "failed",
//     "expired",
//   ];

//   if (!validStatuses.includes(status)) {
//     return next(new ErrorHandler("Invalid status", 400));
//   }

//   // 🔍 Fetch deposit
//   const deposit = await Deposit.findById(req.params.id).populate(
//     "userId",
//     "phone availableBalance totalBalance"
//   );

//   if (!deposit) {
//     return next(new ErrorHandler("Deposit not found", 404));
//   }

//   const now = new Date();

//   /* -----------------------------------------------------
//      ⭐ AUTO-EXPIRE LOGIC (NEW)
//      If deposit already crossed expiry time AND is still pending/processing
//   ------------------------------------------------------ */
//   if (
//     deposit.expiresAt &&
//     deposit.expiresAt <= now &&
//     ["pending", "processing"].includes(deposit.status)
//   ) {
//     deposit.status = "expired";
//     await deposit.save();

//     return res.status(200).json({
//       success: true,
//       message: "Deposit was already expired. Status updated to expired.",
//       data: {
//         deposit,
//         oldStatus: "pending/processing",
//         newStatus: "expired",
//       },
//     });
//   }

//   /* -----------------------------------------------------
//      Continue with normal status update flow
//   ------------------------------------------------------ */

//   const oldStatus = deposit.status;
//   deposit.status = status;

//   let updatedUserBalance = null;

//   // 🟢 If deposit is completed → Update user balances
//   if (status === "completed" && oldStatus !== "completed") {
//     const user = await User.findById(deposit.userId._id);

//     if (user) {
//       const usdtAmount = deposit.amount;

//       user.availableBalance += usdtAmount;
//       user.totalBalance += usdtAmount;
//       await user.save();

//       updatedUserBalance = {
//         availableBalance: user.availableBalance,
//         totalBalance: user.totalBalance,
//       };

//       // Create transaction record
//       const transaction = new Transaction({
//         userId: user._id,
//         type: "deposit",
//         amount: usdtAmount,
//         status: "completed",
//       });
//       await transaction.save();
//     }
//   }

//   await deposit.save();

//   const responseData = {
//     success: true,
//     message: "Deposit status updated successfully",
//     data: {
//       deposit,
//       oldStatus,
//       newStatus: status,
//     },
//   };

//   if (updatedUserBalance) {
//     responseData.data.updatedUserBalance = updatedUserBalance;
//   }

//   res.status(200).json(responseData);
// });

// module.exports = {
//   getDepositMethods,
//   createDeposit,
//   checkUnfinishedDeposits,
//   submitTxid,
//   getDepositHistory,
//   getDepositById,
//   cancelDeposit,
//   getAllDeposits,
//   updateDepositStatus,
// };

const DepositMethod = require("../models/DepositMethod");
const Deposit = require("../models/Deposit");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const logUserActivity = require("../utils/logUserActivity"); // 👈 Import activity tracker

const catchAsyncError = require("../utils/catchAsyncError");
const { ErrorHandler } = require("../utils/ErrorHandler");

// @desc    Get all active deposit methods
// @access  Public
const getDepositMethods = catchAsyncError(async (req, res, next) => {
  const methods = await DepositMethod.find({ isActive: true })
    .sort({ _id: 1 })
    .select("-__v");

  const userId = req.headers["x-user-id"];

  // Track guest or logged-in browsing
  if (userId) {
    await logUserActivity(
      req,
      "view_deposit_methods",
      "Viewed available deposit methods"
    );
  }

  res.status(200).json({
    success: true,
    data: {
      methods,
    },
  });
});

// // @desc    Create new deposit request (private)
// const createDeposit = catchAsyncError(async (req, res, next) => {
//   const { methodId, amount } = req.body;

//   // Validation
//   if (!methodId || !amount || amount <= 0) {
//     await logUserActivity(
//       req,
//       "deposit_failed",
//       `Invalid request amount ${amount}`
//     );
//     return next(
//       new ErrorHandler("Method ID and valid amount are required", 400)
//     );
//   }

//   // ⭐ STEP 1: Auto-expire all user's old pending/processing deposits
//   await Deposit.updateMany(
//     {
//       userId: req.user._id,
//       status: { $in: ["pending", "processing"] },
//       expiresAt: { $lt: new Date() },
//     },
//     { $set: { status: "expired" } }
//   );

//   // ⭐ STEP 2: Now check if any unfinished (not expired) deposits remain
//   const ongoing = await Deposit.findOne({
//     userId: req.user._id,
//     status: { $in: ["pending", "processing"] },
//   });

//   if (ongoing) {
//     return res.status(200).json({
//       success: false,
//       message: "You have unfinished orders",
//       data: {
//         depositId: ongoing._id,
//         status: ongoing.status,
//         createdAt: ongoing.createdAt,
//       },
//     });
//   }

//   // STEP 3: Check if method exists and active
//   const method = await DepositMethod.findOne({
//     _id: methodId,
//     isActive: true,
//   });

//   if (!method) {
//     return next(new ErrorHandler("Deposit method not found or inactive", 404));
//   }

//   // STEP 4: Set expiry time
//   const expiresAt = new Date();
//   expiresAt.setMinutes(expiresAt.getMinutes() + 105);

//   // STEP 5: Create deposit
//   const deposit = new Deposit({
//     userId: req.user._id,
//     methodId,
//     methodName: method.networkCode,
//     methodAddress: method.address,
//     qrPath: method.qrPath || null,
//     amount,
//     status: "pending",
//     expiresAt,
//   });

//   await deposit.save();
//   await deposit.populate("methodId", "name networkCode address qrPath");

//   await logUserActivity(
//     req,
//     "deposit_request",
//     `Created deposit request of ${amount} USDT`
//   );

//   // STEP 6: Response
//   return res.status(201).json({
//     success: true,
//     message: "Deposit request created successfully",
//     data: { deposit: { id: deposit._id } },
//   });
// });

// @desc    Create new deposit request (private)
const createDeposit = catchAsyncError(async (req, res, next) => {
  const { methodId, amount } = req.body;

  // Validation
  if (!methodId || !amount || amount <= 0) {
    await logUserActivity(
      req,
      "deposit_failed",
      `Invalid request amount ${amount}`
    );
    return next(
      new ErrorHandler("Method ID and valid amount are required", 400)
    );
  }

  // ⭐ NEW VALIDATION: Minimum deposit = $10
  if (amount < 10) {
    await logUserActivity(
      req,
      "deposit_failed",
      `Deposit amount too low: ${amount}`
    );

    return res.status(200).json({
      success: false,
      message: "Minimum deposit amount is $10",
      data: {
        minimumAmount: 10,
        enteredAmount: amount,
      },
    });
  }

  // ⭐ STEP 1: Auto-expire all user's old pending/processing deposits
  await Deposit.updateMany(
    {
      userId: req.user._id,
      status: { $in: ["pending", "processing"] },
      expiresAt: { $lt: new Date() },
    },
    { $set: { status: "expired" } }
  );

  // ⭐ STEP 2: Now check if any unfinished (not expired) deposits remain
  const ongoing = await Deposit.findOne({
    userId: req.user._id,
    status: { $in: ["pending", "processing"] },
  });

  if (ongoing) {
    return res.status(200).json({
      success: false,
      message: "You have unfinished orders",
      data: {
        depositId: ongoing._id,
        status: ongoing.status,
        createdAt: ongoing.createdAt,
      },
    });
  }

  // STEP 3: Check if method exists and active
  const method = await DepositMethod.findOne({
    _id: methodId,
    isActive: true,
  });

  if (!method) {
    return next(new ErrorHandler("Deposit method not found or inactive", 404));
  }

  // STEP 4: Set expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 105);

  // STEP 5: Create deposit
  const deposit = new Deposit({
    userId: req.user._id,
    methodId,
    methodName: method.networkCode,
    methodAddress: method.address,
    qrPath: method.qrPath || null,
    amount,
    status: "pending",
    expiresAt,
  });

  await deposit.save();
  await deposit.populate("methodId", "name networkCode address qrPath");

  await logUserActivity(
    req,
    "deposit_request",
    `Created deposit request of ${amount} USDT`
  );

  // STEP 6: Response
  return res.status(201).json({
    success: true,
    message: "Deposit request created successfully",
    data: { deposit: { id: deposit._id } },
  });
});

// @desc   Check if user has any unfinished deposits
// @access Private
const checkUnfinishedDeposits = catchAsyncError(async (req, res, next) => {
  const ongoing = await Deposit.findOne({
    userId: req.user._id,
    status: { $in: ["pending", "processing"] },
  });

  if (ongoing) {
    return res.status(200).json({
      success: false,
      message: "You have unfinished orders",
      data: {
        depositId: ongoing._id,
        status: ongoing.status,
        createdAt: ongoing.createdAt,
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: "No unfinished orders",
  });
});

// @desc    Submit transaction ID for deposit
// @access  Private
const submitTxid = catchAsyncError(async (req, res, next) => {
  const { depositId, txid } = req.body;

  if (!depositId || !txid || txid.trim().length === 0) {
    return next(
      new ErrorHandler("Deposit ID and transaction ID are required", 400)
    );
  }

  // Find deposit
  const deposit = await Deposit.findOne({
    _id: depositId,
    userId: req.user._id,
  });

  if (!deposit) {
    return next(new ErrorHandler("Deposit not found", 404));
  }

  // Check if deposit is in correct status
  if (deposit.status !== "pending") {
    await logUserActivity(
      req,
      "deposit_txid_failed",
      "Tried submitting TXID for non-pending deposit"
    );

    return next(new ErrorHandler("Deposit is not in pending status", 400));
  }

  // Check if expired
  if (new Date() > deposit.expiresAt) {
    deposit.status = "expired";
    await deposit.save();

    await logUserActivity(
      req,
      "deposit_expired",
      "Deposit expired before TXID submission"
    );

    return next(new ErrorHandler("Deposit request has expired", 400));
  }

  // Validate TXID
  const cleanTxid = txid.trim();
  if (cleanTxid.length > 160) {
    return next(new ErrorHandler("Transaction ID is too long", 400));
  }

  // Update deposit with TXID
  deposit.txid = cleanTxid;
  deposit.status = "processing";
  await deposit.save();

  await logUserActivity(
    req,
    "deposit_txid_submitted",
    `TXID submitted for deposit ${deposit._id}`
  );

  res.status(200).json({
    success: true,
    message:
      "Transaction ID submitted successfully. Deposit is being processed.",
    data: {
      depositId: deposit._id,
      txid: deposit.txid,
      status: deposit.status,
    },
  });
});

// @desc    Get user's deposit history
// @access  Private
const getDepositHistory = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { userId: req.user._id };
  if (status) query.status = status;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
  };

  let deposits = await Deposit.find(query)
    .populate("methodId", "name networkCode qrPath")
    .sort(options.sort)
    .limit(options.limit)
    .skip((options.page - 1) * options.limit)
    .select("-__v");

  // Update expired deposits
  const now = new Date();

  await Deposit.updateMany(
    {
      userId: req.user._id,
      status: "pending" || "processing",
      expiresAt: { $lt: now },
    },
    { status: "expired" }
  );

  deposits = await Deposit.find(query)
    .populate("methodId", "name networkCode qrPath")
    .sort(options.sort)
    .limit(options.limit)
    .skip((options.page - 1) * options.limit)
    .select("-__v");

  const total = await Deposit.countDocuments(query);
  const totalPages = Math.ceil(total / options.limit);

  res.status(200).json({
    success: true,
    data: {
      deposits,
      pagination: {
        currentPage: options.page,
        totalPages,
        totalRecords: total,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1,
      },
    },
  });
});

// @desc    Get single deposit details
// @access  Private
const getDepositById = catchAsyncError(async (req, res, next) => {
  const deposit = await Deposit.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate("methodId", "name networkCode address qrPath");

  if (!deposit) {
    return next(new ErrorHandler("Deposit not found", 404));
  }

  // Check if expired
  if (
    ["pending", "processing"].includes(deposit.status) &&
    new Date() > deposit.expiresAt
  ) {
    deposit.status = "expired";
    await deposit.save();

    await logUserActivity(
      req,
      "deposit_expired",
      `Deposit ${deposit._id} auto expired`
    );
  }

  res.status(200).json({
    success: true,
    data: { deposit },
  });
});

// @desc    Cancel deposit request
// @access  Private
const cancelDeposit = catchAsyncError(async (req, res, next) => {
  const deposit = await Deposit.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!deposit) {
    return next(new ErrorHandler("Deposit not found", 404));
  }

  if (deposit.status.trim() !== "pending") {
    await logUserActivity(
      req,
      "deposit_cancel_failed",
      "Tried cancelling non-pending deposit"
    );

    return next(
      new ErrorHandler("Can only cancel pending or processing deposits", 400)
    );
  }

  deposit.status = "expired";
  await deposit.save();

  await logUserActivity(
    req,
    "deposit_cancelled",
    `Cancelled deposit request of ${deposit.amount}`
  );

  res.status(200).json({
    success: true,
    message: "Deposit request cancelled successfully",
    data: {
      depositId: deposit._id,
      status: deposit.status,
    },
  });
});

// @desc    Get all deposits (admin)
const getAllDeposits = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 20, status, userId } = req.query;

  const query = {};
  if (status) query.status = status;
  if (userId) query.userId = userId;

  const deposits = await Deposit.find(query)
    .populate("userId", "phone")
    .populate("methodId", "name networkCode address qrPath")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .select("-__v");

  const total = await Deposit.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    data: {
      deposits,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
      },
    },
  });
});

// @desc    Update deposit status (admin)
const updateDepositStatus = catchAsyncError(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = [
    "pending",
    "processing",
    "completed",
    "failed",
    "expired",
  ];

  if (!validStatuses.includes(status)) {
    return next(new ErrorHandler("Invalid status", 400));
  }

  const deposit = await Deposit.findById(req.params.id).populate(
    "userId",
    "phone availableBalance totalBalance"
  );

  if (!deposit) {
    return next(new ErrorHandler("Deposit not found", 404));
  }

  const now = new Date();

  // Auto-expire if needed
  if (
    deposit.expiresAt &&
    deposit.expiresAt <= now &&
    ["pending", "processing"].includes(deposit.status)
  ) {
    deposit.status = "expired";
    await deposit.save();

    return res.status(200).json({
      success: true,
      message: "Deposit was already expired. Status updated to expired.",
      data: {
        deposit,
        oldStatus: "pending/processing",
        newStatus: "expired",
      },
    });
  }

  const oldStatus = deposit.status;
  deposit.status = status;

  let updatedUserBalance = null;

  if (status === "completed" && oldStatus !== "completed") {
    const user = await User.findById(deposit.userId._id);

    if (user) {
      const usdtAmount = deposit.amount;

      user.availableBalance += usdtAmount;
      user.totalBalance += usdtAmount;
      await user.save();

      updatedUserBalance = {
        availableBalance: user.availableBalance,
        totalBalance: user.totalBalance,
      };

      // Create transaction
      await Transaction.create({
        userId: user._id,
        type: "deposit",
        amount: usdtAmount,
        status: "completed",
      });
    }
  }

  await deposit.save();

  const responseData = {
    success: true,
    message: "Deposit status updated successfully",
    data: {
      deposit,
      oldStatus,
      newStatus: status,
    },
  };

  if (updatedUserBalance) {
    responseData.data.updatedUserBalance = updatedUserBalance;
  }

  res.status(200).json(responseData);
});

module.exports = {
  getDepositMethods,
  createDeposit,
  checkUnfinishedDeposits,
  submitTxid,
  getDepositHistory,
  getDepositById,
  cancelDeposit,
  getAllDeposits,
  updateDepositStatus,
};
