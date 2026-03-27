const { Router } = require("express");
const {
  getStats, getAnalytics, getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant,
  getUsers, createUser, updateUser, deleteUser,
  getAllOrders, getActivityLogs,
} = require("../controllers/superAdminController");
const { authenticate, requireSuperAdmin } = require("../middleware/auth");

const router = Router();

// All super admin routes require JWT + SUPER_ADMIN role
router.use(authenticate, requireSuperAdmin);

// Stats
router.get("/stats", getStats);
router.get("/analytics", getAnalytics);

// Restaurants
router.get("/restaurants", getRestaurants);
router.post("/restaurants", createRestaurant);
router.put("/restaurants/:id", updateRestaurant);
router.delete("/restaurants/:id", deleteRestaurant);

// Users
router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Global orders
router.get("/orders", getAllOrders);

// Activity logs
router.get("/logs", getActivityLogs);

module.exports = router;
