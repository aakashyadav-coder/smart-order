/**
 * Feature toggle controller — per-restaurant feature management
 */
const prisma = require("../lib/prisma");
const { logActivity } = require("../services/activityLogService");


// GET /api/features/:restaurantId
const getFeatures = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    let features = await prisma.featureToggle.findUnique({ where: { restaurantId } });

    // Auto-create if not present
    if (!features) {
      features = await prisma.featureToggle.create({ data: { restaurantId } });
    }
    res.json(features);
  } catch (err) { next(err); }
};

// PUT /api/features/:restaurantId
const updateFeatures = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { otpEnabled, paymentsEnabled, notificationsEnabled } = req.body;

    const features = await prisma.featureToggle.upsert({
      where: { restaurantId },
      create: { restaurantId, otpEnabled, paymentsEnabled, notificationsEnabled },
      update: {
        ...(otpEnabled           !== undefined && { otpEnabled }),
        ...(paymentsEnabled      !== undefined && { paymentsEnabled }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
      },
    });

    await logActivity({
      userId: req.user?.id,
      action: "FEATURE_TOGGLE_UPDATED",
      entity: "FeatureToggle",
      entityId: restaurantId,
      metadata: req.body,
    });

    res.json(features);
  } catch (err) { next(err); }
};

module.exports = { getFeatures, updateFeatures };
