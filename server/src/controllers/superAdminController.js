/**
 * Super Admin Controller — full platform management
 * All routes require SUPER_ADMIN role
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { logActivity } = require("../services/activityLogService");
const { emitRestaurantUpdate, emitAnnouncement } = require("../socket");

// ── In-memory Maintenance Mode state ─────────────────────────────────────────
// (Resets on server restart — intentional for simple SaaS use)
let maintenanceState = {
  active: false,
  message: "We'll be back soon! Scheduled maintenance in progress.",
  scheduledAt: null, // ISO string — future time for countdown
};

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
    const { search } = req.query;
    const where = search
      ? { name: { contains: search, mode: "insensitive" } }
      : {};

    const restaurants = await prisma.restaurant.findMany({
      where,
      include: {
        _count: { select: { users: true, orders: true, menuItems: true } },
        features: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(restaurants);
  } catch (err) { next(err); }
};

const getRestaurantDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, orders: true, menuItems: true } },
        features: true,
        users: { select: { id: true, name: true, role: true, email: true, active: true, lastLoginAt: true, createdAt: true } },
      },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });

    // Revenue for this restaurant
    const revenue = await prisma.order.aggregate({
      where: { restaurantId: id },
      _sum: { totalPrice: true },
    });

    res.json({ ...restaurant, totalRevenue: revenue._sum.totalPrice || 0 });
  } catch (err) { next(err); }
};

const createRestaurant = async (req, res, next) => {
  try {
    const { name, address, phone, logoUrl, tableCount, cuisineType, openingHours } = req.body;
    if (!name) return res.status(400).json({ message: "Restaurant name is required." });

    const restaurant = await prisma.restaurant.create({
      data: {
        name: name.trim(),
        address: address?.trim(),
        phone: phone?.trim(),
        logoUrl,
        tableCount: tableCount ? parseInt(tableCount) : null,
        cuisineType: cuisineType?.trim() || null,
        openingHours: openingHours || null,
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
    const { name, address, phone, logoUrl, active, tableCount, cuisineType, openingHours } = req.body;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name         !== undefined && { name: name.trim() }),
        ...(address      !== undefined && { address: address.trim() }),
        ...(phone        !== undefined && { phone: phone.trim() }),
        ...(logoUrl      !== undefined && { logoUrl }),
        ...(active       !== undefined && { active }),
        ...(tableCount   !== undefined && { tableCount: tableCount ? parseInt(tableCount) : null }),
        ...(cuisineType  !== undefined && { cuisineType: cuisineType?.trim() || null }),
        ...(openingHours !== undefined && { openingHours }),
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

// ── Bulk Restaurant Action ─────────────────────────────────────────────────────
const bulkUpdateRestaurants = async (req, res, next) => {
  try {
    const { ids, active } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required." });
    await prisma.restaurant.updateMany({ where: { id: { in: ids } }, data: { active } });
    await logActivity({ userId: req.user.id, action: "RESTAURANT_BULK_UPDATED", entity: "Restaurant", metadata: { ids, active } });
    res.json({ updated: ids.length });
  } catch (err) { next(err); }
};

// ── User CRUD ──────────────────────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { restaurantId, search, role } = req.query;
    const where = { role: { not: "SUPER_ADMIN" } };
    if (restaurantId) where.restaurantId = restaurantId;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, active: true,
        restaurantId: true, createdAt: true, lastLoginAt: true,
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
      select: { id: true, name: true, email: true, role: true, active: true, restaurantId: true, createdAt: true, lastLoginAt: true },
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
      select: { id: true, name: true, email: true, role: true, active: true, restaurantId: true, createdAt: true, lastLoginAt: true, restaurant: { select: { name: true } } },
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

// ── Bulk User Action ───────────────────────────────────────────────────────────
const bulkUpdateUsers = async (req, res, next) => {
  try {
    const { ids, active } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required." });
    await prisma.user.updateMany({ where: { id: { in: ids } }, data: { active } });
    await logActivity({ userId: req.user.id, action: "USER_BULK_UPDATED", entity: "User", metadata: { ids, active } });
    res.json({ updated: ids.length });
  } catch (err) { next(err); }
};

// ── Global Orders ─────────────────────────────────────────────────────────────
const getAllOrders = async (req, res, next) => {
  try {
    const { restaurantId, status, limit = 100, search, dateFrom, dateTo } = req.query;
    const where = {};
    if (restaurantId) where.restaurantId = restaurantId;
    if (status) where.status = status.toUpperCase();
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59Z");
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

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
    const { limit = 200, action, dateFrom, dateTo } = req.query;
    const where = {};
    if (action) where.action = action;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59Z");
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });
    res.json(logs);
  } catch (err) { next(err); }
};

// ── System Health ──────────────────────────────────────────────────────────────
const getHealth = async (req, res, next) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbMs = Date.now() - start;

    const [totalOrders, totalUsers, totalRestaurants, recentErrors] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.activityLog.findMany({
        where: { action: { startsWith: "ERROR" } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    res.json({
      status: "healthy",
      dbResponseMs: dbMs,
      uptime: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      counts: { totalOrders, totalUsers, totalRestaurants },
      recentErrors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: "unhealthy", error: err.message });
  }
};

// ── Announcements ──────────────────────────────────────────────────────────────
const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { restaurant: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(announcements);
  } catch (err) { next(err); }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, restaurantId } = req.body;
    if (!title || !message) return res.status(400).json({ message: "title and message are required." });

    const ann = await prisma.announcement.create({
      data: { title, message, restaurantId: restaurantId || null },
      include: { restaurant: { select: { id: true, name: true } } },
    });
    await logActivity({ userId: req.user.id, action: "ANNOUNCEMENT_CREATED", entity: "Announcement", entityId: ann.id, metadata: { title, restaurantId } });
    const io = req.app.get("io");
    if (io) emitAnnouncement(io, ann);
    res.status(201).json(ann);
  } catch (err) { next(err); }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });
    await logActivity({ userId: req.user.id, action: "ANNOUNCEMENT_DELETED", entity: "Announcement", entityId: id });
    res.json({ message: "Deleted." });
  } catch (err) { next(err); }
};

// ── Support Tickets ────────────────────────────────────────────────────────────
const getTickets = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const tickets = await prisma.supportTicket.findMany({
      where,
      include: { restaurant: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(tickets);
  } catch (err) { next(err); }
};

const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reply } = req.body;
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(reply  !== undefined && { reply }),
      },
      include: { restaurant: { select: { id: true, name: true } } },
    });
    await logActivity({ userId: req.user.id, action: "TICKET_UPDATED", entity: "SupportTicket", entityId: id, metadata: { status, reply } });
    res.json(ticket);
  } catch (err) { next(err); }
};

const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.supportTicket.delete({ where: { id } });
    res.json({ message: "Ticket deleted." });
  } catch (err) { next(err); }
};

// ── Dashboard KPIs (today vs yesterday + ticket/restaurant counts) ─────────────
const getDashboardKPIs = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1);
    const yestEnd    = new Date(todayEnd);   yestEnd.setDate(yestEnd.getDate() - 1);

    const [
      todayOrdersCount,
      todayRevenueResult,
      yestOrdersCount,
      yestRevenueResult,
      openTickets,
      inactiveRestaurants,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: todayStart, lte: todayEnd } }, _sum: { totalPrice: true } }),
      prisma.order.count({ where: { createdAt: { gte: yestStart, lte: yestEnd } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: yestStart, lte: yestEnd } }, _sum: { totalPrice: true } }),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.restaurant.count({ where: { active: false } }),
    ]);

    const todayRevenue = roundMoney(todayRevenueResult._sum.totalPrice || 0);
    const yestRevenue  = roundMoney(yestRevenueResult._sum.totalPrice  || 0);

    const orderDelta   = yestOrdersCount  > 0 ? Math.round(((todayOrdersCount - yestOrdersCount)  / yestOrdersCount)  * 100) : null;
    const revenueDelta = yestRevenue  > 0      ? Math.round(((todayRevenue    - yestRevenue)       / yestRevenue)       * 100) : null;

    res.json({
      todayOrders: todayOrdersCount,
      yesterdayOrders: yestOrdersCount,
      orderDelta,
      todayRevenue,
      yesterdayRevenue: yestRevenue,
      revenueDelta,
      openTickets,
      inactiveRestaurants,
    });
  } catch (err) { next(err); }
};

// ── Revenue BI ─────────────────────────────────────────────────────────────────
const PERIOD_PRESETS = {
  daily:   { type: 'day',   count: 14 },
  weekly:  { type: 'week',  count: 8  },
  monthly: { type: 'month', count: 12 },
};

function getPeriodBuckets(period) {
  const preset = PERIOD_PRESETS[period] || PERIOD_PRESETS.daily;
  const now = new Date();
  let start, labels = [], bucketMs = 0;

  if (preset.type === 'day') {
    const aligned = new Date(now); aligned.setHours(0, 0, 0, 0);
    bucketMs = 24 * 60 * 60 * 1000;
    start = new Date(aligned.getTime() - (preset.count - 1) * bucketMs);
    labels = Array.from({ length: preset.count }, (_, i) => {
      const d = new Date(start.getTime() + i * bucketMs);
      return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
    });
  } else if (preset.type === 'week') {
    const aligned = new Date(now); aligned.setHours(0, 0, 0, 0);
    const dow = aligned.getDay(); aligned.setDate(aligned.getDate() - dow);
    bucketMs = 7 * 24 * 60 * 60 * 1000;
    start = new Date(aligned.getTime() - (preset.count - 1) * bucketMs);
    labels = Array.from({ length: preset.count }, (_, i) => {
      const d = new Date(start.getTime() + i * bucketMs);
      return `W${Math.ceil(d.getDate() / 7)} ${MONTHS_SHORT[d.getMonth()]}`;
    });
  } else {
    const startMonth = new Date(now.getFullYear(), now.getMonth() - (preset.count - 1), 1);
    start = startMonth;
    labels = Array.from({ length: preset.count }, (_, i) => {
      const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      return MONTHS_SHORT[d.getMonth()];
    });
    bucketMs = 0; // handled separately for months
  }
  return { preset, start, end: now, labels, bucketMs };
}

function getPeriodBucketIndex(date, start, preset, bucketMs) {
  if (preset.type === 'month') {
    return (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
  }
  return Math.floor((date.getTime() - start.getTime()) / bucketMs);
}

const getRevenueBI = async (req, res, next) => {
  try {
    const period = String(req.query.period || 'daily').toLowerCase();
    const { preset, start, end, labels, bucketMs } = getPeriodBuckets(period);
    const bucketCount = labels.length;

    // Previous period window (same length, one period back)
    const prevStart = preset.type === 'month'
      ? new Date(start.getFullYear(), start.getMonth() - bucketCount, 1)
      : new Date(start.getTime() - (end.getTime() - start.getTime()));
    const prevEnd = new Date(start.getTime() - 1);

    const [currentOrders, prevOrders] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { totalPrice: true, status: true, createdAt: true, restaurantId: true, restaurant: { select: { name: true } } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
        select: { totalPrice: true, restaurantId: true },
      }),
    ]);

    // Aggregate previous period revenue per restaurant
    const prevRevByRestaurant = new Map();
    for (const o of prevOrders) {
      prevRevByRestaurant.set(o.restaurantId, (prevRevByRestaurant.get(o.restaurantId) || 0) + (o.totalPrice || 0));
    }

    // Peak hours (hour of day → total orders, across current period)
    const peakHours = Array(24).fill(0);

    // Per-restaurant aggregation
    const restMap = new Map();
    for (const order of currentOrders) {
      const hour = order.createdAt.getHours();
      peakHours[hour]++;

      const idx = getPeriodBucketIndex(order.createdAt, start, preset, bucketMs);
      if (idx < 0 || idx >= bucketCount) continue;

      if (!restMap.has(order.restaurantId)) {
        restMap.set(order.restaurantId, {
          id: order.restaurantId,
          name: order.restaurant?.name || 'Unknown',
          revenueSeries: Array(bucketCount).fill(0),
          totalRevenue: 0,
          orderCount: 0,
          cancelledCount: 0,
        });
      }
      const r = restMap.get(order.restaurantId);
      r.revenueSeries[idx] += order.totalPrice || 0;
      r.totalRevenue += order.totalPrice || 0;
      r.orderCount++;
      if (order.status === 'CANCELLED') r.cancelledCount++;
    }

    let platformTotal = 0, platformPrevTotal = 0;
    prevOrders.forEach(o => { platformPrevTotal += o.totalPrice || 0; });

    const restaurants = Array.from(restMap.values()).map(r => {
      const prevRev = roundMoney(prevRevByRestaurant.get(r.id) || 0);
      const growth = prevRev > 0 ? Math.round(((r.totalRevenue - prevRev) / prevRev) * 100) : null;
      platformTotal += r.totalRevenue;
      return {
        id: r.id,
        name: r.name,
        revenueSeries: r.revenueSeries.map(v => roundMoney(v)),
        totalRevenue: roundMoney(r.totalRevenue),
        previousRevenue: prevRev,
        orderCount: r.orderCount,
        aov: r.orderCount > 0 ? roundMoney(r.totalRevenue / r.orderCount) : 0,
        cancelledCount: r.cancelledCount,
        cancelRate: r.orderCount > 0 ? Math.round((r.cancelledCount / r.orderCount) * 100) : 0,
        growth,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const platformGrowth = platformPrevTotal > 0
      ? Math.round(((platformTotal - platformPrevTotal) / platformPrevTotal) * 100)
      : null;
    const platformAov = currentOrders.length > 0 ? roundMoney(platformTotal / currentOrders.filter(o => o.status !== 'CANCELLED').length || 1) : 0;
    const platformCancelRate = currentOrders.length > 0
      ? Math.round((currentOrders.filter(o => o.status === 'CANCELLED').length / currentOrders.length) * 100)
      : 0;

    res.json({
      period,
      labels,
      restaurants,
      peakHours: peakHours.map((count, hour) => ({ hour, count })),
      platform: {
        totalRevenue: roundMoney(platformTotal),
        previousRevenue: roundMoney(platformPrevTotal),
        growth: platformGrowth,
        aov: platformAov,
        cancelRate: platformCancelRate,
        totalOrders: currentOrders.length,
      },
    });
  } catch (err) { next(err); }
};


// ── Maintenance Mode ───────────────────────────────────────────────────────────
const getMaintenanceStatus = (req, res) => {
  res.json(maintenanceState);
};

const setMaintenanceMode = (req, res, next) => {
  try {
    const { active, message, scheduledAt } = req.body;
    if (typeof active === 'boolean') maintenanceState.active = active;
    if (message !== undefined) maintenanceState.message = message;
    // scheduledAt: ISO string or null
    maintenanceState.scheduledAt = scheduledAt || null;

    // Broadcast to all connected clients (customer menu pages listen for this)
    const io = req.app.get('io');
    if (io) io.emit('maintenance_update', maintenanceState);

    res.json(maintenanceState);
  } catch (err) { next(err); }
};

// Public endpoint (no auth) for customer pages to check maintenance status
const getMaintenancePublic = (req, res) => {
  res.json(maintenanceState);
};

// ── Onboarding Pipeline ────────────────────────────────────────────────────────
const getOnboardingPipeline = async (req, res, next) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        _count: { select: { users: true, orders: true, menuItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pipeline = restaurants.map(r => {
      const hasMenu   = (r._count.menuItems || 0) > 0;
      const hasStaff  = (r._count.users    || 0) > 0;
      const hasOrders = (r._count.orders   || 0) > 0;
      const hasTables = !!r.tableCount;
      const hasHours  = !!r.openingHours;

      let stage;
      if (!hasMenu && !hasStaff) stage = 'NOT_STARTED';       // 🔴
      else if (!hasMenu || !hasStaff || !hasOrders) stage = 'PARTIAL'; // 🟡
      else stage = 'LIVE';                                              // 🟢

      const checks = [
        { key: 'menu',   label: 'Menu items',     done: hasMenu },
        { key: 'staff',  label: 'Staff accounts',  done: hasStaff },
        { key: 'orders', label: 'First order',     done: hasOrders },
        { key: 'tables', label: 'Table count set', done: hasTables },
        { key: 'hours',  label: 'Opening hours',   done: hasHours },
      ];
      const completedCount = checks.filter(c => c.done).length;
      const pct = Math.round((completedCount / checks.length) * 100);

      return {
        id: r.id,
        name: r.name,
        active: r.active,
        stage,
        pct,
        checks,
        counts: r._count,
        createdAt: r.createdAt,
      };
    });

    const summary = {
      NOT_STARTED: pipeline.filter(r => r.stage === 'NOT_STARTED').length,
      PARTIAL:     pipeline.filter(r => r.stage === 'PARTIAL').length,
      LIVE:        pipeline.filter(r => r.stage === 'LIVE').length,
    };

    res.json({ pipeline, summary });
  } catch (err) { next(err); }
};

// Bulk nudge — send announcement to restaurants in specified stage
const nudgeRestaurants = async (req, res, next) => {
  try {
    const { stage, title, message } = req.body;
    if (!stage || !title || !message) return res.status(400).json({ message: 'stage, title, message required' });

    // Re-fetch pipeline to get restaurant IDs
    const restaurants = await prisma.restaurant.findMany({
      include: { _count: { select: { users: true, orders: true, menuItems: true } } },
    });

    const targets = restaurants.filter(r => {
      const hasMenu   = r._count.menuItems > 0;
      const hasStaff  = r._count.users > 0;
      const hasOrders = r._count.orders > 0;
      let s;
      if (!hasMenu && !hasStaff) s = 'NOT_STARTED';
      else if (!hasMenu || !hasStaff || !hasOrders) s = 'PARTIAL';
      else s = 'LIVE';
      return s === stage;
    });

    if (targets.length === 0) return res.json({ sent: 0 });

    const io = req.app.get('io');
    let sent = 0;
    for (const r of targets) {
      const ann = await prisma.announcement.create({
        data: { title, message, restaurantId: r.id },
        include: { restaurant: { select: { id: true, name: true } } },
      });
      if (io) io.to(`owner_${r.id}`).emit('announcement', ann);
      sent++;
    }
    await logActivity({ userId: req.user.id, action: 'ANNOUNCEMENT_CREATED', entity: 'Announcement', metadata: { stage, sent } });
    res.json({ sent });
  } catch (err) { next(err); }
};

// ── Data Retention / Log Purge ─────────────────────────────────────────────────
const purgeLogs = async (req, res, next) => {
  try {
    const days = parseInt(req.body.days || req.query.days || 90);
    if (isNaN(days) || days < 1) return res.status(400).json({ message: 'days must be a positive integer' });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    await logActivity({
      userId: req.user.id,
      action: 'LOGS_PURGED',
      entity: 'ActivityLog',
      metadata: { days, deleted: result.count, cutoff: cutoff.toISOString() },
    });

    res.json({ deleted: result.count, cutoff: cutoff.toISOString(), days });
  } catch (err) { next(err); }
};

const purgeOrders = async (req, res, next) => {
  try {
    const { restaurantId, days } = req.body;
    const d = parseInt(days || 180);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });
    if (isNaN(d) || d < 1) return res.status(400).json({ message: 'days must be a positive integer' });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - d);

    const result = await prisma.order.deleteMany({
      where: { restaurantId, createdAt: { lt: cutoff }, status: { in: ['PAID', 'CANCELLED', 'SERVED'] } },
    });

    await logActivity({
      userId: req.user.id,
      action: 'ORDERS_PURGED',
      entity: 'Order',
      metadata: { restaurantId, days: d, deleted: result.count },
    });

    res.json({ deleted: result.count, cutoff: cutoff.toISOString(), days: d });
  } catch (err) { next(err); }
};


// ── Super Admin Settings ────────────────────────────────────────────────────────
const getSuperProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, totpEnabled: true, lastLoginAt: true, createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
};

const updateSuperProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...(name && { name }), ...(email && { email }) },
      select: { id: true, name: true, email: true, role: true, totpEnabled: true },
    });
    await logActivity({ userId: req.user.id, action: 'USER_UPDATED', entity: 'User', entityId: req.user.id });
    res.json(updated);
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'currentPassword and newPassword required' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    await logActivity({ userId: req.user.id, action: 'USER_UPDATED', entity: 'User', entityId: req.user.id, metadata: { action: 'password_change' } });
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

// ── Global Search ───────────────────────────────────────────────────────────────
const globalSearch = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ restaurants: [], users: [], orders: [] });

    const [restaurants, users, orders] = await Promise.all([
      prisma.restaurant.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, name: true, active: true },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
          role: { not: 'SUPER_ADMIN' },
        },
        take: 5,
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.order.findMany({
        where: { id: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, status: true, totalPrice: true, restaurant: { select: { name: true } }, createdAt: true },
      }),
    ]);

    res.json({ restaurants, users, orders });
  } catch (err) { next(err); }
};

module.exports = {
  getStats, getAnalytics,
  getDashboardKPIs, getRevenueBI,
  getRestaurants, getRestaurantDetail, createRestaurant, updateRestaurant, deleteRestaurant, bulkUpdateRestaurants,
  getUsers, createUser, updateUser, deleteUser, bulkUpdateUsers,
  getAllOrders,
  getActivityLogs,
  getHealth,
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  getTickets, updateTicket, deleteTicket,
  getMaintenanceStatus, setMaintenanceMode, getMaintenancePublic,
  getOnboardingPipeline, nudgeRestaurants,
  purgeLogs, purgeOrders,
  getSuperProfile, updateSuperProfile, changePassword,
  globalSearch,
};
