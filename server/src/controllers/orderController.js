/**
 * Order Controller — create, list, and update orders
 * Emits Socket.io events on order creation and status update
 */
const { PrismaClient } = require("@prisma/client");
const { emitNewOrder, emitOrderStatusUpdate } = require("../socket");

const prisma = new PrismaClient();

/**
 * POST /api/orders
 * Place a new order (public, no auth required)
 */
const createOrder = async (req, res, next) => {
  try {
    const { customerName, phone, tableNumber, items, restaurantId } = req.body;

    // Basic validation
    if (!customerName || !phone || !tableNumber || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required order fields." });
    }

    // Determine restaurant — fall back to first active restaurant
    let resolvedRestaurantId = restaurantId;
    if (!resolvedRestaurantId) {
      const first = await prisma.restaurant.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
      if (!first) return res.status(400).json({ message: "No active restaurant found." });
      resolvedRestaurantId = first.id;
    }

    // Calculate total price from DB prices (don't trust client-sent prices)
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, available: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({ message: "One or more menu items are unavailable." });
    }

    const menuItemMap = Object.fromEntries(menuItems.map((m) => [m.id, m]));

    const orderItemsData = items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: menuItemMap[item.menuItemId].price,
    }));

    const totalPrice = orderItemsData.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        customerName: customerName.trim(),
        phone: phone.trim(),
        tableNumber: parseInt(tableNumber),
        totalPrice,
        restaurantId: resolvedRestaurantId,
        items: { create: orderItemsData },
      },
      include: { items: { include: { menuItem: true } } },
    });

    // Notify kitchen in real-time
    const io = req.app.get("io");
    emitNewOrder(io, order);

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders
 * Get all orders for kitchen dashboard (authenticated)
 * Supports ?status= filter and ?limit=
 */
const getOrders = async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;

    // Scope to user's restaurant (kitchen/owner) unless super admin
    const where = {};
    if (req.user?.role !== "SUPER_ADMIN" && req.user?.restaurantId) {
      where.restaurantId = req.user.restaurantId;
    }
    if (status) where.status = status.toUpperCase();

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { menuItem: true } },
        otp: true,
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:id
 * Get a single order by ID (public — for customer tracking)
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
      },
    });
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json(order);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/orders/:id/status
 * Update order status (authenticated kitchen/admin)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, estimatedMinutes } = req.body;

    const validStatuses = ["PENDING", "ACCEPTED", "PREPARING", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const updateData = { status };
    if (estimatedMinutes !== undefined) {
      updateData.estimatedMinutes = parseInt(estimatedMinutes);
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: { include: { menuItem: true } }, otp: true },
    });

    // Notify customer in real-time
    const io = req.app.get("io");
    emitOrderStatusUpdate(io, id, status);

    res.json(order);
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus };
