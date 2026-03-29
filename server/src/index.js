/**
 * Smart Order — Express Server Entry Point
 * Sets up Express, Socket.io, and all routes
 */

// Load .env FIRST — before any env var checks
require("dotenv").config();

// ── Startup environment check ─────────────────────────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌  Missing required environment variables: ${missing.join(", ")}`);
  console.error("    Set them in your .env file and restart the server.\n");
  process.exit(1);
}

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const { initSocket } = require("./socket");
const logger = require("./logger");

const authRoutes       = require("./routes/auth");
const menuRoutes       = require("./routes/menu");
const orderRoutes      = require("./routes/order");
const otpRoutes        = require("./routes/otp");
const superAdminRoutes = require("./routes/superAdmin");
const featuresRoutes   = require("./routes/features");
const restaurantRoutes = require("./routes/restaurant");
const { errorHandler } = require("./middleware/errorHandler");

const app    = express();
const server = http.createServer(app);

// ── HTTPS redirect (Fix R10) ───────────────────────────────────────────────────
// In production, redirect all plain-HTTP requests to HTTPS.
// Also sets HSTS via helmet (see below). Works on Railway, Render, etc.
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"];
    if (proto && proto !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ── CORS origins ─────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
    : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    if (origin.endsWith(".vercel.app") || origin.endsWith(".railway.app")) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, { cors: corsOptions });
app.set("io", io);
initSocket(io);

// ── Security Middleware ────────────────────────────────────────────────────────
// Helmet sets safe HTTP headers. HSTS is enabled in production for HTTPS enforcement.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === "production"
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  skip: () => process.env.NODE_ENV === "development",
});

const orderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
  skip: () => process.env.NODE_ENV === "development",
});

// ── Request Logger (Fix R11) ───────────────────────────────────────────────────
// Logs every request with method, path, status, and response time via Winston.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms  = Date.now() - start;
    const lvl = res.statusCode >= 500 ? "error"
              : res.statusCode >= 400 ? "warn"
              : "http";
    logger.log(lvl, `${req.method} ${req.path}`, {
      status: res.statusCode,
      ms,
      ip: req.ip,
    });
  });
  next();
});

const { getMaintenancePublic } = require("./controllers/superAdminController");

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",       authLimiter, authRoutes);
app.use("/api/menu",       menuRoutes);
app.use("/api/orders",     orderRoutes);
app.use("/api/otp",        otpRoutes);
app.use("/api/super",      superAdminRoutes);
app.use("/api/features",   featuresRoutes);
app.use("/api/restaurant", restaurantRoutes);

// Apply order limiter only to POST (new order creation)
app.use("/api/orders", (req, res, next) => {
  if (req.method === "POST") return orderLimiter(req, res, next);
  next();
});

// Public maintenance status
app.get("/api/maintenance", getMaintenancePublic);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler — logs stack trace via Winston
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`, { stack: err.stack });
  errorHandler(err, req, res, next);
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  logger.info(`🚀 Smart Order server running on http://localhost:${PORT}`);
  logger.info(`📡 Socket.io ready`);
  logger.info(`🛡️  Helmet + HSTS enabled (prod: ${process.env.NODE_ENV === "production"})`);
  logger.info(`⚡ Rate limiting active — auth: 20/15m, orders: 15/1m`);
  logger.info(`🌍 CORS origin: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
});
