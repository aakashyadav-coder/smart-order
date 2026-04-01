/**
 * features.test.js — Tests for Feature Toggle Controller
 * Covers: getFeatures, updateFeatures, auto-create on first access
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock activityLogService so feature updates don't try real DB writes
// Note: vi.mock is hoisted automatically by Vitest, so it runs before imports
vi.mock("../services/activityLogService", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { createApp, mockPrisma as prisma } from "./helpers/createApp.js";
import { SUPER_TOKEN, OWNER_TOKEN } from "./helpers/tokenFactory.js";

const app = createApp();

const RESTAURANT_ID = "rest-feature-1";

function makeFeatures(overrides = {}) {
  return {
    id:                   "feat-1",
    restaurantId:         RESTAURANT_ID,
    otpEnabled:           true,
    paymentsEnabled:      false,
    notificationsEnabled: true,
    updatedAt:            new Date(),
    ...overrides,
  };
}

// ── GET /api/features/:restaurantId ──────────────────────────────────────────
describe("GET /api/features/:restaurantId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns feature toggles for an existing restaurant", async () => {
    prisma.featureToggle.findUnique.mockResolvedValue(makeFeatures());

    const res = await request(app)
      .get(`/api/features/${RESTAURANT_ID}`)
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("otpEnabled");
    expect(res.body).toHaveProperty("paymentsEnabled");
    expect(res.body).toHaveProperty("notificationsEnabled");
  });

  it("✅ AUTO-CREATE — creates default feature toggles when none exist", async () => {
    // First call returns null (not found), then create is called
    prisma.featureToggle.findUnique.mockResolvedValue(null);
    prisma.featureToggle.create.mockResolvedValue(makeFeatures());

    const res = await request(app)
      .get(`/api/features/${RESTAURANT_ID}`)
      .set("Authorization", `Bearer ${SUPER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(prisma.featureToggle.create).toHaveBeenCalledOnce();
    expect(res.body).toHaveProperty("otpEnabled", true); // default value
  });
});

// ── PUT /api/features/:restaurantId ──────────────────────────────────────────
describe("PUT /api/features/:restaurantId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    const res = await request(app)
      .put(`/api/features/${RESTAURANT_ID}`)
      .send({ otpEnabled: false });
    expect(res.status).toBe(401);
  });

  it("updates specific feature toggles (partial update)", async () => {
    const updated = makeFeatures({ otpEnabled: false });
    prisma.featureToggle.upsert.mockResolvedValue(updated);

    const res = await request(app)
      .put(`/api/features/${RESTAURANT_ID}`)
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ otpEnabled: false }); // only one field sent

    expect(res.status).toBe(200);
    expect(res.body.otpEnabled).toBe(false);
    // Verify upsert was called with partial update
    const upsertCall = prisma.featureToggle.upsert.mock.calls[0][0];
    expect(upsertCall.update).toHaveProperty("otpEnabled", false);
    // paymentsEnabled should NOT be in the update if not sent
    expect(upsertCall.update.paymentsEnabled).toBeUndefined();
  });

  it("updates paymentsEnabled independently", async () => {
    const updated = makeFeatures({ paymentsEnabled: true });
    prisma.featureToggle.upsert.mockResolvedValue(updated);

    const res = await request(app)
      .put(`/api/features/${RESTAURANT_ID}`)
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ paymentsEnabled: true });

    expect(res.status).toBe(200);
    expect(res.body.paymentsEnabled).toBe(true);
  });

  it("OWNER is blocked (route requires SUPER_ADMIN)", async () => {
    const res = await request(app)
      .put(`/api/features/rest-a`)
      .set("Authorization", `Bearer ${OWNER_TOKEN}`)
      .send({ notificationsEnabled: false });

    // Route requires SUPER_ADMIN — OWNER gets 403
    expect(res.status).toBe(403);
  });

  it("logs activity after feature toggle update (via activityLog.create)", async () => {
    prisma.featureToggle.upsert.mockResolvedValue(makeFeatures());
    prisma.activityLog.create.mockResolvedValue({});

    await request(app)
      .put(`/api/features/${RESTAURANT_ID}`)
      .set("Authorization", `Bearer ${SUPER_TOKEN}`)
      .send({ otpEnabled: true });

    // logActivity() internally calls prisma.activityLog.create — verify it
    expect(prisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "FEATURE_TOGGLE_UPDATED",
          entity: "FeatureToggle",
          entityId: RESTAURANT_ID,
        }),
      })
    );
  });
});
