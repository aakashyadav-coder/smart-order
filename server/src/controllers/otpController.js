/**
 * OTP Controller — generate, send, and verify OTPs
 */
const prisma = require("../lib/prisma");
const { generateOTPCode, sendOTPSMS } = require("../services/otpService");

/**
 * POST /api/otp/send
 * Generate and send OTP to the customer linked to an order
 * Requires: { orderId }
 */
const sendOTP = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required." });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { otp: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Upsert OTP (replace if already exists for this order)
    const otp = await prisma.oTP.upsert({
      where: { orderId },
      create: { orderId, code, expiresAt },
      update: { code, expiresAt, verified: false },
    });

    // Send SMS (or mock)
    await sendOTPSMS(order.phone, code);

    res.json({
      message: "OTP sent successfully.",
      expiresAt: otp.expiresAt,
      // Only include code in dev mode for testing
      ...(process.env.NODE_ENV === "development" && { code }),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/otp/verify
 * Verify OTP submitted by customer
 * Requires: { orderId, code }
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { orderId, code } = req.body;

    if (!orderId || !code) {
      return res.status(400).json({ message: "orderId and code are required." });
    }

    const otp = await prisma.oTP.findUnique({ where: { orderId } });

    if (!otp) {
      return res.status(404).json({ message: "No OTP found for this order." });
    }

    if (otp.verified) {
      return res.status(400).json({ message: "OTP has already been used." });
    }

    if (new Date() > otp.expiresAt) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    if (otp.code !== code.trim()) {
      return res.status(400).json({ message: "Incorrect OTP." });
    }

    await prisma.oTP.update({
      where: { orderId },
      data: { verified: true },
    });

    res.json({ message: "OTP verified successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOTP, verifyOTP };
