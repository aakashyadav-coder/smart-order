const { Router } = require("express");
const {
  getStats, getAnalytics,
  getDashboardKPIs, getRevenueBI,
  getRestaurants, getRestaurantDetail, createRestaurant, updateRestaurant, deleteRestaurant, bulkUpdateRestaurants,
  getUsers, createUser, updateUser, deleteUser, bulkUpdateUsers,
  getAllOrders,
  getActivityLogs,
  getHealth,
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  getTickets, updateTicket, deleteTicket,
  getMaintenanceStatus, setMaintenanceMode,
  getOnboardingPipeline, nudgeRestaurants,
  purgeLogs, purgeOrders,
  getSuperProfile, updateSuperProfile, changePassword,
  initTotp, verifyTotp, disableTotp,
  globalSearch,
} = require("../controllers/superAdminController");
const { authenticate, requireSuperAdmin } = require("../middleware/auth");

const router = Router();

// All super admin routes require JWT + SUPER_ADMIN role
router.use(authenticate, requireSuperAdmin);

// Stats & Analytics
router.get("/stats", getStats);
router.get("/analytics", getAnalytics);
router.get("/dashboard-kpis", getDashboardKPIs);
router.get("/revenue-bi", getRevenueBI);

// Global Search
router.get("/search", globalSearch);

// Settings — profile & password
router.get("/settings/profile", getSuperProfile);
router.put("/settings/profile", updateSuperProfile);
router.post("/settings/password", changePassword);

// Settings — TOTP 2FA
router.get("/settings/totp/init", initTotp);       // generate QR + temp secret
router.post("/settings/totp/verify", verifyTotp);  // verify code + persist secret
router.delete("/settings/totp/disable", disableTotp); // disable 2FA (password-gated)

// System Health
router.get("/health", getHealth);

// Maintenance Mode
router.get("/maintenance", getMaintenanceStatus);
router.post("/maintenance", setMaintenanceMode);

// Onboarding Pipeline
router.get("/onboarding", getOnboardingPipeline);
router.post("/onboarding/nudge", nudgeRestaurants);

// Data Retention / Cleanup
router.delete("/logs/purge", purgeLogs);
router.delete("/orders/purge", purgeOrders);

// Restaurants
router.get("/restaurants", getRestaurants);
router.post("/restaurants", createRestaurant);
router.patch("/restaurants/bulk", bulkUpdateRestaurants);
router.get("/restaurants/:id", getRestaurantDetail);
router.put("/restaurants/:id", updateRestaurant);
router.delete("/restaurants/:id", deleteRestaurant);

// Users
router.get("/users", getUsers);
router.post("/users", createUser);
router.patch("/users/bulk", bulkUpdateUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Global orders
router.get("/orders", getAllOrders);

// Activity logs
router.get("/logs", getActivityLogs);

// Announcements
router.get("/announcements", getAnnouncements);
router.post("/announcements", createAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

// Support Tickets
router.get("/tickets", getTickets);
router.put("/tickets/:id", updateTicket);
router.delete("/tickets/:id", deleteTicket);

module.exports = router;
