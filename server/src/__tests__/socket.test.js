/**
 * socket.test.js — Unit tests for Socket.io event logic
 *
 * Strategy: We do NOT spin up a real HTTP server. Instead:
 *  - The emit helpers (emitNewOrder, etc.) are pure functions that take `io` — we pass a stub.
 *  - The initSocket handler logic is tested by manually calling socket.on() callbacks
 *    with a fake socket object.
 *
 * This gives fast, reliable coverage of all business logic without requiring
 * an actual socket.io connection or network.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Import socket functions ────────────────────────────────────────────────────
// These are CJS, but Vitest handles the interop automatically.
import {
  emitNewOrder,
  emitOrderStatusUpdate,
  emitRestaurantUpdate,
  emitAnnouncement,
  emitSupportTicket,
  emitUserLastLogin,
  initSocket,
} from "../socket/index.js";

// ── Helper: build a stub io instance ─────────────────────────────────────────
function makeIo() {
  const rooms = {};
  const io = {
    to: vi.fn((room) => ({
      emit: vi.fn((event, payload) => {
        rooms[room] = rooms[room] || [];
        rooms[room].push({ event, payload });
      }),
    })),
    _rooms: rooms,
    use:    vi.fn(),
    on:     vi.fn(),
  };
  return io;
}

// ── Helper: build a fake socket ───────────────────────────────────────────────
function makeSocket(userOverrides = {}) {
  const handlers = {};
  return {
    user:      userOverrides === null ? null : { id: "u1", email: "k@test.com", role: "KITCHEN", restaurantId: "rest-1", ...userOverrides },
    id:        "socket-test-id",
    handshake: { auth: { token: "fake-token" } },
    join:      vi.fn(),
    emit:      vi.fn(),
    on:        vi.fn((event, cb) => { handlers[event] = cb; }),
    _trigger:  (event, ...args) => handlers[event]?.(...args),
  };
}

// ── Emit Helper Tests ──────────────────────────────────────────────────────────

describe("emitNewOrder", () => {
  it("emits new_order to restaurant_{id} room", () => {
    const io = makeIo();
    const order = { id: "o1", restaurantId: "rest-1", customerName: "Priya" };
    emitNewOrder(io, order);
    expect(io.to).toHaveBeenCalledWith("restaurant_rest-1");
    const room = io.to.mock.results[0].value;
    expect(room.emit).toHaveBeenCalledWith("new_order", order);
  });

  it("does not emit if order has no restaurantId", () => {
    const io = makeIo();
    emitNewOrder(io, { id: "o2" }); // no restaurantId
    expect(io.to).not.toHaveBeenCalledWith(expect.stringContaining("restaurant_"));
  });
});

describe("emitOrderStatusUpdate", () => {
  it("emits to restaurant room for kitchen/owner dashboards", () => {
    const io = makeIo();
    emitOrderStatusUpdate(io, "order-1", "ACCEPTED", "rest-1");
    expect(io.to).toHaveBeenCalledWith("restaurant_rest-1");
  });

  it("always emits to order_{id} for customer tracking", () => {
    const io = makeIo();
    emitOrderStatusUpdate(io, "order-1", "ACCEPTED", "rest-1");
    expect(io.to).toHaveBeenCalledWith("order_order-1");
  });

  it("emits correct payload with orderId and status", () => {
    const io = makeIo();
    emitOrderStatusUpdate(io, "order-99", "SERVED", "rest-x");
    const orderRoomCall = io.to.mock.calls.find(c => c[0] === "order_order-99");
    expect(orderRoomCall).toBeTruthy();
    const emitFn = io.to.mock.results[io.to.mock.calls.indexOf(orderRoomCall)].value.emit;
    expect(emitFn).toHaveBeenCalledWith("order_status_update", { orderId: "order-99", status: "SERVED" });
  });

  it("still emits to order room even without restaurantId", () => {
    const io = makeIo();
    emitOrderStatusUpdate(io, "order-x", "CANCELLED", null);
    // Should NOT emit to restaurant room
    const restaurantCalls = io.to.mock.calls.filter(c => c[0].startsWith("restaurant_"));
    expect(restaurantCalls).toHaveLength(0);
    // Should still emit to order room
    expect(io.to).toHaveBeenCalledWith("order_order-x");
  });
});

describe("emitRestaurantUpdate", () => {
  it("emits restaurant_updated to restaurant_{id} room", () => {
    const io = makeIo();
    emitRestaurantUpdate(io, { id: "rest-1", name: "Cafe Test", logoUrl: null });
    expect(io.to).toHaveBeenCalledWith("restaurant_rest-1");
    const emitFn = io.to.mock.results[0].value.emit;
    expect(emitFn).toHaveBeenCalledWith("restaurant_updated", {
      id: "rest-1", name: "Cafe Test", logoUrl: null,
    });
  });
});

describe("emitAnnouncement", () => {
  it("emits to specific owner_{restaurantId} when restaurantId is set", () => {
    const io = makeIo();
    emitAnnouncement(io, { id: "ann-1", title: "Test", restaurantId: "rest-1" });
    expect(io.to).toHaveBeenCalledWith("owner_rest-1");
    const emitFn = io.to.mock.results[0].value.emit;
    expect(emitFn).toHaveBeenCalledWith("announcement", expect.objectContaining({ title: "Test" }));
  });

  it("broadcasts to all owners room when restaurantId is null (platform-wide)", () => {
    const io = makeIo();
    emitAnnouncement(io, { id: "ann-2", title: "Platform Update", restaurantId: null });
    expect(io.to).toHaveBeenCalledWith("owners");
  });
});

describe("emitSupportTicket", () => {
  it("emits support_ticket_new to super_admin room", () => {
    const io = makeIo();
    emitSupportTicket(io, { id: "ticket-1", subject: "Help!" });
    expect(io.to).toHaveBeenCalledWith("super_admin");
    const emitFn = io.to.mock.results[0].value.emit;
    expect(emitFn).toHaveBeenCalledWith("support_ticket_new", { id: "ticket-1", subject: "Help!" });
  });
});

describe("emitUserLastLogin", () => {
  it("emits user_last_login to super_admin room", () => {
    const io = makeIo();
    const payload = { userId: "u-1", lastLoginAt: new Date().toISOString() };
    emitUserLastLogin(io, payload);
    expect(io.to).toHaveBeenCalledWith("super_admin");
    const emitFn = io.to.mock.results[0].value.emit;
    expect(emitFn).toHaveBeenCalledWith("user_last_login", payload);
  });
});

// ── Room Join Auth Tests ────────────────────────────────────────────────────────

describe("initSocket — join_super_admin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows SUPER_ADMIN to join super_admin room", () => {
    const io = makeIo();
    const socket = makeSocket({ role: "SUPER_ADMIN" });
    initSocket(io);
    // Simulate the connection callback
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_super_admin");
    expect(socket.join).toHaveBeenCalledWith("super_admin");
    expect(socket.emit).not.toHaveBeenCalledWith("error", expect.anything());
  });

  it("rejects KITCHEN role from super_admin room", () => {
    const io = makeIo();
    const socket = makeSocket({ role: "KITCHEN" });
    initSocket(io);
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_super_admin");
    expect(socket.join).not.toHaveBeenCalledWith("super_admin");
    expect(socket.emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: expect.stringMatching(/SUPER_ADMIN/i) }));
  });
});

describe("initSocket — join_kitchen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("KITCHEN role joins kitchen room and auto-joins restaurant room", () => {
    const io = makeIo();
    const socket = makeSocket({ role: "KITCHEN", restaurantId: "rest-1" });
    initSocket(io);
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_kitchen");
    expect(socket.join).toHaveBeenCalledWith("kitchen");
    expect(socket.join).toHaveBeenCalledWith("restaurant_rest-1");
  });

  it("unauthenticated socket is rejected from kitchen room", () => {
    const io = makeIo();
    const socket = makeSocket(null); // user = null
    socket.user = null;
    initSocket(io);
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_kitchen");
    expect(socket.join).not.toHaveBeenCalledWith("kitchen");
    expect(socket.emit).toHaveBeenCalledWith("error", expect.anything());
  });
});

describe("initSocket — join_restaurant (S4 cross-tenant fix)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows user to join their own restaurant room", () => {
    const io = makeIo();
    const socket = makeSocket({ role: "OWNER", restaurantId: "rest-a" });
    initSocket(io);
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_restaurant", { restaurantId: "rest-a" });
    expect(socket.join).toHaveBeenCalledWith("restaurant_rest-a");
    expect(socket.emit).not.toHaveBeenCalledWith("error", expect.anything());
  });

  it("✅ S4 FIX: rejects user trying to join another restaurant's room", () => {
    const io = makeIo();
    const socket = makeSocket({ role: "OWNER", restaurantId: "rest-a" });
    initSocket(io);
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_restaurant", { restaurantId: "rest-b" }); // wrong restaurant
    expect(socket.join).not.toHaveBeenCalledWith("restaurant_rest-b");
    expect(socket.emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: expect.stringMatching(/unauthorized/i) }));
  });

  it("SUPER_ADMIN can join any restaurant room for monitoring", () => {
    const io = makeIo();
    const socket = makeSocket({ role: "SUPER_ADMIN", restaurantId: null });
    initSocket(io);
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_restaurant", { restaurantId: "rest-x" });
    expect(socket.join).toHaveBeenCalledWith("restaurant_rest-x");
  });

  it("unauthenticated socket is rejected from any restaurant room", () => {
    const io = makeIo();
    const socket = makeSocket(null);
    socket.user = null;
    initSocket(io);
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_restaurant", { restaurantId: "rest-a" });
    expect(socket.emit).toHaveBeenCalledWith("error", expect.anything());
  });
});

describe("initSocket — join_order_room (public)", () => {
  it("customer can join an order room without auth", () => {
    const io = makeIo();
    const socket = makeSocket(null);
    socket.user = null;
    initSocket(io);
    const connectionCb = io.on.mock.calls.find(c => c[0] === "connection")?.[1];
    if (connectionCb) connectionCb(socket);
    socket._trigger("join_order_room", { orderId: "order-123" });
    expect(socket.join).toHaveBeenCalledWith("order_order-123");
  });
});
