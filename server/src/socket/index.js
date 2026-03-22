/**
 * Socket.io event handler initialization
 * Manages kitchen room and customer order rooms
 */

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Kitchen staff join a dedicated room to receive all new orders
    socket.on("join_kitchen", () => {
      socket.join("kitchen");
      console.log(`[Socket] ${socket.id} joined kitchen room`);
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

/**
 * Emit a new order event to the kitchen room
 * @param {object} io - Socket.io server instance
 * @param {object} order - The newly created order object
 */
const emitNewOrder = (io, order) => {
  io.to("kitchen").emit("new_order", order);
  console.log(`[Socket] Emitted new_order to kitchen (Order #${order.id})`);
};

/**
 * Emit order status update to a specific order room (customer)
 * @param {object} io - Socket.io server instance
 * @param {string} orderId - The order ID
 * @param {string} status - New status string
 */
const emitOrderStatusUpdate = (io, orderId, status) => {
  io.to(`order_${orderId}`).emit("order_status_update", { orderId, status });
  console.log(`[Socket] Emitted order_status_update to order_${orderId}: ${status}`);
};

module.exports = { initSocket, emitNewOrder, emitOrderStatusUpdate };
