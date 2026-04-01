/**
 * superAdmin.test.js — Tests for Super Admin Controller
 * Covers: role escalation prevention, restaurant CRUD, user management,
 *         pagination, analytics range validation, health endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

import { createApp, mockPrisma as prisma } from "./helpers/createApp.js";
import { SUPER_TOKEN, OWNER_TOKEN, KITCHEN_TOKEN } from "./helpers/tokenFactory.js";

const app = createApp();

function makeRestaurant(overrides = {}) {
  return {
    id:        "rest-1",
    name:      "Cafe Test",
    address:   "Kathmandu",
    phone:     "01-123456",
    active:    true,
    features:  { otpEnabled: true },
    _count:    { users: 2, orders: 10, menuItems: 5 },
    createdAt: new Date(),
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    id:           "u-1",
    name:         "Test Owner",
    email:        "owner@test.com",
    role:         "OWNER",
    active:       true,
    restaurantId: "rest-1",
    createdAt:    new Date(),
    lastLoginAt:  null,
    restaurant:   { name: "Cafe Test" },
    ...overrides,
  };
}

// ── Access Control (all super routes need SUPER_ADMIN) ─────────────────────────
describe("🔐 Super Admin Routes — Access Control", () => {
  it("OWNER cannot access /api/super/restaurants", async () => {
    const res = await request(app)
      .get("/api/super/restaurants")
      .set("Authorization", `Bearer ${OWNER_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it("KITCHEN cannot access /api/super/users", async () => {
    const res = await request(app)
      .get("/api/super/users")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it("unauthenticated requests are rejected with 401", async () => {
    const res = await request(app).get("/api/super/restaurants");
    expect(res.status).toBe(401);
  });
});

// ── Restaurant CRUD ───────────────────────────────────────────────────────────
describe("Restaurants — CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/super/restaurants — returns array", async () => {
    prisma.restaurant.findMany.mockResolvedValue([makeRestaurant()]);
    prisma.order.groupBy.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/super/restaurants")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /api/super/restaurants — returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/super/restaurants")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ address: "Kathmandu" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name is required/i);
  });

  it("POST /api/super/restaurants — creates restaurant", async () => {
    prisma.restaurant.create.mockResolvedValue(makeRestaurant());

    const res = await request(app)
      .post("/api/super/restaurants")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ name: "Cafe Test", address: "Kathmandu", phone: "01-123" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  it("DELETE /api/super/restaurants/:id — deletes restaurant", async () => {
    prisma.restaurant.delete.mockResolvedValue({});

    const res = await request(app)
      .delete("/api/super/restaurants/rest-1")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("PATCH /api/super/restaurants/bulk — requires ids array", async () => {
    const res = await request(app)
      .patch("/api/super/restaurants/bulk")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ active: false });

    expect(res.status).toBe(400);
  });
});

// ── User Management ───────────────────────────────────────────────────────────
describe("Users — CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/super/users — returns user list", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser()]);

    const res = await request(app)
      .get("/api/super/users")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("✅ SECURITY (S3) — cannot create user with SUPER_ADMIN role", async () => {
    const res = await request(app)
      .post("/api/super/users")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ name: "Hacker", email: "hacker@evil.com", password: "password123", role: "SUPER_ADMIN" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid role/i);
  });

  it("✅ SECURITY (S3) — cannot update user role to SUPER_ADMIN", async () => {
    const res = await request(app)
      .put("/api/super/users/u-1")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ role: "SUPER_ADMIN" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid role/i);
  });

  it("POST /api/super/users — returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/super/users")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ name: "Only Name" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("POST /api/super/users — creates user with valid OWNER role", async () => {
    prisma.user.create.mockResolvedValue(makeUser({ role: "OWNER" }));

    const res = await request(app)
      .post("/api/super/users")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ name: "Owner", email: "o@test.com", password: "pass1234", role: "OWNER" });

    expect(res.status).toBe(201);
  });

  it("POST /api/super/users — creates user with KITCHEN role", async () => {
    prisma.user.create.mockResolvedValue(makeUser({ role: "KITCHEN" }));

    const res = await request(app)
      .post("/api/super/users")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ name: "Cook", email: "k@test.com", password: "pass1234", role: "KITCHEN" });

    expect(res.status).toBe(201);
  });

  it("DELETE /api/super/users/:id — deletes user", async () => {
    prisma.user.delete.mockResolvedValue({});

    const res = await request(app)
      .delete("/api/super/users/u-1")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
describe("Analytics — Range validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/super/analytics?range=24h — returns 24 labels", async () => {
    prisma.order.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/super/analytics?range=24h")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.labels).toHaveLength(24);
    expect(res.body.range).toBe("24h");
  });

  it("GET /api/super/analytics?range=30d — returns 30 labels", async () => {
    prisma.order.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/super/analytics?range=30d")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.labels).toHaveLength(30);
  });

  it("GET /api/super/analytics?range=6m — returns 6 labels", async () => {
    prisma.order.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/super/analytics?range=6m")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.labels).toHaveLength(6);
  });

  it("GET /api/super/analytics — defaults to 24h when no range provided", async () => {
    prisma.order.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/super/analytics")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.labels).toHaveLength(24);
  });
});

// ── Global Orders — Pagination ────────────────────────────────────────────────
describe("Global Orders — Pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/super/orders — returns paginated response", async () => {
    prisma.order.count.mockResolvedValue(100);
    prisma.order.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/super/orders?page=1&limit=10")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total", 100);
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("totalPages");
  });

  it("clamps limit to 100 max", async () => {
    prisma.order.count.mockResolvedValue(0);
    prisma.order.findMany.mockResolvedValue([]);

    await request(app)
      .get("/api/super/orders?limit=9999")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    const callArgs = prisma.order.findMany.mock.calls[0][0];
    expect(callArgs.take).toBeLessThanOrEqual(100);
  });
});

// ── Dashboard KPIs ────────────────────────────────────────────────────────────
describe("Dashboard KPIs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/super/dashboard-kpis — returns today/yesterday metrics", async () => {
    prisma.order.count.mockResolvedValue(12);
    prisma.order.aggregate.mockResolvedValue({ _sum: { totalPrice: 5000 } });
    prisma.supportTicket.count.mockResolvedValue(2);
    prisma.restaurant.count.mockResolvedValue(1);

    const res = await request(app)
      .get("/api/super/dashboard-kpis")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("todayOrders");
    expect(res.body).toHaveProperty("todayRevenue");
    expect(res.body).toHaveProperty("openTickets");
    expect(res.body).toHaveProperty("inactiveRestaurants");
  });
});

// ── System Health ─────────────────────────────────────────────────────────────
describe("GET /api/super/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns healthy status with DB metrics", async () => {
    prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    prisma.order.count.mockResolvedValue(50);
    prisma.user.count.mockResolvedValue(10);
    prisma.restaurant.count.mockResolvedValue(3);
    prisma.activityLog.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/super/health")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body).toHaveProperty("dbResponseMs");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("memoryMb");
  });
});

// ── Maintenance Mode ──────────────────────────────────────────────────────────
describe("Maintenance Mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/maintenance — not mounted in test app (404)", async () => {
    const res = await request(app).get("/api/maintenance");
    expect(res.status).toBe(404);
  });

  it("POST /api/super/maintenance — requires SUPER_ADMIN", async () => {
    const res = await request(app)
      .post("/api/super/maintenance")
      .set("Authorization", `Bearer ${OWNER_TOKEN}`)
      .send({ active: true });
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN can toggle maintenance mode", async () => {
    const res = await request(app)
      .post("/api/super/maintenance")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ active: true, message: "Down for maintenance" });

    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
  });
});
