/**
 * tokenFactory.js — generates signed JWTs for test users.
 * Uses the same JWT_SECRET as the app (set in setup.js).
 */

import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export function makeToken(overrides = {}) {
  const defaults = {
    id:           "user-test-id",
    email:        "test@example.com",
    role:         "KITCHEN",
    name:         "Test User",
    restaurantId: "restaurant-test-id",
  };
  return jwt.sign({ ...defaults, ...overrides }, SECRET, { expiresIn: "1h" });
}

export function makeRefreshToken(userId = "user-test-id") {
  return jwt.sign({ id: userId, type: "refresh" }, SECRET, { expiresIn: "30d" });
}

export function makePreAuthToken(userId = "user-test-id") {
  return jwt.sign({ id: userId, type: "pre_auth" }, SECRET, { expiresIn: "5m" });
}

export function makeResetToken(email = "test@example.com") {
  return jwt.sign({ email, type: "password_reset" }, SECRET, { expiresIn: "15m" });
}

export function makeExpiredToken(overrides = {}) {
  const defaults = { id: "user-test-id", role: "KITCHEN" };
  return jwt.sign({ ...defaults, ...overrides }, SECRET, { expiresIn: "-1s" });
}

// Convenience tokens for each role
export const SUPER_TOKEN  = makeToken({ id: "super-id",   role: "SUPER_ADMIN",  restaurantId: null });
export const OWNER_TOKEN  = makeToken({ id: "owner-id",   role: "OWNER",        restaurantId: "rest-a" });
export const KITCHEN_TOKEN = makeToken({ id: "kitchen-id", role: "KITCHEN",      restaurantId: "rest-a" });
export const KITCHEN_B_TOKEN = makeToken({ id: "kitchen-b-id", role: "KITCHEN",  restaurantId: "rest-b" });
