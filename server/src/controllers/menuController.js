/**
 * Menu Controller — returns available menu items grouped by category
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// GET /api/menu
const getMenu = async (_req, res, next) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { available: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Group items by category
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({ categories: grouped, items });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMenu };
