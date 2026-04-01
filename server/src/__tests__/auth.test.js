/**
 * auth.test.js — Tests for Authentication Controller
 * Covers: login, refresh, me, TOTP verify, forgot/verify/reset password, change email
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request  from "supertest";
import bcrypt   from "bcryptjs";

// vi.mock must appear before imports (it is hoisted)
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
import {
  makeToken,
  makeRefreshToken,
  makePreAuthToken,
  makeResetToken,
  makeExpiredToken,
  KITCHEN_TOKEN,
  OWNER_TOKEN,
} from "./helpers/tokenFactory.js";

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function hashPw(plain) {
  return bcrypt.hash(plain, 10);
}

function makeDbUser(overrides = {}) {
  return {
    id:           "user-id-1",
    name:         "Test User",
    email:        "test@example.com",
    passwordHash: "$2a$10$placeholder",
    role:         "KITCHEN",
    restaurantId: "rest-a",
    active:       true,
    totpEnabled:  false,
    totpSecret:   null,
    lastLoginAt:  null,
    ...overrides,
  };
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when body is missing email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "secret" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  it("returns 401 for a non-existent user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("returns 401 for wrong password", async () => {
    const user = makeDbUser({ passwordHash: await hashPw("correct") });
    prisma.user.findUnique.mockResolvedValue(user);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("returns 403 for a deactivated account", async () => {
    const user = makeDbUser({ passwordHash: await hashPw("pass123"), active: false });
    prisma.user.findUnique.mockResolvedValue(user);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "pass123" });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  it("returns token + refreshToken on successful login", async () => {
    const pw   = "mypassword";
    const user = makeDbUser({ passwordHash: await hashPw(pw) });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue({ id: user.id, lastLoginAt: new Date() });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: pw });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.user.email).toBe(user.email);
  });

  it("returns requireTotp=true (no full JWT) when TOTP is enabled", async () => {
    const pw   = "mypass";
    const user = makeDbUser({
      passwordHash: await hashPw(pw),
      totpEnabled:  true,
      totpSecret:   "BASE32SECRET",
    });
    prisma.user.findUnique.mockResolvedValue(user);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: pw });

    expect(res.status).toBe(200);
    expect(res.body.requireTotp).toBe(true);
    expect(res.body).toHaveProperty("preAuthToken");
    expect(res.body).not.toHaveProperty("token");
  });

  it("does not reveal whether a user exists (same error for wrong user/wrong pass)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res1 = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "whatever" });

    const user = makeDbUser({ passwordHash: await hashPw("correct") });
    prisma.user.findUnique.mockResolvedValue(user);
    const res2 = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong" });

    expect(res1.body.message).toBe(res2.body.message);
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
describe("POST /api/auth/refresh", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when refreshToken is missing", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 for an expired refresh token", async () => {
    const expired = makeExpiredToken({ id: "u1", type: "refresh" });
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: expired });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("returns 401 when an access token is used as a refresh token (type check)", async () => {
    const accessToken = makeToken({ role: "KITCHEN" });
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: accessToken });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token type/i);
  });

  it("returns a new access token for a valid refresh token", async () => {
    const refreshToken = makeRefreshToken("user-1");
    const user = makeDbUser({ id: "user-1", active: true });
    prisma.user.findUnique.mockResolvedValue(user);

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("returns 403 when a deactivated user tries to refresh", async () => {
    const refreshToken = makeRefreshToken("inactive-user");
    prisma.user.findUnique.mockResolvedValue(makeDbUser({ id: "inactive-user", active: false }));

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/deactivated/i);
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
describe("GET /api/auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns current user data for a valid token", async () => {
    // Mock only the fields that the controller's `select` would return
    // (Prisma mocks ignore select, so we control the response shape here)
    prisma.user.findUnique.mockResolvedValue({
      id:           "user-id-1",
      name:         "Test User",
      email:        "test@example.com",
      role:         "KITCHEN",
      restaurantId: "rest-a",
      active:       true,
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("email");
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  it("returns 403 when account is deactivated", async () => {
    prisma.user.findUnique.mockResolvedValue(makeDbUser({ active: false }));
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`);
    expect(res.status).toBe(403);
  });
});

// ── POST /api/auth/totp-verify ────────────────────────────────────────────────
describe("POST /api/auth/totp-verify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when preAuthToken or code is missing", async () => {
    const res = await request(app)
      .post("/api/auth/totp-verify")
      .send({ preAuthToken: "tok" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 400 when code is not 6 digits", async () => {
    const res = await request(app)
      .post("/api/auth/totp-verify")
      .send({ preAuthToken: makePreAuthToken(), code: "123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6 digits/i);
  });

  it("returns 401 when preAuthToken is expired", async () => {
    const expired = makeExpiredToken({ id: "u1", type: "pre_auth" });
    const res = await request(app)
      .post("/api/auth/totp-verify")
      .send({ preAuthToken: expired, code: "123456" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/2FA session expired/i);
  });

  it("returns 401 when an access token is used as preAuthToken (type check)", async () => {
    const wrongToken = makeToken({ role: "KITCHEN" });
    const res = await request(app)
      .post("/api/auth/totp-verify")
      .send({ preAuthToken: wrongToken, code: "123456" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token type/i);
  });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("returns generic success even when email does not exist (anti-enumeration)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email exists/i);
  });

  it("returns generic success and creates OTP record for valid user", async () => {
    const user = makeDbUser();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.passwordResetOtp.updateMany.mockResolvedValue({ count: 0 });
    prisma.passwordResetOtp.create.mockResolvedValue({ id: "otp-1" });

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(prisma.passwordResetOtp.create).toHaveBeenCalledOnce();
    expect(res.body.message).toMatch(/if that email exists/i);
  });
});

// ── POST /api/auth/verify-reset-otp ──────────────────────────────────────────
describe("POST /api/auth/verify-reset-otp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when email or otp is missing", async () => {
    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when OTP is not 6 digits", async () => {
    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "test@example.com", otp: "12345" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6 digits/i);
  });

  it("returns 400 when OTP record not found or expired", async () => {
    prisma.passwordResetOtp.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "test@example.com", otp: "123456" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  it("returns 400 for incorrect OTP (hash mismatch)", async () => {
    const otpHash = await bcrypt.hash("999999", 10);
    prisma.passwordResetOtp.findFirst.mockResolvedValue({
      id: "otp-1",
      email: "test@example.com",
      otpHash,
      used: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "test@example.com", otp: "123456" });

    expect(res.status).toBe(400);
    // Either "incorrect OTP" or "OTP is invalid or has expired"
    expect(res.body.message).toMatch(/OTP|otp/i);
  });

  it("returns resetToken on a correct OTP", async () => {
    const otp     = "654321";
    const otpHash = await bcrypt.hash(otp, 10);
    prisma.passwordResetOtp.findFirst.mockResolvedValue({
      id: "otp-1",
      email: "test@example.com",
      otpHash,
      used: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    prisma.passwordResetOtp.update.mockResolvedValue({ id: "otp-1", used: true });

    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "test@example.com", otp });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("resetToken");
  });
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
describe("POST /api/auth/reset-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when resetToken or newPassword is missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: makeResetToken() });
    expect(res.status).toBe(400);
  });

  it("returns 400 when newPassword is less than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: makeResetToken(), newPassword: "short" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it("returns 401 when resetToken is expired", async () => {
    const expired = makeExpiredToken({ email: "test@example.com", type: "password_reset" });
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: expired, newPassword: "newpassword" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("returns 401 when a non-reset token is used (type check)", async () => {
    const wrongToken = makeToken({ role: "KITCHEN" });
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: wrongToken, newPassword: "newpassword" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token type/i);
  });

  it("successfully resets password with valid token", async () => {
    const user = makeDbUser({ active: true });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: makeResetToken("test@example.com"), newPassword: "newpassword123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
    expect(prisma.user.update).toHaveBeenCalledOnce();
  });
});

// ── PUT /api/auth/change-email ────────────────────────────────────────────────
describe("PUT /api/auth/change-email", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when newEmail or currentPassword is missing", async () => {
    const res = await request(app)
      .put("/api/auth/change-email")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ newEmail: "new@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await request(app)
      .put("/api/auth/change-email")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ newEmail: "not-an-email", currentPassword: "pass" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid email/i);
  });

  it("returns 401 when current password is wrong", async () => {
    const user = makeDbUser({ passwordHash: await hashPw("correct") });
    prisma.user.findUnique.mockResolvedValue(user);

    const res = await request(app)
      .put("/api/auth/change-email")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ newEmail: "new@example.com", currentPassword: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/incorrect/i);
  });

  it("returns 409 when new email is already taken", async () => {
    const user    = makeDbUser({ id: "user-a", passwordHash: await hashPw("correct") });
    const another = makeDbUser({ id: "user-b", email: "taken@example.com" });
    prisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(another);

    const res = await request(app)
      .put("/api/auth/change-email")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ newEmail: "taken@example.com", currentPassword: "correct" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already in use/i);
  });

  it("successfully changes email with correct password", async () => {
    const user = makeDbUser({ passwordHash: await hashPw("correct") });
    prisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);
    prisma.user.update.mockResolvedValue({ ...user, email: "new@example.com" });

    const res = await request(app)
      .put("/api/auth/change-email")
      .set("Authorization", `Bearer ${KITCHEN_TOKEN}`)
      .send({ newEmail: "new@example.com", currentPassword: "correct" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
  });
});
