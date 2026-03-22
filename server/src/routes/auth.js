const { Router } = require("express");
const { login, me } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = Router();

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me  (requires valid JWT)
router.get("/me", authenticate, me);

module.exports = router;
