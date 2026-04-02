/**
 * central.js — Routes for CENTRAL_ADMIN role
 * All require authentication + CENTRAL_ADMIN or SUPER_ADMIN role.
 */
const { Router } = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const {
  getBranches,
  getSummary,
  getAnalytics,
  getOrders,
  getStaff,
  updateStaff,
  deleteStaff,
} = require("../controllers/centralAdminController");

const router = Router();

// All central admin routes require auth + CENTRAL_ADMIN or SUPER_ADMIN role
const guard = [authenticate, requireRole("CENTRAL_ADMIN", "SUPER_ADMIN")];

router.get("/branches",  ...guard, getBranches);
router.get("/summary",   ...guard, getSummary);
router.get("/analytics", ...guard, getAnalytics);
router.get("/orders",    ...guard, getOrders);
router.get("/staff",     ...guard, getStaff);
router.put("/staff/:id", ...guard, updateStaff);
router.delete("/staff/:id", ...guard, deleteStaff);

module.exports = router;
