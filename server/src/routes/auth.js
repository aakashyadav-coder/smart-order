const { Router } = require("express");
const { login, me, refresh, changeEmail, totpVerify } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = Router();

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

module.exports = router;
