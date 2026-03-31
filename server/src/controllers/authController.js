/**
 * Auth Controller — login, me, token refresh
 * Fix R4/R5: Added refresh token endpoint + rememberMe support (30d token)
 * Fix R6: Added confirmPassword check before email change
 */
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const prisma  = require("../lib/prisma");
const { z }   = require("zod");
const { emitUserLastLogin } = require("../socket");
const logger  = require("../logger");

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

// ── SendGrid Setup ────────────────────────────────────────────────────────────
const sgMail = require("@sendgrid/mail");

const buildOtpEmail = (otp) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#be123c,#e11d48);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Smart Order</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Password Reset</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;color:#374151;font-size:16px;font-weight:600;">Your one-time code</p>
            <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
              Use the code below to reset your password. It expires in <strong>10 minutes</strong>.
            </p>
            <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
              <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#be123c;">${otp}</span>
            </div>
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email.
              Your password will remain unchanged.<br><br>
              — The Smart Order Team
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;color:#d1d5db;font-size:11px;">© 2026 CodeYatra PVT.LTD. All Rights Reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Forgot Password — Step 1: Send OTP ───────────────────────────────────────
// POST /api/auth/forgot-password  { email }
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    // Always respond success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return res.json({ message: "If that email exists, an OTP has been sent." });
    }

    // Expire all previous OTPs for this email
    await prisma.passwordResetOtp.updateMany({
      where: { email, used: false },
      data:  { used: true },
    });

    // Generate a 6-digit OTP
    const otp     = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.passwordResetOtp.create({ data: { email, otpHash, expiresAt } });

    // Check if SendGrid is configured
    const sendgridConfigured = process.env.SENDGRID_API_KEY;

    if (sendgridConfigured) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        from:    process.env.SENDGRID_FROM_EMAIL || "info.codeyatra@gmail.com",
        to:      email,
        subject: `${otp} — Your Smart Order password reset code`,
        html:    buildOtpEmail(otp),
      });
      logger.info(`Password reset OTP sent to ${email} via SendGrid`);
    } else {
      // Dev fallback: log to console
      logger.warn(`[DEV] SMTP not configured — OTP for ${email}: ${otp}`);
      console.log(`\n🔑  [DEV MODE] Password reset OTP for ${email}: ${otp}\n`);
    }

    res.json({ message: "If that email exists, an OTP has been sent." });
  } catch (err) { next(err); }
};

// ── Forgot Password — Step 2: Verify OTP ─────────────────────────────────────
// POST /api/auth/verify-reset-otp  { email, otp }
// Returns a short-lived password reset token on success.
const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be 6 digits." });
    }

    // Find the most recent unexpired, unused OTP for this email
    const record = await prisma.passwordResetOtp.findFirst({
      where: { email, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return res.status(400).json({ message: "OTP is invalid or has expired. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, record.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });
    }

    // Mark OTP as used
    await prisma.passwordResetOtp.update({ where: { id: record.id }, data: { used: true } });

    // Issue a short-lived password reset token (15 min)
    const resetToken = jwt.sign(
      { email, type: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    logger.info(`Password reset OTP verified for ${email}`);
    res.json({ resetToken });
  } catch (err) { next(err); }
};

// ── Forgot Password — Step 3: Reset Password ─────────────────────────────────
// POST /api/auth/reset-password  { resetToken, newPassword }
const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: "resetToken and newPassword are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Reset session expired. Please start again." });
    }
    if (payload.type !== "password_reset") {
      return res.status(401).json({ message: "Invalid token type." });
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user || !user.active) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    logger.info(`Password reset completed for ${payload.email}`);
    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (err) { next(err); }
};

module.exports = { login, me, refresh, changeEmail, totpVerify, forgotPassword, verifyResetOtp, resetPassword };
