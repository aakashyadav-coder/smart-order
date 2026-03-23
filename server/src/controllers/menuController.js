/**
 * Menu Controller — returns menu items scoped to a restaurant
 * GET /api/menu?restaurantId=xxx  — uses first restaurant as fallback
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getMenu = async (req, res, next) => {
  try {
    let { restaurantId } = req.query;

    // Fallback: use the first active restaurant if none specified
    if (!restaurantId) {
      const firstRestaurant = await prisma.restaurant.findFirst({
        where: { active: true },
        orderBy: { createdAt: "asc" },
      });
      if (!firstRestaurant) {
        return res.status(404).json({ message: "No restaurants found." });
      }
      restaurantId = firstRestaurant.id;
    }

    const items = await prisma.menuItem.findMany({
      where: { restaurantId, available: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({ restaurantId, categories: grouped, items });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMenu };
