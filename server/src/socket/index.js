/**
 * Socket.io event handler initialization
 * Manages kitchen room, owner room, customer order rooms
 */

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Super admin dashboard room
    socket.on("join_super_admin", () => {
      socket.join("super_admin");
      console.log(`[Socket] ${socket.id} joined super_admin room`);
    });

    // Owner room (for announcements + owner-specific notifications)
    socket.on("join_owner", ({ restaurantId }) => {
      socket.join("owners");
      if (restaurantId) {
        socket.join(`owner_${restaurantId}`);
        console.log(`[Socket] ${socket.id} joined owner_${restaurantId}`);
      }
    });

    // Kitchen staff join the kitchen room
    socket.on("join_kitchen", () => {
      socket.join("kitchen");
      console.log(`[Socket] ${socket.id} joined kitchen room`);
    });

    // Owner joins their restaurant room (for restaurant branding updates)
    socket.on("join_restaurant", ({ restaurantId }) => {
      if (restaurantId) {
        socket.join(`restaurant_${restaurantId}`);
        console.log(`[Socket] ${socket.id} joined restaurant_${restaurantId}`);
      }
    });

    // Customer joins a specific order room to track their order status
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

/** Emit new order to the kitchen room */
const emitNewOrder = (io, order) => {
  io.to("kitchen").emit("new_order", order);
  // Broadcast to restaurant-specific room (owner who joined via join_restaurant)
  if (order?.restaurantId) {
    io.to(`restaurant_${order.restaurantId}`).emit("new_order", order);
  }
  console.log(`[Socket] new_order → kitchen (Order #${order.id})`);
};

/** Emit order status update to kitchen room + specific order room */
const emitOrderStatusUpdate = (io, orderId, status, restaurantId) => {
  const payload = { orderId, status };
  // Broadcast to kitchen dashboard (kitchen staff + owner)
  io.to("kitchen").emit("order_status_update", payload);
  // Broadcast to restaurant-specific room (owner who joined via join_restaurant)
  if (restaurantId) {
    io.to(`restaurant_${restaurantId}`).emit("order_status_update", payload);
  }
  // Broadcast to customer's order tracking room
  io.to(`order_${orderId}`).emit("order_status_update", payload);
  console.log(`[Socket] order_status_update → kitchen + order_${orderId}: ${status}`);
};

/**
 * Emit restaurant branding update to kitchen + all restaurant members
 * Called when super admin changes restaurant name or logo
 */
const emitRestaurantUpdate = (io, restaurant) => {
  const payload = { id: restaurant.id, name: restaurant.name, logoUrl: restaurant.logoUrl };
  io.to("kitchen").emit("restaurant_updated", payload);
  io.to(`restaurant_${restaurant.id}`).emit("restaurant_updated", payload);
  console.log(`[Socket] restaurant_updated → kitchen + restaurant_${restaurant.id}: "${restaurant.name}"`);
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

