/**
 * Super Admin Controller — full platform management
 * All routes require SUPER_ADMIN role
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { logActivity } = require("../services/activityLogService");
const { emitRestaurantUpdate } = require("../socket");

const prisma = new PrismaClient();

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const RANGE_PRESETS = {
  "24h": { type: "hour", count: 24 },
  "30d": { type: "day", count: 30 },
  "6m":  { type: "month", count: 6 },
};

function getRangeBuckets(range) {
  const preset = RANGE_PRESETS[range] || RANGE_PRESETS["24h"];
  const now = new Date();
  let start;
  let labels = [];
  let bucketMs = 0;

  if (preset.type === "hour") {
    const aligned = new Date(now);
    aligned.setMinutes(0, 0, 0);
    bucketMs = 60 * 60 * 1000;
    start = new Date(aligned.getTime() - (preset.count - 1) * bucketMs);
    labels = Array.from({ length: preset.count }, (_, i) => {
      const d = new Date(start.getTime() + i * bucketMs);
      const h = String(d.getHours()).padStart(2, "0");
      return `${h}:00`;
    });
  }

  if (preset.type === "day") {
    const aligned = new Date(now);
    aligned.setHours(0, 0, 0, 0);
    bucketMs = 24 * 60 * 60 * 1000;
    start = new Date(aligned.getTime() - (preset.count - 1) * bucketMs);
    labels = Array.from({ length: preset.count }, (_, i) => {
      const d = new Date(start.getTime() + i * bucketMs);
      return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
    });
  }

  if (preset.type === "month") {
    const startMonth = new Date(now.getFullYear(), now.getMonth() - (preset.count - 1), 1);
    start = startMonth;
    labels = Array.from({ length: preset.count }, (_, i) => {
      const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      return `${MONTHS_SHORT[d.getMonth()]}`;
    });
  }

  return { preset, start, end: now, labels, bucketMs };
}

function roundMoney(value) {
  return Math.round((value || 0) * 100) / 100;
}

function getBucketIndex(date, start, preset, bucketMs) {
  if (preset.type === "hour" || preset.type === "day") {
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / bucketMs);
  }
  const monthDiff = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
  return monthDiff;
}

// ── Global Stats ──────────────────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const [
      totalRestaurants,
      activeRestaurants,
      totalUsers,
      totalOrders,
      revenueResult,
      recentOrders,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { active: true } }),
      prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalPrice: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { restaurant: { select: { name: true } } },
      }),
    ]);

    res.json({
      totalRestaurants,
      activeRestaurants,
      totalUsers,
      totalOrders,
      totalRevenue: revenueResult._sum.totalPrice || 0,
      recentOrders,
    });
  } catch (err) { next(err); }
};


// -- Super Analytics (top 3 restaurants) ---------------------------------------
const getAnalytics = async (req, res, next) => {
  try {
    const range = String(req.query.range || "24h").toLowerCase();
    const { preset, start, end, labels, bucketMs } = getRangeBuckets(range);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        totalPrice: true,
        createdAt: true,
        phone: true,
        restaurantId: true,
        restaurant: { select: { name: true } },
      },
    });

    const bucketCount = labels.length;
    const map = new Map();

    for (const order of orders) {
      const idx = getBucketIndex(order.createdAt, start, preset, bucketMs);
      if (idx < 0 || idx >= bucketCount) continue;

      if (!map.has(order.restaurantId)) {
        map.set(order.restaurantId, {
          id: order.restaurantId,
          name: order.restaurant?.name || "Unknown",
          revenue: Array(bucketCount).fill(0),
          customerBuckets: Array.from({ length: bucketCount }, () => new Set()),
          customerAll: new Set(),
          totalRevenue: 0,
        });
      }
      const entry = map.get(order.restaurantId);
      entry.revenue[idx] += order.totalPrice || 0;
      entry.totalRevenue += order.totalPrice || 0;
      if (order.phone) {
        entry.customerBuckets[idx].add(order.phone);
        entry.customerAll.add(order.phone);
      }
    }

    const restaurants = Array.from(map.values()).map(r => ({
      id: r.id,
      name: r.name,
      series: {
        revenue: r.revenue.map(v => roundMoney(v)),
        customers: r.customerBuckets.map(s => s.size),
      },
      totals: {
        revenue: roundMoney(r.totalRevenue),
        customers: r.customerAll.size,
      },
    }));

    restaurants.sort((a, b) => (b.totals.revenue - a.totals.revenue) || (b.totals.customers - a.totals.customers));

    res.json({
      range,
      labels,
      restaurants: restaurants.slice(0, 3),
    });
  } catch (err) { next(err); }
};
// ── Restaurant CRUD ────────────────────────────────────────────────────────────
const getRestaurants = async (req, res, next) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        _count: { select: { users: true, orders: true, menuItems: true } },
        features: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(restaurants);
  } catch (err) { next(err); }
};

const createRestaurant = async (req, res, next) => {
  try {
    const { name, address, phone, logoUrl } = req.body;
    if (!name) return res.status(400).json({ message: "Restaurant name is required." });

    const restaurant = await prisma.restaurant.create({
      data: {
        name: name.trim(),
        address: address?.trim(),
        phone: phone?.trim(),
        logoUrl,
        features: { create: {} }, // default feature toggles
      },
      include: { features: true },
    });

    await logActivity({ userId: req.user.id, action: "RESTAURANT_CREATED", entity: "Restaurant", entityId: restaurant.id, metadata: { name } });
    res.status(201).json(restaurant);
  } catch (err) { next(err); }
};

const updateRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, phone, logoUrl, active } = req.body;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name      !== undefined && { name: name.trim() }),
        ...(address   !== undefined && { address: address.trim() }),
        ...(phone     !== undefined && { phone: phone.trim() }),
        ...(logoUrl   !== undefined && { logoUrl }),
        ...(active    !== undefined && { active }),
      },
      include: { _count: { select: { users: true, orders: true, menuItems: true } }, features: true },
    });

    await logActivity({ userId: req.user.id, action: "RESTAURANT_UPDATED", entity: "Restaurant", entityId: id, metadata: req.body });

    // Emit real-time branding update to kitchen and owner dashboards
    try {
      const io = req.app.get("io");
      if (io) emitRestaurantUpdate(io, restaurant);
    } catch (_) {}

    res.json(restaurant);
  } catch (err) { next(err); }
};

const deleteRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.restaurant.delete({ where: { id } });
    await logActivity({ userId: req.user.id, action: "RESTAURANT_DELETED", entity: "Restaurant", entityId: id });
    res.json({ message: "Restaurant deleted." });
  } catch (err) { next(err); }
};

// ── User CRUD ──────────────────────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;
    const where = { role: { not: "SUPER_ADMIN" } };
    if (restaurantId) where.restaurantId = restaurantId;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, active: true,
        restaurantId: true, createdAt: true,
        restaurant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, restaurantId, active } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password, role are required." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, restaurantId: restaurantId || null, active: active ?? true },
      select: { id: true, name: true, email: true, role: true, active: true, restaurantId: true, createdAt: true },
    });
    await logActivity({ userId: req.user.id, action: "USER_CREATED", entity: "User", entityId: user.id, metadata: { email, role } });
    res.status(201).json(user);
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, restaurantId, active } = req.body;

    const data = {};
    if (name         !== undefined) data.name = name;
    if (email        !== undefined) data.email = email;
    if (password     !== undefined) data.passwordHash = await bcrypt.hash(password, 10);
    if (role         !== undefined) data.role = role;
    if (restaurantId !== undefined) data.restaurantId = restaurantId || null;
    if (active       !== undefined) data.active = active;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, restaurantId: true, createdAt: true, restaurant: { select: { name: true } } },
    });
    await logActivity({ userId: req.user.id, action: "USER_UPDATED", entity: "User", entityId: id, metadata: { role, active } });
    res.json(user);
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    await logActivity({ userId: req.user.id, action: "USER_DELETED", entity: "User", entityId: id });
    res.json({ message: "User deleted." });
  } catch (err) { next(err); }
};

// ── Global Orders ─────────────────────────────────────────────────────────────
const getAllOrders = async (req, res, next) => {
  try {
    const { restaurantId, status, limit = 100 } = req.query;
    const where = {};
    if (restaurantId) where.restaurantId = restaurantId;
    if (status) where.status = status.toUpperCase();

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        restaurant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });
    res.json(orders);
  } catch (err) { next(err); }
};

// ── Activity Logs ──────────────────────────────────────────────────────────────
const getActivityLogs = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await prisma.activityLog.findMany({
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });
    res.json(logs);
  } catch (err) { next(err); }
};

module.exports = {
  getStats, getAnalytics, getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant,
  getUsers, createUser, updateUser, deleteUser,
  getAllOrders, getActivityLogs,
};
