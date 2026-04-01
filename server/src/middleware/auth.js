/**
 * JWT authentication middleware — updated for 4-role hierarchy
 */
const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided. Please log in." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Reject non-access tokens (pre_auth, refresh, password_reset) used as Bearer
    if (decoded.type !== undefined) {
      return res.status(401).json({ message: "Invalid token type. Please log in again." });
    }
    req.user = decoded; // { id, email, role, restaurantId, name }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
};

// Require specific roles (any of provided)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// Super admin only
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Super Admin access required." });
  }
  next();
};

// Owner or above
const requireOwnerOrAbove = (req, res, next) => {
  const allowed = ["SUPER_ADMIN", "OWNER", "ADMIN"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ message: "Owner access required." });
  }
  next();
};

module.exports = { authenticate, requireRole, requireSuperAdmin, requireOwnerOrAbove };
