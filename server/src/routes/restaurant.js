/**
 * GET /api/restaurant/mine
 * Returns the current user's restaurant info (name, logoUrl, features)
 * Accessible by any authenticated user who has a restaurantId in their JWT
 */
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const { restaurantId } = req.user;
    if (!restaurantId) {
      return res.status(404).json({ message: "No restaurant associated with this account." });
    }
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, logoUrl: true, address: true, phone: true, active: true, features: true },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    res.json(restaurant);
  } catch (err) { next(err); }
});

module.exports = router;
