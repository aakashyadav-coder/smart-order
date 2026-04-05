/**
 * centralAdminController.js
 * All /api/central/* routes for CENTRAL_ADMIN role.
 * Provides aggregated multi-branch analytics, live orders, staff management,
 * branch CRUD, audit log, reports, and advanced analytics.
 */
const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const { logActivity } = require("../services/activityLogService");

// ── Helper: resolve branch IDs for the requesting user ────────────────────────
async function getBranchIds(userId) {
  const links = await prisma.restaurantOwner.findMany({
    where: { userId },
    select: { restaurantId: true },
  });
  return links.map((l) => l.restaurantId);
}

function roundMoney(v) {
  return Math.round((v || 0) * 100) / 100;
}

// ── GET /api/central/branches ─────────────────────────────────────────────────
const getBranches = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json([]);

    const [restaurants, revenueRows, orderCounts] = await Promise.all([
      prisma.restaurant.findMany({
        where: { id: { in: branchIds } },
        include: {
          _count: { select: { users: true, orders: true, menuItems: true } },
          features: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.order.groupBy({
        by: ["restaurantId"],
        where: {
          restaurantId: { in: branchIds },
          status: { in: ["PAID", "SERVED"] },
        },
        _sum: { totalPrice: true },
      }),
      prisma.order.groupBy({
        by: ["restaurantId"],
        where: {
          restaurantId: { in: branchIds },
          status: { notIn: ["CANCELLED"] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        _count: true,
      }),
    ]);

    const revMap = {};
    for (const r of revenueRows) revMap[r.restaurantId] = r._sum.totalPrice || 0;
    const orderMap = {};
    for (const r of orderCounts) orderMap[r.restaurantId] = r._count || 0;

    const result = restaurants.map((r) => ({
      ...r,
      totalRevenue: roundMoney(revMap[r.id] || 0),
      todayOrders: orderMap[r.id] || 0,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/central/branches ────────────────────────────────────────────────
const createBranch = async (req, res, next) => {
  try {
    const { name, branchName, address, phone, logoUrl, cuisineType, tableCount } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Branch name is required." });

    const restaurant = await prisma.restaurant.create({
      data: {
        name: name.trim(),
        branchName: branchName?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        cuisineType: cuisineType?.trim() || null,
        tableCount: tableCount ? parseInt(tableCount) : null,
        ownerEmail: req.user.email,
      },
    });

    // Link to this central admin
    await prisma.restaurantOwner.create({
      data: { userId: req.user.id, restaurantId: restaurant.id },
    });

    await logActivity({
      userId: req.user.id,
      action: "BRANCH_CREATED",
      entity: "Restaurant",
      entityId: restaurant.id,
      metadata: { name: restaurant.name },
    });

    res.status(201).json(restaurant);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/central/branches/:id ─────────────────────────────────────────────
const updateBranch = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    const { id } = req.params;
    if (!branchIds.includes(id)) return res.status(403).json({ message: "Access denied." });

    const { name, branchName, address, phone, logoUrl, cuisineType, tableCount } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Branch name is required." });

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        name: name.trim(),
        branchName: branchName?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        cuisineType: cuisineType?.trim() || null,
        tableCount: tableCount ? parseInt(tableCount) : null,
      },
    });

    await logActivity({
      userId: req.user.id,
      action: "BRANCH_UPDATED",
      entity: "Restaurant",
      entityId: id,
      metadata: { name: restaurant.name },
    });

    res.json(restaurant);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/central/branches/:id/toggle ────────────────────────────────────
const toggleBranch = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    const { id } = req.params;
    if (!branchIds.includes(id)) return res.status(403).json({ message: "Access denied." });

    const current = await prisma.restaurant.findUnique({ where: { id }, select: { active: true } });
    if (!current) return res.status(404).json({ message: "Branch not found." });

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: { active: !current.active },
    });

    await logActivity({
      userId: req.user.id,
      action: restaurant.active ? "BRANCH_ACTIVATED" : "BRANCH_DEACTIVATED",
      entity: "Restaurant",
      entityId: id,
      metadata: { active: restaurant.active },
    });

    res.json(restaurant);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/summary ──────────────────────────────────────────────────
const getSummary = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) {
      return res.json({
        branchCount: 0, activeBranches: 0, totalRevenue: 0, todayRevenue: 0,
        totalOrders: 0, todayOrders: 0, pendingOrders: 0, totalStaff: 0,
      });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [restaurants, totalRevenueResult, todayRevenueResult, totalOrders, todayOrders, pendingOrders, staffCount] =
      await Promise.all([
        prisma.restaurant.findMany({ where: { id: { in: branchIds } }, select: { id: true, active: true } }),
        prisma.order.aggregate({ where: { restaurantId: { in: branchIds }, status: { in: ["PAID", "SERVED"] } }, _sum: { totalPrice: true } }),
        prisma.order.aggregate({ where: { restaurantId: { in: branchIds }, status: { in: ["PAID", "SERVED"] }, createdAt: { gte: todayStart } }, _sum: { totalPrice: true } }),
        prisma.order.count({ where: { restaurantId: { in: branchIds }, status: { notIn: ["CANCELLED"] } } }),
        prisma.order.count({ where: { restaurantId: { in: branchIds }, status: { notIn: ["CANCELLED"] }, createdAt: { gte: todayStart } } }),
        prisma.order.count({ where: { restaurantId: { in: branchIds }, status: "PENDING" } }),
        prisma.user.count({ where: { restaurantId: { in: branchIds }, role: { in: ["KITCHEN", "OWNER", "ADMIN"] } } }),
      ]);

    res.json({
      branchCount: branchIds.length,
      activeBranches: restaurants.filter((r) => r.active).length,
      totalRevenue: roundMoney(totalRevenueResult._sum.totalPrice || 0),
      todayRevenue: roundMoney(todayRevenueResult._sum.totalPrice || 0),
      totalOrders, todayOrders, pendingOrders,
      totalStaff: staffCount,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/analytics?range=24h|30d|6m ──────────────────────────────
const getAnalytics = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json({ labels: [], branches: [] });

    const range = req.query.range || "30d";
    const now = new Date();
    let startDate, buckets, labelFn, bucketFn;

    if (range === "24h") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      buckets = 24;
      labelFn = (i) => `${String((now.getHours() - (23 - i) + 24) % 24).padStart(2, "0")}:00`;
      bucketFn = (d) => { const diff = Math.floor((now - d) / (60 * 60 * 1000)); return 23 - diff; };
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      buckets = 30;
      labelFn = (i) => { const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000); return `${d.getDate()}/${d.getMonth() + 1}`; };
      bucketFn = (d) => { const diff = Math.floor((now - d) / (24 * 60 * 60 * 1000)); return 29 - diff; };
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      buckets = 6;
      labelFn = (i) => { const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1); return d.toLocaleString("en-US", { month: "short" }); };
      bucketFn = (d) => { const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()); return 5 - diff; };
    }

    const orders = await prisma.order.findMany({
      where: { restaurantId: { in: branchIds }, createdAt: { gte: startDate }, status: { notIn: ["CANCELLED"] } },
      select: { restaurantId: true, totalPrice: true, discountedTotal: true, createdAt: true, restaurant: { select: { name: true, branchName: true } } },
    });

    const labels = Array.from({ length: buckets }, (_, i) => labelFn(i));
    const branchMap = new Map();
    for (const o of orders) {
      const idx = bucketFn(o.createdAt);
      if (idx < 0 || idx >= buckets) continue;
      if (!branchMap.has(o.restaurantId)) {
        branchMap.set(o.restaurantId, { id: o.restaurantId, name: o.restaurant?.name || "Unknown", branchName: o.restaurant?.branchName || null, revenue: Array(buckets).fill(0), totalRevenue: 0 });
      }
      const b = branchMap.get(o.restaurantId);
      const amount = o.discountedTotal ?? o.totalPrice;
      b.revenue[idx] += amount;
      b.totalRevenue += amount;
    }

    const branches = Array.from(branchMap.values()).map((b) => ({ ...b, revenue: b.revenue.map(roundMoney), totalRevenue: roundMoney(b.totalRevenue) }));
    res.json({ range, labels, branches });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/analytics/peak-hours ─────────────────────────────────────
const getPeakHours = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json({ data: [] });

    const { branchId } = req.query;
    const ids = branchId && branchIds.includes(branchId) ? [branchId] : branchIds;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: { restaurantId: { in: ids }, createdAt: { gte: since }, status: { notIn: ["CANCELLED"] } },
      select: { createdAt: true },
    });

    const hourCounts = Array(24).fill(0);
    for (const o of orders) hourCounts[new Date(o.createdAt).getHours()]++;

    const data = hourCounts.map((count, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      count,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/analytics/best-sellers ────────────────────────────────────
const getBestSellers = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json({ data: [] });

    const { branchId } = req.query;
    const ids = branchId && branchIds.includes(branchId) ? [branchId] : branchIds;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: {
        order: { restaurantId: { in: ids }, createdAt: { gte: since }, status: { notIn: ["CANCELLED"] } },
      },
      _sum: { quantity: true },
      _count: { menuItemId: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const itemIds = result.map((r) => r.menuItemId);
    const items = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true, category: true, price: true, restaurant: { select: { name: true } } },
    });
    const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

    const data = result.map((r) => ({
      menuItemId: r.menuItemId,
      count: r._sum.quantity || 0,
      orders: r._count.menuItemId,
      item: itemMap[r.menuItemId] || { name: "Unknown", category: "—", price: 0 },
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/analytics/staff-performance ──────────────────────────────
const getStaffPerformance = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json({ data: [] });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [staff, branchOrders] = await Promise.all([
      prisma.user.findMany({
        where: { restaurantId: { in: branchIds }, role: { in: ["KITCHEN", "OWNER", "ADMIN"] } },
        select: {
          id: true, name: true, email: true, role: true, active: true,
          lastLoginAt: true, createdAt: true,
          restaurant: { select: { id: true, name: true, branchName: true, logoUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.groupBy({
        by: ["restaurantId"],
        where: { restaurantId: { in: branchIds }, createdAt: { gte: since }, status: { notIn: ["CANCELLED"] } },
        _count: true,
      }),
    ]);

    const orderMap = Object.fromEntries(branchOrders.map((b) => [b.restaurantId, b._count]));
    const data = staff.map((s) => ({ ...s, branchOrders: orderMap[s.restaurant?.id] || 0 }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/orders ───────────────────────────────────────────────────
const getOrders = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json({ data: [], total: 0, page: 1, totalPages: 1 });

    const { branchId, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50")));
    const skip = (page - 1) * limit;

    const where = { restaurantId: { in: branchId && branchIds.includes(branchId) ? [branchId] : branchIds } };
    if (status) where.status = status.toUpperCase();

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: { include: { menuItem: { select: { name: true } } } },
          restaurant: { select: { id: true, name: true, branchName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({ data: orders, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/reports ──────────────────────────────────────────────────
const getReportData = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json({ orders: [], summary: {} });

    const { from, to, branchId } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const ids = branchId && branchIds.includes(branchId) ? [branchId] : branchIds;

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: { in: ids },
        createdAt: { gte: fromDate, lte: toDate },
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        restaurant: { select: { name: true, branchName: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = orders
      .filter((o) => o.status === "PAID")
      .reduce((s, o) => s + (o.discountedTotal ?? o.totalPrice), 0);
    const paidOrders = orders.filter((o) => o.status === "PAID").length;
    const gstAmount = roundMoney(totalRevenue * 0.05);

    res.json({
      orders,
      summary: {
        totalRevenue: roundMoney(totalRevenue),
        totalOrders: orders.length,
        paidOrders,
        gstAmount,
        from: fromDate,
        to: toDate,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/audit-log ────────────────────────────────────────────────
const getAuditLog = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20")));
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (req.query.action) where.action = req.query.action;

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({ data: logs, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/staff ────────────────────────────────────────────────────
const getStaff = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json([]);

    const { branchId } = req.query;
    const ids = branchId && branchIds.includes(branchId) ? [branchId] : branchIds;

    const staff = await prisma.user.findMany({
      where: { restaurantId: { in: ids }, role: { in: ["KITCHEN", "OWNER", "ADMIN"] } },
      select: {
        id: true, name: true, email: true, role: true, active: true,
        lastLoginAt: true, createdAt: true, restaurantId: true,
        restaurant: { select: { id: true, name: true, branchName: true, logoUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(staff);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/central/staff/:id ────────────────────────────────────────────────
const updateStaff = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    const { id } = req.params;
    const { role, active, name } = req.body;

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, restaurantId: true, role: true } });
    if (!target || !branchIds.includes(target.restaurantId)) {
      return res.status(403).json({ message: "You do not have permission to edit this user." });
    }

    const ALLOWED_ROLES = ["OWNER", "ADMIN", "KITCHEN"];
    if (role && !ALLOWED_ROLES.includes(role)) return res.status(400).json({ message: "Invalid role." });

    const data = {};
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
    if (name !== undefined) data.name = name;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, restaurantId: true, restaurant: { select: { id: true, name: true, branchName: true, logoUrl: true } } },
    });

    await logActivity({ userId: req.user.id, action: "STAFF_UPDATED_BY_CENTRAL_ADMIN", entity: "User", entityId: id, metadata: { role, active } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/central/staff/:id ─────────────────────────────────────────────
const deleteStaff = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    const { id } = req.params;

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, restaurantId: true } });
    if (!target || !branchIds.includes(target.restaurantId)) {
      return res.status(403).json({ message: "You do not have permission to delete this user." });
    }

    await prisma.user.delete({ where: { id } });
    await logActivity({ userId: req.user.id, action: "STAFF_DELETED_BY_CENTRAL_ADMIN", entity: "User", entityId: id });

    res.json({ message: "Staff member deleted." });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/central/profile ────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true, role: true, restaurantId: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBranches, createBranch, updateBranch, toggleBranch,
  getSummary, getAnalytics,
  getPeakHours, getBestSellers, getStaffPerformance,
  getOrders, getReportData, getAuditLog,
  getStaff, updateStaff, deleteStaff,
  updateProfile,
};

