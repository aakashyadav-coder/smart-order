/**
 * OTP Service — generates and sends OTP via Twilio
 * Falls back to console mock if Twilio credentials are not configured
 */
const { randomInt } = require("crypto");

const generateOTPCode = () => {
  return String(randomInt(100000, 1000000)); // 6-digit cryptographically secure OTP
};

/**
 * Send OTP SMS to customer
 * @param {string} phone - Customer phone number
 * @param {string} code - OTP code
 * @returns {Promise<boolean>} - success status
 */
const sendOTPSMS = async (phone, code) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

  // Use Twilio if credentials are configured
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    try {
      const twilio = require("twilio");
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

      await client.messages.create({
        body: `Your Smart Order OTP is: ${code}. Show this to the staff when collecting your order. Valid for 15 minutes.`,
        from: TWILIO_PHONE_NUMBER,
        to: phone,
      });

      console.log(`[OTP] SMS sent to ${phone}: ${code}`);
      return true;
    } catch (err) {
      console.error("[OTP] Twilio SMS failed:", err.message);
      throw new Error("Failed to send SMS. Please try again.");
    }
  }

  // Mock mode — log to console
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`[OTP MOCK] To: ${phone}`);
  console.log(`[OTP MOCK] Code: ${code}`);
  console.log("[OTP MOCK] (Configure Twilio credentials to send real SMS)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return true;
};

module.exports = { generateOTPCode, sendOTPSMS };
