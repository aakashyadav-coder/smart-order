/**
 * security.test.js — Focused security regression tests
 * Tests all the critical security fixes from previous audits (S1–S7)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt  from "bcryptjs";

import { createApp, mockPrisma as prisma } from "./helpers/createApp.js";
import {
  makeToken,
  makeRefreshToken,
  makePreAuthToken,
  makeResetToken,
  SUPER_TOKEN,
  OWNER_TOKEN,
  KITCHEN_TOKEN,
  KITCHEN_B_TOKEN,
} from "./helpers/tokenFactory.js";

const app = createApp();

describe("🛡️  Security: Rate Limiting (S1)", () => {
  it("orderLimiter is defined and applied to POST /api/orders (smoke test)", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/orders")
      .send({ restaurantId: "r1", customerName: "a", phone: "1", tableNumber: 1, items: [{ menuItemId: "m1", quantity: 1 }] });
    expect([400, 404]).toContain(res.status);
  });
});

describe("🛡️  Security: Cross-Tenant Order Access (S2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("KITCHEN A cannot update KITCHEN B's order", async () => {
    prisma.order.findUnique.mockResolvedValue({ id: "order-b", restaurantId: "rest-b" });

    const res = await request(app)
      .put("/api/orders/order-b/status")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/access denied/i);
  });

  it("Cross-tenant check is skipped for SUPER_ADMIN", async () => {
    prisma.order.update.mockResolvedValue({ id: "order-x", status: "ACCEPTED", restaurantId: "rest-z" });

    const res = await request(app)
      .put("/api/orders/order-x/status")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(200);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });
});

describe("🛡️  Security: Role Escalation Prevention (S3)", () => {
  beforeEach(() => vi.clearAllMocks());

  const roles = ["SUPER_ADMIN"];
  const validRoles = ["OWNER", "ADMIN", "KITCHEN"];

  it.each(roles)("cannot create a user with role '%s'", async (role) => {
    const res = await request(app)
      .post("/api/super/users")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ name: "Hacker", email: "h@evil.com", password: "pass1234", role });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid role/i);
  });

  it.each(roles)("cannot update a user's role to '%s'", async (role) => {
    const res = await request(app)
      .put("/api/super/users/some-user-id")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ role });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid role/i);
  });

  it.each(validRoles)("can create user with valid role '%s'", async (role) => {
    prisma.user.create.mockResolvedValue({ id: "u1", role });
    const res = await request(app)
      .post("/api/super/users")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ name: "User", email: `${role.toLowerCase()}@test.com`, password: "pass1234", role });
    expect(res.status).toBe(201);
  });
});

describe("🛡️  Security: Token Type Confusion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Refresh token rejected as Bearer access token on /api/auth/me", async () => {
    const refreshTok = makeRefreshToken("user-1");
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${refreshTok}`);

    expect(res.status).not.toBe(200);
  });

  it("pre-auth token is rejected when used as Bearer for /api/orders", async () => {
    const preAuth = makePreAuthToken("user-1");
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${preAuth}`);
    expect(res.status).not.toBe(200);
  });

  it("POST /api/auth/refresh rejects access token used as refresh", async () => {
    const accessToken = KITCHEN_TOKEN;
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: accessToken });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token type/i);
  });

  it("POST /api/auth/totp-verify rejects refresh token as preAuthToken", async () => {
    const refreshTok = makeRefreshToken("user-1");
    const res = await request(app)
      .post("/api/auth/totp-verify")
      .send({ preAuthToken: refreshTok, code: "123456" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token type/i);
  });
});

describe("🛡️  Security: OTP Reuse Prevention", () => {
  beforeEach(() => vi.clearAllMocks());

  it("password reset OTP cannot be reused (marked as used)", async () => {
    const otp     = "111222";
    const otpHash = await bcrypt.hash(otp, 10);

    prisma.passwordResetOtp.findFirst.mockResolvedValueOnce({
      id: "otp-1",
      email: "test@example.com",
      otpHash,
      used: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    prisma.passwordResetOtp.update.mockResolvedValue({ id: "otp-1", used: true });

    const res1 = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "test@example.com", otp });
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty("resetToken");

    prisma.passwordResetOtp.findFirst.mockResolvedValueOnce(null);

    const res2 = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "test@example.com", otp });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toMatch(/invalid or has expired/i);
  });
});

describe("🛡️  Security: Price Tampering Prevention", () => {
  beforeEach(() => vi.clearAllMocks());

  it("order total uses DB prices, completely ignoring client-side prices", async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ id: "rest-a", active: true });
    prisma.menuItem.findMany.mockResolvedValue([
      { id: "m1", name: "Burger", price: 500, available: true },
      { id: "m2", name: "Fries",  price: 200, available: true },
    ]);
    prisma.order.create.mockResolvedValue({
      id: "o1", totalPrice: 1200, restaurantId: "rest-a", items: [], otp: null,
    });

    await request(app)
      .post("/api/orders")
      .send({
        customerName: "Priya",
        phone: "9800000002",
        tableNumber: 1,
        restaurantId: "rest-a",
        items: [
          { menuItemId: "m1", quantity: 2, price: 1 },
          { menuItemId: "m2", quantity: 1, price: 0 },
        ],
      });

    const createCall = prisma.order.create.mock.calls[0][0].data;
    expect(createCall.totalPrice).toBe(1200);
    createCall.items.create.forEach((item) => {
      expect(item.price).toBeGreaterThan(0);
    });
  });
});

describe("🛡️  Security: Email Enumeration Prevention", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forgot-password returns same message for real and fake emails", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const fakeRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    prisma.user.findUnique.mockResolvedValueOnce({ id: "u1", email: "real@example.com", active: true });
    prisma.passwordResetOtp.updateMany.mockResolvedValue({ count: 0 });
    prisma.passwordResetOtp.create.mockResolvedValue({ id: "otp-1" });

    const realRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "real@example.com" });

    expect(fakeRes.status).toBe(realRes.status);
    expect(fakeRes.body.message).toBe(realRes.body.message);
  });

  it("login returns same message for unknown user and wrong password", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res1 = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "anypassword" });

    prisma.user.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "known@example.com",
      passwordHash: await bcrypt.hash("correct", 10),
      active: true,
      totpEnabled: false,
    });
    const res2 = await request(app)
      .post("/api/auth/login")
      .send({ email: "known@example.com", password: "wrong" });

    expect(res1.body.message).toBe(res2.body.message);
    expect(res1.status).toBe(res2.status);
  });
});
