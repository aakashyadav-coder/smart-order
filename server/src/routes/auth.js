const { Router } = require("express");
const { login, me, refresh, changeEmail } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = Router();

// POST /api/auth/login        — returns access token + refresh token
router.post("/login", login);

// GET  /api/auth/me           — returns fresh user data from DB
router.get("/me", authenticate, me);

// POST /api/auth/refresh      — exchange refresh token for new access token (Fix R4)
router.post("/refresh", refresh);

// PUT  /api/auth/change-email — requires currentPassword confirmation (Fix R6)
router.put("/change-email", authenticate, changeEmail);

module.exports = router;
