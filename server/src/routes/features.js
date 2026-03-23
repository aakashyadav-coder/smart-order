const { Router } = require("express");
const { getFeatures, updateFeatures } = require("../controllers/featureController");
const { authenticate, requireSuperAdmin } = require("../middleware/auth");

const router = Router();

// GET /api/features/:restaurantId  (super admin only)
router.get("/:restaurantId", authenticate, requireSuperAdmin, getFeatures);

// PUT /api/features/:restaurantId  (super admin only)
router.put("/:restaurantId", authenticate, requireSuperAdmin, updateFeatures);

module.exports = router;
