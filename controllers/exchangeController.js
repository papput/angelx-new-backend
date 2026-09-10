const https = require("https");
const ExchangeRate = require("../models/ExchangeRate");
const DeletedMethod = require("../models/DeletedMethod");
const { ExchangeMethod, Exchange } = require("../models/Exchange");
const User = require("../models/User");
const catchAsyncError = require("../utils/catchAsyncError");
const { ErrorHandler } = require("../utils/ErrorHandler");

// @desc    Get current exchange rate
// @access  Public
const getCurrentRate = catchAsyncError(async (req, res, next) => {
  let rate = await ExchangeRate.findOne().sort({ createdAt: -1 });

  if (!rate) {
    // Create default rate if none exists
    rate = new ExchangeRate({
      dollarRate: 85.0,
    });
    await rate.save();
  }

  res.status(200).json({
    success: true,
    data: {
      rate: rate.dollarRate,
      lastUpdated: rate.updatedAt,
    },
  });
});

// @desc    Update exchange rate (admin only)
// @access  Private (Admin)
const updateRate = catchAsyncError(async (req, res, next) => {
  const { dollarRate } = req.body;

  if (!dollarRate || typeof dollarRate !== "number" || dollarRate <= 0) {
    return next(new ErrorHandler("Valid dollar rate is required", 400));
  }

  // ✅ Get current latest rate
  let rate = await ExchangeRate.findOne().sort({ createdAt: -1 });

  let oldRateValue = null;

  if (!rate) {
    // First time setup
    rate = new ExchangeRate({
      dollarRate,
      updatedBy: req.admin.email || "admin",
    });

    await rate.save();

    oldRateValue = dollarRate; // no previous rate
  } else {
    oldRateValue = rate.dollarRate;

    rate.dollarRate = dollarRate;
    rate.updatedBy = req.admin.email || "admin";

    await rate.save();
  }

  // 🔥 AUTO UPDATE USERS
  // Only update users whose priceRate == old global rate
  if (oldRateValue !== null) {
    await User.updateMany(
      { priceRate: oldRateValue }, // only users matching old rate
      { $set: { priceRate: dollarRate } },
    );
  }

  res.status(200).json({
    success: true,
    message: "Exchange rate updated successfully",
    data: {
      rate: rate.dollarRate,
      lastUpdated: rate.updatedAt,
    },
  });
});

// // @desc    Update exchange rate (admin only)
// // @access  Private (Admin)
// const updateRate = catchAsyncError(async (req, res, next) => {
//   const { dollarRate } = req.body;

//   if (!dollarRate || typeof dollarRate !== "number" || dollarRate <= 0) {
//     return next(new ErrorHandler("Valid dollar rate is required", 400));
//   }

//   let rate = await ExchangeRate.findOne().sort({ createdAt: -1 });

//   if (!rate) {
//     rate = new ExchangeRate({
//       dollarRate,
//       updatedBy: req.admin.email || "admin",
//     });
//   } else {
//     rate.dollarRate = dollarRate;
//     rate.updatedBy = req.admin.email || "admin";
//   }

//   await rate.save();

//   res.status(200).json({
//     success: true,
//     message: "Exchange rate updated successfully",
//     data: {
//       rate: rate.dollarRate,
//       lastUpdated: rate.updatedAt,
//     },
//   });
// });

// @desc    Fetch and update exchange rate from CoinGecko API
// @access  Private (Admin)
const updateRateFromCoinGecko = catchAsyncError(async (req, res, next) => {
  try {
    // Fetch USDT to INR rate from CoinGecko
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr";

    https
      .get(url, (apiRes) => {
        let data = "";

        apiRes.on("data", (chunk) => {
          data += chunk;
        });

        apiRes.on("end", async () => {
          try {
            const result = JSON.parse(data);
            const newRate = result.tether.inr;

            if (!newRate || typeof newRate !== "number") {
              return next(
                new ErrorHandler(
                  "Failed to fetch valid exchange rate from CoinGecko",
                  500,
                ),
              );
            }

            // Update the rate in database
            let rate = await ExchangeRate.findOne().sort({ createdAt: -1 });

            if (!rate) {
              rate = new ExchangeRate({
                dollarRate: newRate,
                updatedBy: req.admin.email || "CoinGecko API",
              });
            } else {
              rate.dollarRate = newRate;
              rate.updatedBy = req.admin.email || "CoinGecko API";
            }

            await rate.save();

            res.status(200).json({
              success: true,
              message: "Exchange rate updated successfully from CoinGecko",
              data: {
                rate: rate.dollarRate,
                lastUpdated: rate.updatedAt,
                source: "CoinGecko",
              },
            });
          } catch (error) {
            return next(
              new ErrorHandler(
                "Failed to parse exchange rate data: " + error.message,
                500,
              ),
            );
          }
        });
      })
      .on("error", (error) => {
        return next(
          new ErrorHandler(
            "Failed to fetch exchange rate from CoinGecko: " + error.message,
            500,
          ),
        );
      });
  } catch (error) {
    return next(
      new ErrorHandler(
        "Unexpected error while fetching exchange rate: " + error.message,
        500,
      ),
    );
  }
});

// @desc    Get user's exchange methods (bank accounts)
// @access  Private
const getExchangeMethods = catchAsyncError(async (req, res, next) => {
  const methods = await ExchangeMethod.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .select("-__v");

  res.status(200).json({
    success: true,
    data: {
      methods,
    },
  });
});

// @desc    Add new exchange method (bank account)
// @access  Private
const addExchangeMethod = catchAsyncError(async (req, res, next) => {
  const { bankName, accountNo, ifscCode, accountName } = req.body;

  // Validation
  if (!bankName || !accountNo || !ifscCode || !accountName) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // Basic validation
  if (accountNo.length < 5) {
    return next(new ErrorHandler("Account number is too short", 400));
  }

  if (ifscCode.length < 11) {
    return next(new ErrorHandler("IFSC code is too short", 400));
  }

  // Check if account already exists for this user
  const existingMethod = await ExchangeMethod.findOne({
    userId: req.user._id,
    accountNo,
  });

  if (existingMethod) {
    return next(new ErrorHandler("Bank account already exists", 400));
  }

  const method = new ExchangeMethod({
    userId: req.user._id,
    bankName: bankName.trim(),
    accountNo: accountNo.trim(),
    ifscCode: ifscCode.trim().toUpperCase(),
    accountName: accountName.trim(),
  });

  await method.save();

  res.status(201).json({
    success: true,
    message: "Bank account added successfully",
    data: {
      method,
    },
  });
});

// @desc    Delete exchange method (User-side)
// @access  Private
const deleteExchangeMethod = catchAsyncError(async (req, res, next) => {
  const method = await ExchangeMethod.findOne({
    _id: req.params.id,
    userId: req.user._id, // Make sure only the owner can delete
  });

  if (!method) {
    return next(new ErrorHandler("Bank account not found", 404));
  }

  // 🆕 Save record into DeletedMethod before deleting
  await DeletedMethod.create({
    originalMethodId: method._id,
    userId: method.userId,
    bankName: method.bankName,
    accountNo: method.accountNo,
    ifscCode: method.ifscCode,
    accountName: method.accountName,
  });

  // 🗑️ Now delete from active collection
  await ExchangeMethod.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Bank account deleted and archived successfully",
  });
});

// // @desc    Create new exchange (USDT to INR)
// // @access  Private
// const createExchange = catchAsyncError(async (req, res, next) => {
//   const { methodId, usdtAmount } = req.body;

//   // ✅ Validation
//   if (!methodId || !usdtAmount || usdtAmount <= 0) {
//     return next(
//       new ErrorHandler("Method ID and valid USDT amount are required", 400)
//     );
//   }

//   // ✅ Check if method exists and belongs to user
//   const method = await ExchangeMethod.findOne({
//     _id: methodId,
//     userId: req.user._id,
//   });

//   if (!method) {
//     return next(new ErrorHandler("Bank account not found", 404));
//   }

//   // ✅ Get current exchange rate
//   let rateDoc = await ExchangeRate.findOne().sort({ createdAt: -1 });
//   if (!rateDoc) {
//     return next(new ErrorHandler("Exchange rate not available", 500));
//   }

//   const rate = rateDoc.dollarRate;
//   const inrAmount = usdtAmount * rate;

//   // ✅ Fetch user and check balances
//   const user = await User.findById(req.user._id);

//   if (!user) {
//     return next(new ErrorHandler("User not found", 404));
//   }

//   // ✅ Check minimum limit condition
//   if (usdtAmount < user.limitBalance) {
//     return next(
//       new ErrorHandler(
//         `Exchange amount must be greater than or equal to your limit balance of ${user.limitBalance} USDT`,
//         400
//       )
//     );
//   }

//   // ✅ Check available USDT balance
//   if (user.availableBalance < usdtAmount) {
//     return next(new ErrorHandler("Insufficient USDT balance", 400));
//   }

//   // ✅ Deduct USDT balance
//   user.availableBalance -= usdtAmount;
//   await user.save();

//   // ✅ Create exchange record
//   const exchange = new Exchange({
//     userId: req.user._id,
//     methodId,
//     usdtAmount,
//     amount: inrAmount,
//     fee: 0,
//     status: "pending",
//   });

//   await exchange.save();

//   // ✅ Populate bank method details
//   await exchange.populate(
//     "methodId",
//     "bankName accountNo ifscCode accountName"
//   );

//   // ✅ Success response
//   res.status(201).json({
//     success: true,
//     message: "Exchange request created successfully",
//     data: {
//       exchange: {
//         id: exchange._id,
//         usdtAmount: exchange.usdtAmount,
//         inrAmount: exchange.amount,
//         rate: rate,
//         status: exchange.status,
//         method: exchange.methodId,
//         createdAt: exchange.createdAt,
//       },
//     },
//   });
// });

// @desc    Create new exchange (USDT → INR)
// @access  Private
const createExchange = catchAsyncError(async (req, res, next) => {
  const { methodId, usdtAmount } = req.body;

  // -----------------------------
  // 1. Validate Inputs
  // -----------------------------
  if (!methodId || !usdtAmount || usdtAmount <= 0) {
    return next(
      new ErrorHandler("Method ID and valid USDT amount are required", 400),
    );
  }

  // -----------------------------
  // 2. Validate Bank Method Owner
  // -----------------------------
  const method = await ExchangeMethod.findOne({
    _id: methodId,
    userId: req.user._id,
  });

  if (!method) {
    return next(new ErrorHandler("Bank account not found", 404));
  }

  // // -----------------------------
  // // 3. Get Latest Exchange Rate
  // // -----------------------------
  // const rateDoc = await ExchangeRate.findOne().sort({ createdAt: -1 });

  // if (!rateDoc) {
  //   return next(new ErrorHandler("Exchange rate not available", 500));
  // }

  // const rate = rateDoc.dollarRate;
  // const inrAmount = Number(usdtAmount) * Number(rate);

  // // -----------------------------
  // // 4. Fetch User
  // // -----------------------------
  // const user = await User.findById(req.user._id);
  // if (!user) return next(new ErrorHandler("User not found", 404));

  // -----------------------------
  // 3. Fetch User First
  // -----------------------------
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // -----------------------------
  // 4. Determine Rate (User Based)
  // -----------------------------

  // If user has custom priceRate use it
  // Otherwise fallback to global rate
  let rate;

  if (user.priceRate && user.priceRate > 0) {
    rate = user.priceRate;
  } else {
    const rateDoc = await ExchangeRate.findOne().sort({ createdAt: -1 });

    if (!rateDoc) {
      return next(new ErrorHandler("Exchange rate not available", 500));
    }

    rate = rateDoc.dollarRate;
  }

  const inrAmount = Number(usdtAmount) * Number(rate);

  // -----------------------------
  // 5. Min USDT Limit Check
  // -----------------------------
  if (usdtAmount < user.limitBalance) {
    return next(
      new ErrorHandler(
        `Exchange amount must be ≥ your limit balance (${user.limitBalance} USDT)`,
        400,
      ),
    );
  }

  // -----------------------------
  // 6. Verify User Balance
  // -----------------------------
  if (user.availableBalance < usdtAmount) {
    return next(new ErrorHandler("Insufficient USDT balance", 400));
  }

  // -----------------------------
  // 7. Deduct USDT Immediately
  // -----------------------------
  user.availableBalance -= usdtAmount;
  await user.save();

  // -----------------------------
  // 8. Create Exchange Record
  // -----------------------------
  const exchange = await Exchange.create({
    userId: user._id,
    methodId,
    usdtAmount,
    amount: inrAmount,
    fee: 0,
    status: "pending",
    utr: "", // admin will fill later
    remark: "",
    submittedAt: new Date(),
    completedAt: null,
  });

  await exchange.populate(
    "methodId",
    "bankName accountNo ifscCode accountName",
  );

  // -----------------------------
  // 9. Response for Mobile/Web UI
  // -----------------------------
  res.status(201).json({
    success: true,
    message: "Exchange request submitted successfully",
    data: {
      exchange: {
        id: exchange._id,
        usdtAmount: exchange.usdtAmount,
        inrAmount: exchange.amount,
        rate,
        status: exchange.status,
        method: exchange.methodId,
        submittedAt: exchange.submittedAt,
      },
    },
  });
});

// @desc    Get user's exchange history
// @access  Private
const getExchangeHistory = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;

  // Log for debugging
  console.log("Exchange history request for user:", req.user._id);
  console.log("Query parameters:", { page, limit, status });

  const query = { userId: req.user._id };
  if (status) {
    query.status = status;
  }

  console.log("Database query:", JSON.stringify(query));

  const exchanges = await Exchange.find(query)
    .populate("methodId", "bankName accountNo")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select("-__v");

  const total = await Exchange.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  console.log(`Found ${exchanges.length} exchanges out of ${total} total`);

  res.status(200).json({
    success: true,
    data: {
      exchanges,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
      },
    },
  });
});

// // @desc    Update exchange status (admin)
// // @access  Private (Admin)
// const updateExchangeStatus = catchAsyncError(async (req, res, next) => {
//   const { status } = req.body;
//   const validStatuses = ["pending", "completed", "failed"];

//   if (!validStatuses.includes(status)) {
//     return next(new ErrorHandler("Invalid status", 400));
//   }

//   const exchange = await Exchange.findById(req.params.id).populate(
//     "userId",
//     "phone balance"
//   );

//   if (!exchange) {
//     return next(new ErrorHandler("Exchange not found", 404));
//   }

//   const oldStatus = exchange.status;
//   exchange.status = status;

//   // In a real implementation, this is where you would process the actual
//   // bank transfer to send INR to the user's bank account
//   // For now, we're just updating the status

//   await exchange.save();

//   res.status(200).json({
//     success: true,
//     message: "Exchange status updated successfully",
//     data: {
//       exchange,
//       oldStatus,
//       newStatus: status,
//     },
//   });
// });

// @desc    Update exchange status (admin)
// @access  Private (Admin)
// const updateExchangeStatus = catchAsyncError(async (req, res, next) => {
//   const { status } = req.body;
//   const validStatuses = ["pending", "completed", "failed"];

//   if (!validStatuses.includes(status)) {
//     return next(new ErrorHandler("Invalid status", 400));
//   }

//   const exchange = await Exchange.findById(req.params.id).populate(
//     "userId",
//     "phone availableBalance totalBalance"
//   );

//   if (!exchange) {
//     return next(new ErrorHandler("Exchange not found", 404));
//   }

//   const oldStatus = exchange.status;
//   exchange.status = status;

//   let updatedUserBalance = null;

//   const user = await User.findById(exchange.userId._id);
//   if (!user) return next(new ErrorHandler("User not found", 404));

//   const deductedAmount = exchange.usdtAmount; // Crypto amount

//   // 🟢 If exchange is approved (completed) → deduct from total balance
//   if (status === "completed" && oldStatus !== "completed") {
//     if (user.totalBalance < deductedAmount) {
//       return next(
//         new ErrorHandler("Insufficient balance to process exchange", 400)
//       );
//     }

//     user.totalBalance -= deductedAmount;
//     await user.save();

//     updatedUserBalance = {
//       totalBalance: user.totalBalance,
//     };
//   }

//   // 🔴 If exchange is rejected → return amount to availableBalance
//   if (status === "failed" && oldStatus !== "failed") {
//     user.availableBalance += deductedAmount;
//     await user.save();

//     updatedUserBalance = {
//       availableBalance: user.availableBalance,
//     };
//   }

//   await exchange.save();

//   res.status(200).json({
//     success: true,
//     message: "Exchange status updated successfully",
//     data: {
//       exchange,
//       oldStatus,
//       newStatus: status,
//       ...(updatedUserBalance && { updatedUserBalance }),
//     },
//   });
// });

// @desc    Update exchange status + add UTR (admin)
// @access  Private (Admin)
const updateExchangeStatus = catchAsyncError(async (req, res, next) => {
  const { status, utr, remark } = req.body;

  const validStatuses = ["pending", "completed", "failed"];
  if (!validStatuses.includes(status)) {
    return next(new ErrorHandler("Invalid status", 400));
  }

  const exchange = await Exchange.findById(req.params.id).populate(
    "userId",
    "phone availableBalance totalBalance",
  );

  if (!exchange) {
    return next(new ErrorHandler("Exchange not found", 404));
  }

  const oldStatus = exchange.status;
  const user = await User.findById(exchange.userId._id);

  if (!user) return next(new ErrorHandler("User not found", 404));

  const deductedAmount = exchange.usdtAmount;

  let updatedUserBalance = null;

  // ------------------------------
  // 🟢 COMPLETED FLOW
  // ------------------------------
  if (status === "completed") {
    // Prevent double-complete deduction
    if (oldStatus !== "completed") {
      if (user.totalBalance < deductedAmount) {
        return next(
          new ErrorHandler("Insufficient balance to approve exchange", 400),
        );
      }

      // Deduct from totalBalance (already deducted from availableBalance earlier)
      user.totalBalance -= deductedAmount;
      await user.save();

      updatedUserBalance = { totalBalance: user.totalBalance };
    }

    // Set timestamps & UTR
    exchange.completedAt = new Date();
    exchange.utr = utr || "";
    exchange.remark = remark || "";
  }

  // ------------------------------
  // 🔴 FAILED FLOW
  // ------------------------------
  if (status === "failed") {
    // Only refund once
    if (oldStatus !== "failed") {
      user.availableBalance += deductedAmount;
      await user.save();

      updatedUserBalance = { availableBalance: user.availableBalance };
    }

    // Reset completed fields
    exchange.completedAt = null;
    exchange.utr = "";
    exchange.remark = remark || "";
  }

  // ------------------------------
  // COMMON FIELDS UPDATE
  // ------------------------------
  exchange.status = status;

  await exchange.save();

  return res.status(200).json({
    success: true,
    message: "Exchange status updated successfully",
    data: {
      exchange,
      oldStatus,
      newStatus: status,
      ...(updatedUserBalance && { updatedUserBalance }),
    },
  });
});

// // @desc    Get all exchanges (admin)
// // @access  Private (Admin)
// const getAllExchanges = catchAsyncError(async (req, res, next) => {
//   const { page = 1, limit = 20, status, userId } = req.query;

//   const query = {};
//   if (status) query.status = status;
//   if (userId) query.userId = userId;

//   const exchanges = await Exchange.find(query)
//     .populate("userId", "phone")
//     .populate("methodId", "bankName accountNo ifscCode")
//     .sort({ createdAt: -1 })
//     .limit(limit * 1)
//     .skip((page - 1) * limit)
//     .select("-__v");

//   const total = await Exchange.countDocuments(query);
//   const totalPages = Math.ceil(total / limit);

//   res.status(200).json({
//     success: true,
//     data: {
//       exchanges,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages,
//         totalRecords: total,
//       },
//     },
//   });
// });

// @desc    Get all exchanges (admin)
// @access  Private (Admin)
const getAllExchanges = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 20, status, userId } = req.query;

  const query = {};
  if (status) query.status = status;
  if (userId) query.userId = userId;

  // Fetch main exchange records
  let exchanges = await Exchange.find(query)
    .populate("userId", "phone")
    .populate("methodId", "bankName accountNo ifscCode accountName") // include accountName also
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select("-__v");

  // Process methodId fallback logic
  exchanges = await Promise.all(
    exchanges.map(async (exchange) => {
      // If method exists normally → return as is
      if (exchange.methodId) return exchange;

      // If method is deleted → search in DeletedMethod
      const deletedMethod = await DeletedMethod.findOne({
        originalMethodId: exchange.methodId,
      });

      if (deletedMethod) {
        exchange.methodId = {
          bankName: deletedMethod.bankName,
          accountNo: deletedMethod.accountNo,
          ifscCode: deletedMethod.ifscCode,
          accountName: deletedMethod.accountName,
          fromDeleted: true, // add indicator for frontend
        };
        return exchange;
      }

      // If still not found → manually set "Not Available"
      exchange.methodId = {
        bankName: "Not Available",
        accountNo: "Not Available",
        ifscCode: "Not Available",
        accountName: "Not Available",
        fromDeleted: false,
      };

      return exchange;
    }),
  );

  const total = await Exchange.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    data: {
      exchanges,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
      },
    },
  });
});

// @desc    Get user's current available balance
// @access  Private
const getCurrentBalance = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("availableBalance");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      balance: user.availableBalance || 0,
    },
  });
});

// @desc    Get full exchange details (for status page)
// @access  Private
const getExchangeDetails = catchAsyncError(async (req, res, next) => {
  const exchangeId = req.params.id;

  if (!exchangeId) {
    return next(new ErrorHandler("Exchange ID is required", 400));
  }

  // Fetch exchange with bank + user details
  const exchange = await Exchange.findOne({
    _id: exchangeId,
    userId: req.user._id,
  })
    .populate("methodId", "bankName accountNo ifscCode accountName")
    .populate("userId", "name email phone");

  if (!exchange) {
    return next(new ErrorHandler("Exchange order not found", 404));
  }

  return res.status(200).json({
    success: true,
    data: {
      id: exchange._id,
      usdtAmount: exchange.usdtAmount,
      inrAmount: exchange.amount,
      fee: exchange.fee || 0,
      status: exchange.status,
      utr: exchange.utr || null,
      remark: exchange.remark || "",
      submittedAt: exchange.submittedAt || exchange.createdAt,
      completedAt: exchange.completedAt || null,

      method: exchange.methodId,
      user: exchange.userId,
    },
  });
});

module.exports = {
  getCurrentRate,
  updateRate,
  updateRateFromCoinGecko,
  getExchangeMethods,
  addExchangeMethod,
  deleteExchangeMethod,
  createExchange,
  getExchangeHistory,
  updateExchangeStatus,
  getAllExchanges,
  getCurrentBalance,
  getExchangeDetails,
};
