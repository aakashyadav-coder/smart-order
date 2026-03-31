/**
 * Activity Log service — records audit trail events
 */
const prisma = require("../lib/prisma");

/**
 * @param {object} opts
 * @param {string} [opts.userId]
 * @param {string} opts.action   - e.g. "ORDER_STATUS_UPDATE"
 * @param {string} [opts.entity] - e.g. "Order"
 * @param {string} [opts.entityId]
 * @param {object} [opts.metadata]
 * @param {string} [opts.ipAddress]
 */
const logActivity = async ({ userId, action, entity, entityId, metadata, ipAddress } = {}) => {
  try {
    await prisma.activityLog.create({
      data: { userId: userId || null, action, entity, entityId, metadata, ipAddress },
    });
  } catch (err) {
    // Non-critical — never let logging break the main flow
    console.error("[ActivityLog] Failed to log:", err.message);
  }
};

module.exports = { logActivity };
