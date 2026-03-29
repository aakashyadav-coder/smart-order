/**
 * Socket.io event handler initialization
 * Manages kitchen room, owner room, customer order rooms
 */

const jwt = require("jsonwebtoken");

/**
 * Socket.io JWT middleware — runs before every connection.
 * Clients must pass { auth: { token: "<JWT>" } } when calling io().
 * Customer order-tracking rooms are exempted (token optional).
 */
const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Allow connection without a token — but socket.user will be null.
    // Privileged room joins below will reject unauthenticated sockets.
    socket.user = null;
    return next();
  }
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Socket auth failed: invalid or expired token."));
  }
};

const PRIVILEGED_ROOMS = ["kitchen", "super_admin", "owners"];

const initSocket = (io) => {
  // Apply JWT auth middleware to every socket connection
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} (user: ${socket.user?.email ?? "guest"})`);

    // Super admin dashboard room — requires SUPER_ADMIN role
    socket.on("join_super_admin", () => {
      if (socket.user?.role !== "SUPER_ADMIN") {
        return socket.emit("error", { message: "Unauthorized: SUPER_ADMIN role required." });
      }
      socket.join("super_admin");
      console.log(`[Socket] ${socket.id} joined super_admin room`);
    });

    // Owner room — requires OWNER, ADMIN, or SUPER_ADMIN role
    socket.on("join_owner", ({ restaurantId } = {}) => {
      const allowed = ["SUPER_ADMIN", "OWNER", "ADMIN"];
      if (!socket.user || !allowed.includes(socket.user.role)) {
        return socket.emit("error", { message: "Unauthorized: Owner role required." });
      }
      socket.join("owners");
      // Prefer JWT restaurantId (authoritative) over client-supplied value
      const rid = socket.user.restaurantId || restaurantId;
      if (rid) {
        socket.join(`owner_${rid}`);
        socket.join(`restaurant_${rid}`);
        console.log(`[Socket] ${socket.id} joined owner_${rid} + restaurant_${rid}`);
      }
    });

    // Kitchen staff join the kitchen room — requires KITCHEN or above
    socket.on("join_kitchen", () => {
      const allowed = ["SUPER_ADMIN", "OWNER", "ADMIN", "KITCHEN"];
      if (!socket.user || !allowed.includes(socket.user.role)) {
        return socket.emit("error", { message: "Unauthorized: Kitchen role required." });
      }
      socket.join("kitchen");
      // Auto-join the restaurant room from the verified JWT — avoids a separate
      // client-side join_restaurant call and prevents joining the wrong restaurant.
      if (socket.user.restaurantId) {
        socket.join(`restaurant_${socket.user.restaurantId}`);
        console.log(`[Socket] ${socket.id} auto-joined restaurant_${socket.user.restaurantId} via join_kitchen`);
      } else {
        console.warn(`[Socket] ${socket.id} kitchen user has no restaurantId — order events will not be received`);
      }
      console.log(`[Socket] ${socket.id} joined kitchen room`);
    });

    // Owner joins their restaurant room — requires authenticated user
    socket.on("join_restaurant", ({ restaurantId }) => {
      if (!socket.user) {
        return socket.emit("error", { message: "Unauthorized: authentication required." });
      }
      if (restaurantId) {
        socket.join(`restaurant_${restaurantId}`);
        console.log(`[Socket] ${socket.id} joined restaurant_${restaurantId}`);
      }
    });

    // Customer joins a specific order room to track their order status
    // Public — no auth required (customers have no accounts)
    socket.on("join_order_room", ({ orderId }) => {
      if (orderId) {
        socket.join(`order_${orderId}`);
        console.log(`[Socket] ${socket.id} joined order room: order_${orderId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};


/** Emit new order — sent to restaurant_{id} room only.
 * Kitchen staff join this room via join_restaurant, so they receive it once.
 * Owners who called join_owner also receive it via the same room.
 * Emitting to both 'kitchen' AND restaurant_{id} would cause double delivery.
 */
const emitNewOrder = (io, order) => {
  if (order?.restaurantId) {
    io.to(`restaurant_${order.restaurantId}`).emit("new_order", order);
  }
  console.log(`[Socket] new_order → restaurant_${order?.restaurantId} (Order #${order?.id})`);
};

/** Emit order status update.
 * restaurant_{id} → kitchen staff + owner (authenticated, both are in this room)
 * order_{id}      → customer tracking page (public, unauthenticated)
 * NOT emitted to 'kitchen' room separately — kitchen staff are already in restaurant_{id}.
 */
const emitOrderStatusUpdate = (io, orderId, status, restaurantId) => {
  const payload = { orderId, status };
  if (restaurantId) {
    io.to(`restaurant_${restaurantId}`).emit("order_status_update", payload);
  }
  // Always notify the customer's order tracking page
  io.to(`order_${orderId}`).emit("order_status_update", payload);
  console.log(`[Socket] order_status_update → restaurant_${restaurantId} + order_${orderId}: ${status}`);
};

/** Emit restaurant branding update.
 * restaurant_{id} covers both kitchen staff and the owner — no need to also
 * emit to 'kitchen' room separately.
 */
const emitRestaurantUpdate = (io, restaurant) => {
  const payload = { id: restaurant.id, name: restaurant.name, logoUrl: restaurant.logoUrl };
  io.to(`restaurant_${restaurant.id}`).emit("restaurant_updated", payload);
  console.log(`[Socket] restaurant_updated → restaurant_${restaurant.id}: "${restaurant.name}"`);
};

/** Emit announcement to owners */
const emitAnnouncement = (io, announcement) => {
  if (announcement?.restaurantId) {
    io.to(`owner_${announcement.restaurantId}`).emit("announcement", announcement);
  } else {
    io.to("owners").emit("announcement", announcement);
  }
  console.log(`[Socket] announcement → owners${announcement?.restaurantId ? ` (owner_${announcement.restaurantId})` : ""}`);
};

/** Emit new support ticket to super admin */
const emitSupportTicket = (io, ticket) => {
  io.to("super_admin").emit("support_ticket_new", ticket);
  console.log(`[Socket] support_ticket_new → super_admin (Ticket #${ticket.id})`);
};

/** Emit user login update to super admin */
const emitUserLastLogin = (io, payload) => {
  io.to("super_admin").emit("user_last_login", payload);
  console.log(`[Socket] user_last_login → super_admin (User #${payload.userId})`);
};

module.exports = { initSocket, emitNewOrder, emitOrderStatusUpdate, emitRestaurantUpdate, emitAnnouncement, emitSupportTicket, emitUserLastLogin };

