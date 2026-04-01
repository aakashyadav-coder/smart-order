/**
 * order.test.js — Tests for Order Controller
 * Covers: createOrder, getOrders, getOrderById, updateOrderStatus
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => {
  const m = () => ({
    findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
    delete: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), upsert: vi.fn(),
  });
  return {
    default: {
      user: m(), restaurant: m(), order: m(), menuItem: m(),
      featureToggle: m(), passwordResetOtp: m(), activityLog: m(),
      supportTicket: m(), announcement: m(),
      $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
      $transaction: vi.fn(),
    },
  };
});

import { createApp, mockPrisma as prisma } from "./helpers/createApp.js";
import { SUPER_TOKEN, KITCHEN_TOKEN, KITCHEN_B_TOKEN, OWNER_TOKEN } from "./helpers/tokenFactory.js";

const app = createApp();

// ── Helper data ───────────────────────────────────────────────────────────────
const RESTAURANT_A = { id: "rest-a", name: "Restaurant A", active: true };
const RESTAURANT_B = { id: "rest-b", name: "Restaurant B", active: true };

const MENU_ITEM_1 = { id: "menu-1", name: "Burger",  price: 500, available: true, restaurantId: "rest-a" };
const MENU_ITEM_2 = { id: "menu-2", name: "Fries",   price: 150, available: true, restaurantId: "rest-a" };

function orderPayload(overrides = {}) {
  return {
    customerName: "Ram",
    phone:        "9800000001",
    tableNumber:  3,
    restaurantId: "rest-a",
    items: [
      { menuItemId: "menu-1", quantity: 2 },
      { menuItemId: "menu-2", quantity: 1 },
    ],
    ...overrides,
  };
}

function mockOrder(overrides = {}) {
  return {
    id:           "order-1",
    customerName: "Ram",
    phone:        "9800000001",
    tableNumber:  3,
    status:       "PENDING",
    totalPrice:   1150, // 500*2 + 150*1
    restaurantId: "rest-a",
    items:        [],
    otp:          null,
    createdAt:    new Date(),
    ...overrides,
  };
}

// ── POST /api/orders ──────────────────────────────────────────────────────────
describe("POST /api/orders — createOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when customerName is missing", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(orderPayload({ customerName: "" }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing required/i);
  });

  it("returns 400 when items array is empty", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(orderPayload({ items: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when restaurantId is missing", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(orderPayload({ restaurantId: undefined }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/restaurantId is required/i);
  });

  it("returns 404 when restaurant does not exist", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/orders")
      .send(orderPayload());
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/restaurant not found/i);
  });

  it("returns 400 when restaurant is inactive", async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ ...RESTAURANT_A, active: false });
    const res = await request(app)
      .post("/api/orders")
      .send(orderPayload());
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not accepting orders/i);
  });

  it("returns 400 when a menu item is unavailable", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(RESTAURANT_A);
    // Return only 1 item though 2 were requested → availability mismatch
    prisma.menuItem.findMany.mockResolvedValue([MENU_ITEM_1]);

    const res = await request(app)
      .post("/api/orders")
      .send(orderPayload());
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unavailable/i);
  });

  it("✅ SECURITY — uses DB price, not client-submitted price", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(RESTAURANT_A);
    prisma.menuItem.findMany.mockResolvedValue([MENU_ITEM_1, MENU_ITEM_2]);
    const createdOrder = mockOrder({ totalPrice: 1150 });
    prisma.order.create.mockResolvedValue(createdOrder);

    const res = await request(app)
      .post("/api/orders")
      .send({
        ...orderPayload(),
        // Attacker sends price: 0 — should be IGNORED
        items: [
          { menuItemId: "menu-1", quantity: 2, price: 0 },
          { menuItemId: "menu-2", quantity: 1, price: 0 },
        ],
      });

    expect(res.status).toBe(201);
    // Verify the DB was called with correct prices derived from DB items
    const createCall = prisma.order.create.mock.calls[0][0].data;
    // Each item price must match DB price, not 0
    createCall.items.create.forEach((item) => {
      expect(item.price).toBeGreaterThan(0);
    });
    // Total price should be calculated from DB prices
    expect(createCall.totalPrice).toBe(1150); // 500*2 + 150*1
  });

  it("creates order and returns 201 with full order data", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(RESTAURANT_A);
    prisma.menuItem.findMany.mockResolvedValue([MENU_ITEM_1, MENU_ITEM_2]);
    prisma.order.create.mockResolvedValue(mockOrder());

    const res = await request(app)
      .post("/api/orders")
      .send(orderPayload());

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.restaurantId).toBe("rest-a");
  });
});

// ── GET /api/orders ───────────────────────────────────────────────────────────
describe("GET /api/orders — getOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("✅ MULTI-TENANT — KITCHEN user only gets own restaurant orders", async () => {
    prisma.order.findMany.mockResolvedValue([mockOrder()]);

    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`); // rest-a

    expect(res.status).toBe(200);
    // Confirm query was scoped to 'rest-a'
    const callArgs = prisma.order.findMany.mock.calls[0][0];
    expect(callArgs.where.restaurantId).toBe("rest-a");
  });

  it("SUPER_ADMIN can see all restaurants (no restaurantId filter)", async () => {
    prisma.order.findMany.mockResolvedValue([mockOrder()]);

    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    const callArgs = prisma.order.findMany.mock.calls[0][0];
    // SUPER_ADMIN should have NO restaurantId filter
    expect(callArgs.where.restaurantId).toBeUndefined();
  });
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
describe("GET /api/orders/:id — getOrderById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when order does not exist", async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/orders/nonexistent-id");
    expect(res.status).toBe(404);
  });

  it("returns the order (public route — no auth required)", async () => {
    prisma.order.findUnique.mockResolvedValue(mockOrder({ id: "order-abc" }));
    const res = await request(app).get("/api/orders/order-abc");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("order-abc");
  });
});

// ── PUT /api/orders/:id/status ────────────────────────────────────────────────
describe("PUT /api/orders/:id/status — updateOrderStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .put("/api/orders/order-1/status")
      .send({ status: "ACCEPTED" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid status value", async () => {
    const res = await request(app)
      .put("/api/orders/order-1/status")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ status: "FLYING" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid status/i);
  });

  it("✅ SECURITY (S2) — KITCHEN user cannot update another restaurant's order", async () => {
    // Order belongs to rest-b, but kitchen token is for rest-a
    prisma.order.findUnique.mockResolvedValue({ id: "order-9", restaurantId: "rest-b" });

    const res = await request(app)
      .put("/api/orders/order-9/status")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`) // rest-a token
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/access denied/i);
  });

  it("✅ SECURITY (S2) — KITCHEN B cannot update KITCHEN A's order", async () => {
    prisma.order.findUnique.mockResolvedValue({ id: "order-1", restaurantId: "rest-a" });

    const res = await request(app)
      .put("/api/orders/order-1/status")
      .set("Authorization", `Bearer ${KITCHEN_B_TOKEN}`) // rest-b token
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(403);
  });

  it("returns 404 when order does not exist (non-super user)", async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/orders/ghost-id/status")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(404);
  });

  it("KITCHEN user successfully updates own restaurant's order", async () => {
    prisma.order.findUnique.mockResolvedValue({ id: "order-1", restaurantId: "rest-a" });
    prisma.order.update.mockResolvedValue(mockOrder({ status: "ACCEPTED", restaurantId: "rest-a" }));

    const res = await request(app)
      .put("/api/orders/order-1/status")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ACCEPTED");
  });

  it("SUPER_ADMIN can update any order regardless of restaurant", async () => {
    // super has no restaurantId, so no cross-tenant check is run
    prisma.order.update.mockResolvedValue(mockOrder({ status: "CANCELLED", restaurantId: "rest-z" }));

    const res = await request(app)
      .put("/api/orders/order-1/status")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ status: "CANCELLED" });

    expect(res.status).toBe(200);
  });

  it("sets servedAt timestamp when status is SERVED", async () => {
    prisma.order.findUnique.mockResolvedValue({ id: "order-1", restaurantId: "rest-a" });
    prisma.order.update.mockResolvedValue(mockOrder({ status: "SERVED", servedAt: new Date() }));

    await request(app)
      .put("/api/orders/order-1/status")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ status: "SERVED" });

    const updateCall = prisma.order.update.mock.calls[0][0].data;
    expect(updateCall).toHaveProperty("servedAt");
  });

  it("does NOT set servedAt when status is not SERVED", async () => {
    prisma.order.findUnique.mockResolvedValue({ id: "order-1", restaurantId: "rest-a" });
    prisma.order.update.mockResolvedValue(mockOrder({ status: "PREPARING" }));

    await request(app)
      .put("/api/orders/order-1/status")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ status: "PREPARING" });

    const updateCall = prisma.order.update.mock.calls[0][0].data;
    expect(updateCall.servedAt).toBeUndefined();
  });
});
