/**
 * Menu Controller — CRUD menu items (with restaurant scoping)
 */
const prisma = require("../lib/prisma");
const { logActivity } = require("../services/activityLogService");

// GET /api/menu?restaurantId=xxx
// B4 FIX: restaurantId is required — never fall back to first restaurant (multi-tenant data leak).
const getMenu = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ message: "restaurantId is required. Please use the QR code link." });
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
  } catch (err) { next(err); }
};

// POST /api/menu  — create a menu item (owner+)
const createMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, category, imageUrl, restaurantId, available } = req.body;
    if (!name || !price || !category || !restaurantId) {
      return res.status(400).json({ message: "name, price, category, restaurantId are required." });
    }
    const item = await prisma.menuItem.create({
      data: { name, description, price: parseFloat(price), category, imageUrl, restaurantId, available: available ?? true },
    });
    await logActivity({ userId: req.user?.id, action: "MENU_ITEM_CREATED", entity: "MenuItem", entityId: item.id, metadata: { name } });
    res.status(201).json(item);
  } catch (err) { next(err); }
};

// PUT /api/menu/:id — update a menu item (owner+)
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, imageUrl, available } = req.body;
    const data = {};
    if (name        !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price       !== undefined) data.price = parseFloat(price);
    if (category    !== undefined) data.category = category;
    if (imageUrl    !== undefined) data.imageUrl = imageUrl;
    if (available   !== undefined) data.available = available;

    const item = await prisma.menuItem.update({ where: { id }, data });
    await logActivity({ userId: req.user?.id, action: "MENU_ITEM_UPDATED", entity: "MenuItem", entityId: id });
    res.json(item);
  } catch (err) { next(err); }
};

// DELETE /api/menu/:id — delete a menu item (owner+)
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    await logActivity({ userId: req.user?.id, action: "MENU_ITEM_DELETED", entity: "MenuItem", entityId: id });
    res.json({ message: "Menu item deleted." });
  } catch (err) { next(err); }
};

module.exports = { getMenu, createMenuItem, updateMenuItem, deleteMenuItem };
