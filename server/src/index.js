/**
 * Smart Order — Express Server Entry Point
 * Sets up Express, Socket.io, and all routes
 */

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { initSocket } = require("./socket");

const authRoutes = require("./routes/auth");
const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/order");
const otpRoutes = require("./routes/otp");
const superAdminRoutes = require("./routes/superAdmin");
const featuresRoutes = require("./routes/features");
const restaurantRoutes = require("./routes/restaurant");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);

// ── CORS origins ───────────────────────────────────────────────────────────────
// Accept comma-separated origins from CLIENT_URL env var (e.g. "https://foo.vercel.app,http://localhost:5173")
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
    : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // In production allow all vercel.app and railway.app domains as fallback
    if (origin.endsWith(".vercel.app") || origin.endsWith(".railway.app")) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
});

// Attach io to app so controllers can emit events
app.set("io", io);

// Initialize socket event handlers
initSocket(io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight OPTIONS for all routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

const { getMaintenancePublic } = require("./controllers/superAdminController");

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/super", superAdminRoutes);
app.use("/api/features", featuresRoutes);
app.use("/api/restaurant", restaurantRoutes);

// Public maintenance status (no auth — customer pages poll this)
app.get("/api/maintenance", getMaintenancePublic);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`\n🚀 Smart Order server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌍 Allowing CORS from: ${process.env.CLIENT_URL || "http://localhost:5173"}\n`);
});
