/**
 * Order Controller — create, list, and update orders
 * Emits Socket.io events on order creation and status update
 */
const prisma = require("../lib/prisma");
const { emitNewOrder, emitOrderStatusUpdate } = require("../socket");

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

    // Determine restaurant — restaurantId is REQUIRED for multi-tenant safety
    // We never fall back to "first active restaurant" as that sends orders to the wrong place
    if (!restaurantId) {
      return res.status(400).json({ message: "restaurantId is required. Please scan the QR code again." });
    }
    const resolvedRestaurantId = restaurantId;

    // Verify restaurant exists and is active
    const restaurant = await prisma.restaurant.findUnique({ where: { id: resolvedRestaurantId } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    if (!restaurant.active) return res.status(400).json({ message: "This restaurant is currently not accepting orders." });

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
    const { status, limit = 200 } = req.query;

    const where = {};

    // Scope to user's restaurant
    if (req.user?.role !== "SUPER_ADMIN") {
      const restaurantId = req.user?.restaurantId;
      if (restaurantId) {
        where.restaurantId = restaurantId;
      } else {
        // Reuse the module-level prisma instance — never create a new one per request
        const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { restaurantId: true } });
        if (dbUser?.restaurantId) where.restaurantId = dbUser.restaurantId;
      }

      // Kitchen/Owner: only load orders from the last 48 hours by default
      // This prevents loading hundreds of old orders on every mount
      if (!req.query.all) {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        where.createdAt = { gte: cutoff };
      }
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
  } catch (err) { next(err); }
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
 * S2 FIX: Non-super-admin users can only update orders belonging to their own restaurant.
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, estimatedMinutes, discount, discountedTotal } = req.body;

    const validStatuses = ["PENDING", "ACCEPTED", "PREPARING", "SERVED", "CANCELLED", "PAID"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    // S2 FIX: Verify the order belongs to the user's restaurant before mutating.
    if (req.user?.role !== "SUPER_ADMIN") {
      const existing = await prisma.order.findUnique({ where: { id }, select: { restaurantId: true } });
      if (!existing) return res.status(404).json({ message: "Order not found." });
      if (existing.restaurantId !== req.user?.restaurantId) {
        return res.status(403).json({ message: "Access denied. This order does not belong to your restaurant." });
      }
    }

    const updateData = { status };
    if (estimatedMinutes !== undefined) updateData.estimatedMinutes = parseInt(estimatedMinutes);
    if (discount        !== undefined) updateData.discount         = parseFloat(discount);
    if (discountedTotal !== undefined) updateData.discountedTotal  = parseFloat(discountedTotal);
    // Record exact served time for kitchen analytics accuracy
    if (status === "SERVED") updateData.servedAt = new Date();

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: { include: { menuItem: true } }, otp: true },
    });

    const io = req.app.get("io");
    emitOrderStatusUpdate(io, id, status, order.restaurantId);

    res.json(order);
  } catch (err) { next(err); }
};

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus };
