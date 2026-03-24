/**
 * restaurant.js — routes for authenticated restaurant users
 * GET /api/restaurant/mine   — branding info
 * GET /api/restaurant/analytics?range=24h|30d|6m — sales analytics
 */
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

// ── GET /api/restaurant/mine ─────────────────────────────────────────────────
// ── GET /api/restaurant/mine (authenticated) ────────────────────────────────
router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const { restaurantId } = req.user;
    if (!restaurantId) return res.status(404).json({ message: "No restaurant linked." });
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, logoUrl: true, address: true, phone: true, active: true, features: true },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    res.json(restaurant);
  } catch (err) { next(err); }
});

// ── GET /api/restaurant/info/:id (public — for customer menu page) ───────────
router.get("/info/:id", async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, logoUrl: true, address: true, phone: true },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    res.json(restaurant);
  } catch (err) { next(err); }
});


// ── GET /api/restaurant/analytics?range=24h|30d|6m ──────────────────────────
router.get("/analytics", authenticate, async (req, res, next) => {
  try {
    const { restaurantId } = req.user;
    if (!restaurantId) return res.status(404).json({ message: "No restaurant linked." });

    const range = req.query.range || "30d";
    const now = new Date();
    let startDate, buckets, labelFn, bucketFn;

    if (range === "24h") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      buckets = 24;
      labelFn  = (i) => `${String((now.getHours() - (23 - i) + 24) % 24).padStart(2,"0")}:00`;
      bucketFn = (createdAt) => { const diff = Math.floor((now - createdAt) / (60 * 60 * 1000)); return 23 - diff; };
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      buckets = 30;
      labelFn  = (i) => { const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000); return `${d.getDate()}/${d.getMonth() + 1}`; };
      bucketFn = (createdAt) => { const diff = Math.floor((now - createdAt) / (24 * 60 * 60 * 1000)); return 29 - diff; };
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      buckets = 6;
      labelFn  = (i) => { const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1); return d.toLocaleString("en-US", { month: "short" }); };
      bucketFn = (createdAt) => { const monthDiff = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()); return 5 - monthDiff; };
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
        status: { notIn: ["CANCELLED"] },
      },
      select: { totalPrice: true, discountedTotal: true, discount: true, status: true, createdAt: true },
    });

    const revenue = Array(buckets).fill(0);
    const counts  = Array(buckets).fill(0);
    let totalPaidRevenue = 0;
    let paidOrders = 0;

    for (const o of orders) {
      const idx = bucketFn(o.createdAt);
      if (idx >= 0 && idx < buckets) {
        // Use discountedTotal for PAID orders, otherwise totalPrice
        const amount = o.status === "PAID"
          ? (o.discountedTotal ?? o.totalPrice)
          : o.totalPrice;
        revenue[idx] += amount;
        counts[idx]  += 1;
      }
      if (o.status === "PAID") {
        totalPaidRevenue += (o.discountedTotal ?? o.totalPrice);
        paidOrders++;
      }
    }

    const labels = Array.from({ length: buckets }, (_, i) => labelFn(i));
    const totalRevenue = revenue.reduce((a, b) => a + b, 0);
    const totalOrders  = counts.reduce((a, b) => a + b, 0);

    res.json({ range, labels, revenue, counts, totalRevenue, totalOrders, totalPaidRevenue, paidOrders });
  } catch (err) { next(err); }
});

// ── GET /api/restaurant/staff — owner-accessible staff list ──────────────────
router.get("/staff", authenticate, async (req, res, next) => {
  try {
    const { restaurantId } = req.user;
    if (!restaurantId) return res.status(404).json({ message: "No restaurant linked." });
    const staff = await prisma.user.findMany({
      where: { restaurantId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(staff);
  } catch (err) { next(err); }
});

module.exports = router;

