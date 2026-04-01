const { Router } = require("express");
const { login, me, refresh, changeEmail, totpVerify, forgotPassword, verifyResetOtp, resetPassword } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const router = Router();

// Rate limiter for password reset — 5 attempts per 15 minutes per IP
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many reset attempts. Please wait 15 minutes and try again." },
  skip: () => ["development", "test"].includes(process.env.NODE_ENV),
});

// POST /api/auth/login         — Step 1: password check; returns token OR { requireTotp, preAuthToken }
router.post("/login", login);

// POST /api/auth/totp-verify   — Step 2: validate 6-digit TOTP code; returns full JWT
router.post("/totp-verify", totpVerify);

// GET  /api/auth/me            — returns fresh user data from DB
router.get("/me", authenticate, me);

// POST /api/auth/refresh       — exchange refresh token for new access token
router.post("/refresh", refresh);

// PUT  /api/auth/change-email  — requires currentPassword confirmation
router.put("/change-email", authenticate, changeEmail);

// ── Forgot Password (3-step email OTP flow) ───────────────────────────────────
// POST /api/auth/forgot-password    — sends 6-digit OTP to email
router.post("/forgot-password", resetLimiter, forgotPassword);

// POST /api/auth/verify-reset-otp   — verifies OTP, returns short-lived reset token
router.post("/verify-reset-otp", resetLimiter, verifyResetOtp);

// POST /api/auth/reset-password     — sets new password using reset token
router.post("/reset-password", resetLimiter, resetPassword);

module.exports = router;
