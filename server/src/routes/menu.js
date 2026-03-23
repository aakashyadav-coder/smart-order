const { Router } = require("express");
const { getMenu, createMenuItem, updateMenuItem, deleteMenuItem } = require("../controllers/menuController");
const { authenticate, requireOwnerOrAbove } = require("../middleware/auth");

const router = Router();

// Public — GET /api/menu?restaurantId=xxx
router.get("/", getMenu);

// Owner+ only — menu management
router.post("/",      authenticate, requireOwnerOrAbove, createMenuItem);
router.put("/:id",    authenticate, requireOwnerOrAbove, updateMenuItem);
router.delete("/:id", authenticate, requireOwnerOrAbove, deleteMenuItem);

module.exports = router;
