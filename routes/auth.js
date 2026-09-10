const express = require("express");
const {
  login,
  verifyOtp,
  logout,
  updateTransactionPassword,
  getWhatsAppNumber,
  updateWhatsAppConfig,
  sendTransactionPasswordResetOtp,
  verifyTransactionPasswordResetOtp,
} = require("../controllers/authController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Send phone number for OTP verification
// @access  Public
router.post("/send-otp", login);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login/register user
// @access  Public
router.post("/verify-otp", verifyOtp);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", logout);

// @route   POST /api/auth/send-tp-reset-otp
// @desc    Send OTP for transaction password reset
// @access  Private
router.post(
  "/send-tp-reset-otp",
  authenticateUser,
  sendTransactionPasswordResetOtp
);

// @route   POST /api/auth/verify-tp-reset
// @desc    Verify OTP and reset transaction password
// @access  Private
router.post(
  "/verify-tp-reset",
  authenticateUser,
  verifyTransactionPasswordResetOtp
);

// @route   PUT /api/auth/transaction-password
// @desc    Update transaction password
// @access  Private
router.put(
  "/transaction-password",
  authenticateUser,
  updateTransactionPassword
);

router.get("/get-whatsapp", getWhatsAppNumber);
module.exports = router;
