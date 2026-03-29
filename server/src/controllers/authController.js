/**
 * Auth Controller — login, me, token refresh
 * Fix R4/R5: Added refresh token endpoint + rememberMe support (30d token)
 * Fix R6: Added confirmPassword check before email change
 */
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { z }   = require("zod");
const { emitUserLastLogin } = require("../socket");
const logger  = require("../logger");

const prisma  = new PrismaClient();

const loginSchema = z.object({
  email:      z.string().email("Invalid email"),
  password:   z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const signAccess = (user, rememberMe = false) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, restaurantId: user.restaurantId },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? "30d" : "8h" }
  );

const signRefresh = (userId) =>
  jwt.sign({ id: userId, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: "30d" });

// Short-lived pre-auth token issued when TOTP challenge is required.
// Only valid for 5 minutes and cannot be used to access any API.
const signPreAuth = (userId) =>
  jwt.sign({ id: userId, type: "pre_auth" }, process.env.JWT_SECRET, { expiresIn: "5m" });

// ── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password." });

    if (!user.active) return res.status(403).json({ message: "Account is deactivated. Contact the administrator." });

    // ── TOTP challenge — if 2FA is enabled, don't issue JWT yet ────────────────
    if (user.totpEnabled) {
      const preAuthToken = signPreAuth(user.id);
      logger.info(`Login (TOTP required): ${user.email} (${user.role})`);
      return res.json({ requireTotp: true, preAuthToken });
    }

    const token        = signAccess(user, rememberMe);
    const refreshToken = signRefresh(user.id);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
      select: { id: true, lastLoginAt: true },
    });
    const io = req.app.get("io");
    if (io) emitUserLastLogin(io, { userId: updated.id, lastLoginAt: updated.lastLoginAt });

    logger.info(`Login: ${user.email} (${user.role}) rememberMe=${rememberMe}`);
    res.json({
      token,
      refreshToken,
      rememberMe,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurantId },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ message: "Validation failed", errors: err.flatten().fieldErrors });
    }
    next(err);
  }
};

// ── Refresh Access Token (Fix R4) ─────────────────────────────────────────────
// POST /api/auth/refresh  { refreshToken }
// Returns a new short-lived access token if the 30d refresh token is still valid.
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "refreshToken is required." });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token. Please log in again." });
    }

    if (payload.type !== "refresh") {
      return res.status(401).json({ message: "Invalid token type." });
    }

    const user = await prisma.user.findUnique({
      where:  { id: payload.id },
      select: { id: true, name: true, email: true, role: true, restaurantId: true, active: true },
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.active) return res.status(403).json({ message: "Account is deactivated." });

    const newToken = signAccess(user);
    logger.debug(`Token refreshed for user ${user.email}`);
    res.json({ token: newToken, user });
  } catch (err) { next(err); }
};

// ── Me (current user from token) ──────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, restaurantId: true, active: true },
    });
    if (!user)        return res.status(404).json({ message: "User not found." });
    if (!user.active) return res.status(403).json({ message: "Account is deactivated." });
    res.json(user);
  } catch (err) { next(err); }
};

// ── Change Email (Fix R6) ─────────────────────────────────────────────────────
// PUT /api/auth/change-email  { newEmail, currentPassword }
// Requires current password confirmation before updating email.
const changeEmail = async (req, res, next) => {
  try {
    const { newEmail, currentPassword } = req.body;
    if (!newEmail || !currentPassword) {
      return res.status(400).json({ message: "newEmail and currentPassword are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect." });

    const exists = await prisma.user.findUnique({ where: { email: newEmail } });
    if (exists && exists.id !== user.id) {
      return res.status(409).json({ message: "This email is already in use." });
    }

    await prisma.user.update({ where: { id: user.id }, data: { email: newEmail } });
    logger.info(`Email changed: ${user.email} → ${newEmail} (user ${user.id})`);
    res.json({ message: "Email updated successfully." });
  } catch (err) { next(err); }
};

// ── TOTP Login Verify ─────────────────────────────────────────────────────────
// POST /api/auth/totp-verify  { preAuthToken, code, rememberMe }
// Step 2 of login when totpEnabled=true. Validates the 6-digit authenticator
// code then issues the real access + refresh tokens.
const totpVerify = async (req, res, next) => {
  try {
    const { preAuthToken, code, rememberMe = false } = req.body;
    if (!preAuthToken || !code) {
      return res.status(400).json({ message: "preAuthToken and code are required." });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Code must be exactly 6 digits." });
    }

    // Verify the short-lived pre-auth token
    let payload;
    try {
      payload = jwt.verify(preAuthToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "2FA session expired. Please log in again." });
    }
    if (payload.type !== "pre_auth") {
      return res.status(401).json({ message: "Invalid token type." });
    }

    // Fetch fresh user data including TOTP secret
    const user = await prisma.user.findUnique({
      where:  { id: payload.id },
      select: { id: true, name: true, email: true, role: true, restaurantId: true,
                active: true, totpEnabled: true, totpSecret: true },
    });
    if (!user)        return res.status(404).json({ message: "User not found." });
    if (!user.active) return res.status(403).json({ message: "Account is deactivated." });
    if (!user.totpEnabled || !user.totpSecret) {
      return res.status(400).json({ message: "2FA is not enabled for this account." });
    }

    // Validate the 6-digit TOTP code (±1 window for clock drift)
    const OTPAuth = require("otpauth");
    const totp = new OTPAuth.TOTP({
      issuer: "SmartOrder", algorithm: "SHA1", digits: 6, period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
    });
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return res.status(401).json({ message: "Invalid or expired 2FA code. Please try again." });
    }

    // Issue full tokens now that both factors passed
    const token        = signAccess(user, rememberMe);
    const refreshToken = signRefresh(user.id);

    // Record login time & notify super admin dashboard
    const updated = await prisma.user.update({
      where:  { id: user.id },
      data:   { lastLoginAt: new Date() },
      select: { id: true, lastLoginAt: true },
    });
    const io = req.app.get("io");
    if (io) emitUserLastLogin(io, { userId: updated.id, lastLoginAt: updated.lastLoginAt });

    logger.info(`Login (TOTP verified): ${user.email} (${user.role}) rememberMe=${rememberMe}`);
    res.json({
      token,
      refreshToken,
      rememberMe,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurantId },
    });
  } catch (err) { next(err); }
};

module.exports = { login, me, refresh, changeEmail, totpVerify };
