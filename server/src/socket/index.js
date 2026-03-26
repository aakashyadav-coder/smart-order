/**
 * Socket.io event handler initialization
 * Manages kitchen room, owner room, customer order rooms
 */

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

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

module.exports = { initSocket, emitNewOrder, emitOrderStatusUpdate, emitRestaurantUpdate };
