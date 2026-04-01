/**
 * middleware.test.js — Tests for auth middleware
 * Tests: authenticate, requireRole, requireSuperAdmin, requireOwnerOrAbove
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "./helpers/createApp.js";
import {
  makeToken,
  makeExpiredToken,
  SUPER_TOKEN,
  OWNER_TOKEN,
  KITCHEN_TOKEN,
} from "./helpers/tokenFactory.js";

// Use the health endpoint (no auth required) or a super-only route for guard tests
const app = createApp();

describe("🔐 Auth Middleware — authenticate()", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  it("returns 401 when Authorization header is not Bearer format", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Basic dXNlcjpwYXNz");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  it("returns 401 with 'Session expired' for expired token", async () => {
    const expired = makeExpiredToken({ id: "user-expired" });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/session expired/i);
  });

  it("returns 401 for a completely malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer this.is.not.valid.jwt");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token/i);
  });
});

describe("🔐 Auth Middleware — requireSuperAdmin()", () => {
  it("returns 403 when OWNER role hits a super-admin-only route", async () => {
    const res = await request(app)
      .get("/api/super/restaurants")
      .set("Authorization", `Bearer ${OWNER_TOKEN}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/super admin/i);
  });

  it("returns 403 when KITCHEN role hits a super-admin-only route", async () => {
    const res = await request(app)
      .get("/api/super/restaurants")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it("allows SUPER_ADMIN through requireSuperAdmin guard", async () => {
    // The route will proceed past auth — we just need it not to be 401/403
    // It may return 200 or 500 depending on mock data, but NOT 401/403
    const res = await request(app)
      .get("/api/super/restaurants")
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("🔐 Auth Middleware — requireOwnerOrAbove()", () => {
  it("returns 403 when KITCHEN role hits an owner-required route", async () => {
    const res = await request(app)
      .put("/api/restaurant/mine")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ name: "Test" });
    expect(res.status).toBe(403);
  });

  it("allows OWNER role through requireOwnerOrAbove", async () => {
    const res = await request(app)
      .put("/api/restaurant/mine")
      .set("Authorization", `Bearer ${OWNER_TOKEN}`)
      .send({ name: "Test Restaurant" });
    // Not 401 or 403 — actual result depends on DB mock
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows SUPER_ADMIN through requireOwnerOrAbove", async () => {
    const superWithRestaurant = makeToken({ role: "SUPER_ADMIN", restaurantId: "rest-a" });
    const res = await request(app)
      .get("/api/restaurant/announcements")
      .set("Authorization", `Bearer ${superWithRestaurant}`);
    expect(res.status).not.toBe(403);
  });
});
