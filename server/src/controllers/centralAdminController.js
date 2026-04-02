/**
 * centralAdminController.js
 * All /api/central/* routes for CENTRAL_ADMIN role.
 * Provides aggregated multi-branch analytics, live orders, staff management.
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
// Returns all branches owned by the current user with basic stats.
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

// ── GET /api/central/summary ──────────────────────────────────────────────────
// Aggregated KPIs across ALL branches owned by this user.
const getSummary = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) {
      return res.json({
        branchCount: 0,
        activeBranches: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        totalOrders: 0,
        todayOrders: 0,
        pendingOrders: 0,
        totalStaff: 0,
      });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [
      restaurants,
      totalRevenueResult,
      todayRevenueResult,
      totalOrders,
      todayOrders,
      pendingOrders,
      staffCount,
    ] = await Promise.all([
      prisma.restaurant.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, active: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: { in: branchIds },
          status: { in: ["PAID", "SERVED"] },
        },
        _sum: { totalPrice: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: { in: branchIds },
          status: { in: ["PAID", "SERVED"] },
          createdAt: { gte: todayStart },
        },
        _sum: { totalPrice: true },
      }),
      prisma.order.count({
        where: {
          restaurantId: { in: branchIds },
          status: { notIn: ["CANCELLED"] },
        },
      }),
      prisma.order.count({
        where: {
          restaurantId: { in: branchIds },
          status: { notIn: ["CANCELLED"] },
          createdAt: { gte: todayStart },
        },
      }),
      prisma.order.count({
        where: {
          restaurantId: { in: branchIds },
          status: "PENDING",
        },
      }),
      prisma.user.count({
        where: {
          restaurantId: { in: branchIds },
          role: { in: ["KITCHEN", "OWNER", "ADMIN"] },
        },
      }),
    ]);

    res.json({
      branchCount: branchIds.length,
      activeBranches: restaurants.filter((r) => r.active).length,
      totalRevenue: roundMoney(totalRevenueResult._sum.totalPrice || 0),
      todayRevenue: roundMoney(todayRevenueResult._sum.totalPrice || 0),
      totalOrders,
      todayOrders,
      pendingOrders,
      totalStaff: staffCount,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/analytics?range=24h|30d|6m ──────────────────────────────
// Branch-wise revenue series for Recharts multi-line chart.
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
      labelFn = (i) =>
        `${String((now.getHours() - (23 - i) + 24) % 24).padStart(2, "0")}:00`;
      bucketFn = (d) => {
        const diff = Math.floor((now - d) / (60 * 60 * 1000));
        return 23 - diff;
      };
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      buckets = 30;
      labelFn = (i) => {
        const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      };
      bucketFn = (d) => {
        const diff = Math.floor((now - d) / (24 * 60 * 60 * 1000));
        return 29 - diff;
      };
    } else {
      // 6m
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      buckets = 6;
      labelFn = (i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return d.toLocaleString("en-US", { month: "short" });
      };
      bucketFn = (d) => {
        const diff =
          (now.getFullYear() - d.getFullYear()) * 12 +
          (now.getMonth() - d.getMonth());
        return 5 - diff;
      };
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: { in: branchIds },
        createdAt: { gte: startDate },
        status: { notIn: ["CANCELLED"] },
      },
      select: {
        restaurantId: true,
        totalPrice: true,
        discountedTotal: true,
        createdAt: true,
        restaurant: { select: { name: true } },
      },
    });

    const labels = Array.from({ length: buckets }, (_, i) => labelFn(i));

    // Build per-branch data
    const branchMap = new Map();
    for (const o of orders) {
      const idx = bucketFn(o.createdAt);
      if (idx < 0 || idx >= buckets) continue;

      if (!branchMap.has(o.restaurantId)) {
        branchMap.set(o.restaurantId, {
          id: o.restaurantId,
          name: o.restaurant?.name || "Unknown",
          revenue: Array(buckets).fill(0),
          totalRevenue: 0,
        });
      }
      const b = branchMap.get(o.restaurantId);
      const amount = o.discountedTotal ?? o.totalPrice;
      b.revenue[idx] += amount;
      b.totalRevenue += amount;
    }

    const branches = Array.from(branchMap.values()).map((b) => ({
      id: b.id,
      name: b.name,
      revenue: b.revenue.map(roundMoney),
      totalRevenue: roundMoney(b.totalRevenue),
    }));

    res.json({ range, labels, branches });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/central/orders?branchId=&status=&page= ──────────────────────────
// Live & recent orders across all owned branches (paginated).
const getOrders = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json({ data: [], total: 0, page: 1, totalPages: 1 });

    const { branchId, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50")));
    const skip = (page - 1) * limit;

    const where = {
      restaurantId: {
        in: branchId && branchIds.includes(branchId) ? [branchId] : branchIds,
      },
    };
    if (status) where.status = status.toUpperCase();

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: { include: { menuItem: { select: { name: true } } } },
          restaurant: { select: { id: true, name: true } },
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

// ── GET /api/central/staff?branchId= ─────────────────────────────────────────
// All staff across all owned branches.
const getStaff = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    if (branchIds.length === 0) return res.json([]);

    const { branchId } = req.query;
    const ids =
      branchId && branchIds.includes(branchId) ? [branchId] : branchIds;

    const staff = await prisma.user.findMany({
      where: {
        restaurantId: { in: ids },
        role: { in: ["KITCHEN", "OWNER", "ADMIN"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        restaurantId: true,
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(staff);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/central/staff/:id ────────────────────────────────────────────────
// Edit staff member role/active — scoped to owned branches only.
const updateStaff = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    const { id } = req.params;
    const { role, active, name } = req.body;

    // Verify target user belongs to an owned branch
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, restaurantId: true, role: true },
    });
    if (!target || !branchIds.includes(target.restaurantId)) {
      return res.status(403).json({ message: "You do not have permission to edit this user." });
    }

    const ALLOWED_ROLES = ["OWNER", "ADMIN", "KITCHEN"];
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const data = {};
    if (role   !== undefined) data.role   = role;
    if (active !== undefined) data.active = active;
    if (name   !== undefined) data.name   = name;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, restaurantId: true, restaurant: { select: { id: true, name: true } } },
    });

    await logActivity({
      userId: req.user.id,
      action: "STAFF_UPDATED_BY_CENTRAL_ADMIN",
      entity: "User",
      entityId: id,
      metadata: { role, active },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/central/staff/:id ─────────────────────────────────────────────
// Delete a staff member — scoped to owned branches only.
const deleteStaff = async (req, res, next) => {
  try {
    const branchIds = await getBranchIds(req.user.id);
    const { id } = req.params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, restaurantId: true },
    });
    if (!target || !branchIds.includes(target.restaurantId)) {
      return res.status(403).json({ message: "You do not have permission to delete this user." });
    }

    await prisma.user.delete({ where: { id } });
    await logActivity({
      userId: req.user.id,
      action: "STAFF_DELETED_BY_CENTRAL_ADMIN",
      entity: "User",
      entityId: id,
    });

    res.json({ message: "Staff member deleted." });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBranches, getSummary, getAnalytics, getOrders, getStaff, updateStaff, deleteStaff };
