/**
 * central.js — Routes for CENTRAL_ADMIN role
 * All require authentication + CENTRAL_ADMIN or SUPER_ADMIN role.
 */
const { Router } = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const {
  getBranches, createBranch, updateBranch, toggleBranch,
  getSummary, getAnalytics,
  getPeakHours, getBestSellers, getStaffPerformance,
  getOrders, getReportData, getAuditLog,
  getStaff, updateStaff, deleteStaff,
  updateProfile,
} = require("../controllers/centralAdminController");

const router = Router();

// All central admin routes require auth + CENTRAL_ADMIN or SUPER_ADMIN role
const guard = [authenticate, requireRole("CENTRAL_ADMIN", "SUPER_ADMIN")];

// ── Branches ──────────────────────────────────────────────────────────────────
router.get("/branches",              ...guard, getBranches);
router.post("/branches",             ...guard, createBranch);
router.put("/branches/:id",          ...guard, updateBranch);
router.patch("/branches/:id/toggle", ...guard, toggleBranch);

// ── Summary & Core Analytics ─────────────────────────────────────────────────
router.get("/summary",   ...guard, getSummary);
router.get("/analytics", ...guard, getAnalytics);

// ── Advanced Analytics ────────────────────────────────────────────────────────
router.get("/analytics/peak-hours",      ...guard, getPeakHours);
router.get("/analytics/best-sellers",    ...guard, getBestSellers);
router.get("/analytics/staff-performance", ...guard, getStaffPerformance);

// ── Orders & Reports ──────────────────────────────────────────────────────────
router.get("/orders",  ...guard, getOrders);
router.get("/reports", ...guard, getReportData);

// ── Audit Log ─────────────────────────────────────────────────────────────────
router.get("/audit-log", ...guard, getAuditLog);

// ── Staff ─────────────────────────────────────────────────────────────────────
router.get("/staff",        ...guard, getStaff);
router.put("/staff/:id",    ...guard, updateStaff);
router.delete("/staff/:id", ...guard, deleteStaff);

// ── Profile ───────────────────────────────────────────────────────────────────
router.patch("/profile", ...guard, updateProfile);

module.exports = router;
