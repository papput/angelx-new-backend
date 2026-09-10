// const User = require("../models/User");
// const OtpSession = require("../models/OtpSession");
// const WhatsAppConfig = require("../models/WhatsAppConfig");
// const { maskPhone } = require("../middleware/auth");
// const catchAsyncError = require("../utils/catchAsyncError");
// const sendToken = require("../utils/sendToken");
// const { ErrorHandler } = require("../utils/ErrorHandler");
// const { sendOtp } = require("../utils/otpVerification");
// const {
//   saveOTPSession,
//   verifyOTPSession,
//   deleteOTPSession,
//   generateSecureOTP,
// } = require("../utils/otpUtils");
// const Admin = require("../models/Admin");
// const logUserActivity = require("../utils/logUserActivity"); // 👈 Added Tracking

// // @desc    Send phone number for OTP verification
// // @access  Public
// const login = catchAsyncError(async (req, res, next) => {
//   const { phone } = req.body;

//   const cleanPhone = phone.trim();

//   // Validate phone number
//   if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
//     return next(
//       new ErrorHandler("Please enter a valid 10-digit phone number.", 400)
//     );
//   }
//   const apiKey = process.env.OTP_API_KEY;

//   const otp = generateSecureOTP();
//   // Send OTP via 2Factor API (let 2Factor generate the OTP)

//   // Check if API key is configured
//   if (!apiKey) {
//     console.error("OTP_API_KEY is not configured in environment variables");
//     return next(
//       new ErrorHandler(
//         "OTP service is not properly configured. Please contact administrator.",
//         500
//       )
//     );
//   }

//   try {
//     const result = await sendOtp(apiKey, cleanPhone, otp);
//     console.log(" API Response:", result); // Log for debugging

//     if (result.data.status == 1) {
//       await saveOTPSession(cleanPhone, otp);

//       await logUserActivity(
//         cleanPhone,
//         "login_request",
//         `OTP sent to ${cleanPhone}`,
//         "login"
//       );

//       res.status(200).json({
//         success: true,
//         message: "OTP sent successfully",
//         data: {
//           phone: cleanPhone,
//           maskedPhone: maskPhone(cleanPhone),
//         },
//       });
//     } else {
//       await logUserActivity(
//         cleanPhone,
//         "login_failed",
//         "OTP service error",
//         "login"
//       );

//       console.error(" API Error:");
//       return next(new ErrorHandler("Failed to send OTP:", 500));
//     }
//   } catch (error) {
//     await logUserActivity(
//       9999999999,
//       "login_failed",
//       `OTP send error: ${error.message}`,
//       "login"
//     );

//     console.error("Failed to send OTP:", error);
//     return next(new ErrorHandler("Failed to send OTP: " + error.message, 500));
//   }
// });

// // @desc    Verify OTP and login/register user
// // @access  Public
// const verifyOtpController = catchAsyncError(async (req, res, next) => {
//   const { phone, otp } = req.body;

//   const cleanPhone = phone.trim();

//   // Validate inputs
//   if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
//     return next(
//       new ErrorHandler("Please enter a valid 10-digit phone number.", 400)
//     );
//   }

//   if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
//     return next(new ErrorHandler("Please enter a valid 6-digit OTP.", 400));
//   }

//   // Verify OTP session from database
//   const sessionVerification = await verifyOTPSession(cleanPhone);
//   if (!sessionVerification.valid) {
//     await logUserActivity(
//       cleanPhone,
//       "login_failed",
//       "OTP session invalid",
//       "login"
//     );

//     return next(new ErrorHandler(sessionVerification.message, 400));
//   }

//   // Check if OTP matches (only if stored in database)
//   if (
//     sessionVerification.session.otp &&
//     sessionVerification.session.otp !== otp
//   ) {
//     await logUserActivity(
//       cleanPhone,
//       "login_failed",
//       `Incorrect OTP of ${cleanPhone}`,
//       "login"
//     );

//     return next(new ErrorHandler("Invalid OTP. Please try again.", 400));
//   }

//   try {
//     // Clean up session data
//     await deleteOTPSession(cleanPhone);

//     let user = await User.findOne({ phone: cleanPhone });

//     if (!user) {
//       // Create new user if doesn't exist
//       user = new User({
//         phone: cleanPhone,
//         totalBalance: 0,
//         availableBalance: 0,
//         limitBalance: 0,
//       });
//       await logUserActivity(
//         phone,
//         "register",
//         `New user registered with ${phone}`,
//         "login"
//       );

//       await user.save();
//     }
//     await logUserActivity(
//       phone,
//       "login_success",
//       `User logged in successfully (${phone})`,
//       "login"
//     );

//     // Send token using sendToken utility
//     sendToken(user, 200, res);
//   } catch (error) {
//     console.error("Failed to verify OTP:", error);
//     // Clean up session data even on error
//     await deleteOTPSession(cleanPhone);
//     return next(
//       new ErrorHandler("Failed to verify OTP: " + error.message, 500)
//     );
//   }
// });

// // @desc    Logout user
// // @access  Private
// const logout = catchAsyncError(async (req, res, next) => {
//   res.cookie("token", null, {
//     expires: new Date(Date.now()),
//     httpOnly: true,
//   });

//   // Log the logout activity
//   await logUserActivity(
//     req.user?.phone ? ` (Mobile: ${req.user.phone})` : "",
//     "logout",
//     `User logged out successfully${
//       req.user?.phone ? ` (Mobile: ${req.user.phone})` : ""
//     }`,
//     "login"
//   );

//   res.status(200).json({
//     success: true,
//     message: "Logged out successfully",
//   });
// });

// // @desc    Send OTP for resetting transaction password
// // @access  Private
// const sendTransactionPasswordResetOtp = catchAsyncError(
//   async (req, res, next) => {
//     const user = await User.findById(req.user._id);

//     if (!user) {
//       return next(new ErrorHandler("User not found", 404));
//     }

//     const cleanPhone = user.phone.trim();
//     const apiKey = process.env.OTP_API_KEY;
//     const otp = generateSecureOTP();

//     if (!apiKey) {
//       return next(new ErrorHandler("OTP service is not configured", 500));
//     }

//     try {
//       const result = await sendOtp(apiKey, cleanPhone, otp);
//       console.log("Transaction Password Reset OTP Response:", result.data);

//       if (result.data.status == 1) {
//         await saveOTPSession(cleanPhone, otp);

//         return res.status(200).json({
//           success: true,
//           message: "OTP sent successfully to your registered number",
//           data: {
//             phone: cleanPhone,
//             maskedPhone: maskPhone(cleanPhone),
//           },
//         });
//       } else {
//         return next(
//           new ErrorHandler("Failed to send OTP. Please try again.", 500)
//         );
//       }
//     } catch (error) {
//       console.error("OTP sending failed:", error);
//       return next(
//         new ErrorHandler("Failed to send OTP: " + error.message, 500)
//       );
//     }
//   }
// );

// // @desc    Verify OTP and reset transaction password
// // @access  Private
// const verifyTransactionPasswordResetOtp = catchAsyncError(
//   async (req, res, next) => {
//     const { otp, transactionPassword } = req.body;

//     if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
//       return next(new ErrorHandler("Please enter a valid 6-digit OTP.", 400));
//     }

//     if (
//       !transactionPassword ||
//       transactionPassword.length !== 6 ||
//       !/^\d{6}$/.test(transactionPassword)
//     ) {
//       return next(
//         new ErrorHandler("Transaction password must be 6 digits.", 400)
//       );
//     }

//     const user = await User.findById(req.user._id);

//     if (!user) {
//       return next(new ErrorHandler("User not found", 404));
//     }

//     const cleanPhone = user.phone.trim();

//     // ✅ Verify OTP Session
//     const sessionVerification = await verifyOTPSession(cleanPhone);
//     if (!sessionVerification.valid) {
//       return next(new ErrorHandler(sessionVerification.message, 400));
//     }

//     // ✅ Check OTP Match
//     if (sessionVerification.session.otp !== otp) {
//       return next(new ErrorHandler("Invalid OTP. Please try again.", 400));
//     }

//     // ✅ All good — reset transaction password
//     user.transactionPassword = transactionPassword;
//     await user.save();

//     // ✅ Clean OTP session
//     await deleteOTPSession(cleanPhone);

//     res.status(200).json({
//       success: true,
//       message: "Transaction password updated successfully",
//     });
//   }
// );

// // @desc    Update transaction password
// // @access  Private
// const updateTransactionPassword = catchAsyncError(async (req, res, next) => {
//   const { transactionPassword } = req.body;

//   // Validate transaction password
//   if (
//     !transactionPassword ||
//     transactionPassword.length !== 6 ||
//     !/^\d{6}$/.test(transactionPassword)
//   ) {
//     return next(
//       new ErrorHandler("Transaction password must be exactly 6 digits", 400)
//     );
//   }

//   // Update user's transaction password
//   const user = await User.findById(req.user._id);

//   if (!user) {
//     return next(new ErrorHandler("User not found", 404));
//   }

//   user.transactionPassword = transactionPassword;
//   await user.save();

//   res.status(200).json({
//     success: true,
//     message: "Transaction password updated successfully",
//   });
// });

// const getWhatsAppNumber = async (req, res) => {
//   try {
//     let config = await WhatsAppConfig.findOne();

//     // If not found → create default
//     if (!config) {
//       config = await WhatsAppConfig.create({});
//     }

//     res.json({
//       success: true,
//       data: config,
//     });
//   } catch (err) {
//     console.error("WhatsApp Config Fetch Error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// const updateWhatsAppConfig = async (req, res) => {
//   try {
//     const { phoneNumber, defaultMessage } = req.body;

//     let config = await WhatsAppConfig.findOne();

//     if (!config) {
//       config = await WhatsAppConfig.create({ phoneNumber, defaultMessage });
//     } else {
//       config.phoneNumber = phoneNumber;
//       config.defaultMessage = defaultMessage;
//       await config.save();
//     }

//     res.json({
//       success: true,
//       message: "WhatsApp settings updated successfully",
//       data: config,
//     });
//   } catch (err) {
//     console.error("WhatsApp Update Error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// module.exports = {
//   login,
//   verifyOtp: verifyOtpController,
//   logout,
//   updateTransactionPassword,
//   verifyTransactionPasswordResetOtp,
//   sendTransactionPasswordResetOtp,
//   getWhatsAppNumber,
//   updateWhatsAppConfig,
// };

const User = require("../models/User");
const OtpSession = require("../models/OtpSession");
const WhatsAppConfig = require("../models/WhatsAppConfig");
const { maskPhone } = require("../middleware/auth");
const catchAsyncError = require("../utils/catchAsyncError");
const sendToken = require("../utils/sendToken");
const { ErrorHandler } = require("../utils/ErrorHandler");
const { sendOtp } = require("../utils/otpVerification");
const ExchangeRate = require("../models/ExchangeRate");

const {
  saveOTPSession,
  verifyOTPSession,
  deleteOTPSession,
  generateSecureOTP,
} = require("../utils/otpUtils");
const Admin = require("../models/Admin");

/* ---------------------------------------------------------
   ONLY CHANGE DONE HERE — Updated import for user activity
---------------------------------------------------------*/
const logUserActivity = require("../utils/logUserActivity");

// @desc    Send phone number for OTP verification
// @access  Public
const login = catchAsyncError(async (req, res, next) => {
  const { phone } = req.body;

  const cleanPhone = phone.trim();

  // Validate phone number
  if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
    return next(
      new ErrorHandler("Please enter a valid 10-digit phone number.", 400),
    );
  }
  const apiKey = process.env.OTP_API_KEY;

  const otp = generateSecureOTP();

  if (!apiKey) {
    console.error("OTP_API_KEY is not configured in environment variables");
    return next(
      new ErrorHandler(
        "OTP service is not properly configured. Please contact administrator.",
        500,
      ),
    );
  }

  try {
    const result = await sendOtp(apiKey, cleanPhone, otp);
    console.log(" API Response:", result);

    if (result.data.status == 1) {
      await saveOTPSession(cleanPhone, otp);

      /* Updated — pass req instead of cleanPhone */
      await logUserActivity(
        req,
        "login_request",
        `OTP sent to ${cleanPhone}`,
        "login",
      );

      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        data: {
          phone: cleanPhone,
          maskedPhone: maskPhone(cleanPhone),
        },
      });
    } else {
      await logUserActivity(req, "login_failed", "OTP service error", "login");

      console.error(" API Error:");
      return next(new ErrorHandler("Failed to send OTP:", 500));
    }
  } catch (error) {
    await logUserActivity(
      req,
      "login_failed",
      `OTP send error: ${error.message}`,
      "login",
    );

    console.error("Failed to send OTP:", error);
    return next(new ErrorHandler("Failed to send OTP: " + error.message, 500));
  }
});

// @desc    Verify OTP and login/register user
// @access  Public
const verifyOtpController = catchAsyncError(async (req, res, next) => {
  const { phone, otp } = req.body;

  const cleanPhone = phone.trim();

  if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
    return next(
      new ErrorHandler("Please enter a valid 10-digit phone number.", 400),
    );
  }

  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    return next(new ErrorHandler("Please enter a valid 6-digit OTP.", 400));
  }

  const sessionVerification = await verifyOTPSession(cleanPhone);
  if (!sessionVerification.valid) {
    await logUserActivity(req, "login_failed", "OTP session invalid", "login");

    return next(new ErrorHandler(sessionVerification.message, 400));
  }

  if (
    sessionVerification.session.otp &&
    sessionVerification.session.otp !== otp
  ) {
    await logUserActivity(
      req,
      "login_failed",
      `Incorrect OTP of ${cleanPhone}`,
      "login",
    );

    return next(new ErrorHandler("Invalid OTP. Please try again.", 400));
  }

  try {
    await deleteOTPSession(cleanPhone);

    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      let currentRate = await ExchangeRate.findOne().sort({ createdAt: -1 });

      user = new User({
        phone: cleanPhone,
        totalBalance: 0,
        availableBalance: 0,
        limitBalance: 0,
        level: "Base",
        price: currentRate.dollarRate,
      });

      await logUserActivity(
        req,
        "register",
        `New user registered with ${phone}`,
        "login",
      );

      await user.save();
    }

    await logUserActivity(
      req,
      "login_success",
      `User logged in successfully (${phone})`,
      "login",
    );

    sendToken(user, 200, res);
  } catch (error) {
    console.error("Failed to verify OTP:", error);
    await deleteOTPSession(cleanPhone);
    return next(
      new ErrorHandler("Failed to verify OTP: " + error.message, 500),
    );
  }
});

// @desc    Logout user
// @access  Private
const logout = catchAsyncError(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  await logUserActivity(
    req,
    "logout",
    `User logged out successfully ${
      req.user?.phone ? `(${req.user.phone})` : ""
    }`,
    "login",
  );

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// @desc    Send OTP for resetting transaction password
// @access  Private
const sendTransactionPasswordResetOtp = catchAsyncError(
  async (req, res, next) => {
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const cleanPhone = user.phone.trim();
    const apiKey = process.env.OTP_API_KEY;
    const otp = generateSecureOTP();

    if (!apiKey) {
      return next(new ErrorHandler("OTP service is not configured", 500));
    }

    try {
      const result = await sendOtp(apiKey, cleanPhone, otp);
      console.log("Transaction Password Reset OTP Response:", result.data);

      if (result.data.status == 1) {
        await saveOTPSession(cleanPhone, otp);

        return res.status(200).json({
          success: true,
          message: "OTP sent successfully to your registered number",
          data: {
            phone: cleanPhone,
            maskedPhone: maskPhone(cleanPhone),
          },
        });
      } else {
        return next(
          new ErrorHandler("Failed to send OTP. Please try again.", 500),
        );
      }
    } catch (error) {
      console.error("OTP sending failed:", error);
      return next(
        new ErrorHandler("Failed to send OTP: " + error.message, 500),
      );
    }
  },
);

// @desc    Verify OTP and reset transaction password
// @access  Private
const verifyTransactionPasswordResetOtp = catchAsyncError(
  async (req, res, next) => {
    const { otp, transactionPassword } = req.body;

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return next(new ErrorHandler("Please enter a valid 6-digit OTP.", 400));
    }

    if (
      !transactionPassword ||
      transactionPassword.length !== 6 ||
      !/^\d{6}$/.test(transactionPassword)
    ) {
      return next(
        new ErrorHandler("Transaction password must be 6 digits.", 400),
      );
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const cleanPhone = user.phone.trim();

    const sessionVerification = await verifyOTPSession(cleanPhone);
    if (!sessionVerification.valid) {
      return next(new ErrorHandler(sessionVerification.message, 400));
    }

    if (sessionVerification.session.otp !== otp) {
      return next(new ErrorHandler("Invalid OTP. Please try again.", 400));
    }

    user.transactionPassword = transactionPassword;
    await user.save();

    await deleteOTPSession(cleanPhone);

    res.status(200).json({
      success: true,
      message: "Transaction password updated successfully",
    });
  },
);

// @desc    Update transaction password
// @access  Private
const updateTransactionPassword = catchAsyncError(async (req, res, next) => {
  const { transactionPassword } = req.body;

  if (
    !transactionPassword ||
    transactionPassword.length !== 6 ||
    !/^\d{6}$/.test(transactionPassword)
  ) {
    return next(
      new ErrorHandler("Transaction password must be exactly 6 digits", 400),
    );
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  user.transactionPassword = transactionPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Transaction password updated successfully",
  });
});

const getWhatsAppNumber = async (req, res) => {
  try {
    // Avoid long mongoose buffering timeouts when DB is disconnected
    if (require("mongoose").connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database unavailable. Please try again shortly.",
        data: {
          phoneNumber: "",
          defaultMessage: "",
        },
      });
    }

    let config = await WhatsAppConfig.findOne().maxTimeMS(5000);

    if (!config) {
      config = await WhatsAppConfig.create({});
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (err) {
    console.error("WhatsApp Config Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      data: {
        phoneNumber: "",
        defaultMessage: "",
      },
    });
  }
};

const updateWhatsAppConfig = async (req, res) => {
  try {
    const { phoneNumber, defaultMessage } = req.body;

    let config = await WhatsAppConfig.findOne();

    if (!config) {
      config = await WhatsAppConfig.create({ phoneNumber, defaultMessage });
    } else {
      config.phoneNumber = phoneNumber;
      config.defaultMessage = defaultMessage;
      await config.save();
    }

    res.json({
      success: true,
      message: "WhatsApp settings updated successfully",
      data: config,
    });
  } catch (err) {
    console.error("WhatsApp Update Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  login,
  verifyOtp: verifyOtpController,
  logout,
  updateTransactionPassword,
  verifyTransactionPasswordResetOtp,
  sendTransactionPasswordResetOtp,
  getWhatsAppNumber,
  updateWhatsAppConfig,
};
