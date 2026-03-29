const { Router } = require("express");
const { sendOTP, verifyOTP } = require("../controllers/otpController");
const { authenticate } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const router = Router();

// 5 OTP actions per IP per 10 minutes — prevents brute-force code guessing
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP attempts. Please wait 10 minutes and try again." },
});

// POST /api/otp/send  — kitchen sends OTP to customer (authenticated)
router.post("/send", authenticate, otpLimiter, sendOTP);

// POST /api/otp/verify  — verify OTP (public, rate-limited)
router.post("/verify", otpLimiter, verifyOTP);

module.exports = router;

