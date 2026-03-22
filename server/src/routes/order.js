const { Router } = require("express");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");
const { authenticate } = require("../middleware/auth");

const router = Router();

// POST /api/orders  — place an order (public)
router.post("/", createOrder);

// GET /api/orders   — list all orders for kitchen (authenticated)
router.get("/", authenticate, getOrders);

// GET /api/orders/:id  — get single order (public — for customer tracking)
router.get("/:id", getOrderById);

// PUT /api/orders/:id/status  — update status (kitchen/admin only)
router.put("/:id/status", authenticate, updateOrderStatus);

module.exports = router;
