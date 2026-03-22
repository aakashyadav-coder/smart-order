const { Router } = require("express");
const { sendOTP, verifyOTP } = require("../controllers/otpController");
const { authenticate } = require("../middleware/auth");

const router = Router();

// POST /api/otp/send  — kitchen sends OTP to customer (authenticated)
router.post("/send", authenticate, sendOTP);

// POST /api/otp/verify  — verify OTP (public)
router.post("/verify", verifyOTP);

module.exports = router;
