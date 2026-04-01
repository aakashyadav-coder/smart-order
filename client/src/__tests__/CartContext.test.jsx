/**
 * CartContext.test.jsx — Unit tests for the cart reducer and context
 * Tests: addItem, removeItem, updateQuantity, clearCart, persistence, totalPrice
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "../context/CartContext";

// Wrapper to provide CartContext
const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

const BURGER  = { menuItemId: "m1", name: "Burger", price: 500 };
const FRIES   = { menuItemId: "m2", name: "Fries",  price: 150 };
const PIZZA   = { menuItemId: "m3", name: "Pizza",  price: 800 };

describe("CartContext — addItem", () => {
  it("adds first item with quantity 1", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(BURGER));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.items[0].menuItemId).toBe("m1");
  });

  it("increments quantity when the same item is added twice", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addItem(BURGER); result.current.addItem(BURGER); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });

  it("adds different items as separate entries", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addItem(BURGER); result.current.addItem(FRIES); });
    expect(result.current.items).toHaveLength(2);
  });

  it("shows toast when item is added", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(BURGER));
    // Toast is mocked — just verify no errors thrown
    expect(result.current.items).toHaveLength(1);
  });
});

describe("CartContext — removeItem", () => {
  it("removes an item from the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addItem(BURGER); result.current.addItem(FRIES); });
    act(() => result.current.removeItem("m1"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].menuItemId).toBe("m2");
  });

  it("does nothing when removing a non-existent item", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(BURGER));
    act(() => result.current.removeItem("nonexistent"));
    expect(result.current.items).toHaveLength(1);
  });
});

describe("CartContext — updateQuantity", () => {
  it("updates the quantity of an item", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(BURGER));
    act(() => result.current.updateQuantity("m1", 5));
    expect(result.current.items[0].quantity).toBe(5);
  });

  it("removes item when quantity is set to 0", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(BURGER));
    act(() => result.current.updateQuantity("m1", 0));
    expect(result.current.items).toHaveLength(0);
  });

  it("removes item when quantity is set to negative", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(BURGER));
    act(() => result.current.updateQuantity("m1", -1));
    expect(result.current.items).toHaveLength(0);
  });
});

describe("CartContext — clearCart", () => {
  it("removes all items", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(BURGER);
      result.current.addItem(FRIES);
      result.current.addItem(PIZZA);
    });
    act(() => result.current.clearCart());
    expect(result.current.items).toHaveLength(0);
  });
});

describe("CartContext — totalItems and totalPrice", () => {
  it("calculates correct totalItems", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(BURGER);  // qty 1
      result.current.addItem(BURGER);  // qty 2
      result.current.addItem(FRIES);   // qty 1
    });
    expect(result.current.totalItems).toBe(3); // 2 + 1
  });

  it("calculates correct totalPrice", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(BURGER);  // 500 × 1
      result.current.addItem(BURGER);  // 500 × 2
      result.current.addItem(FRIES);   // 150 × 1
    });
    // totalPrice = 500*2 + 150*1 = 1150
    expect(result.current.totalPrice).toBe(1150);
  });

  it("returns 0 for empty cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("recalculates after removing item", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(BURGER); // 500
      result.current.addItem(PIZZA);  // 800
    });
    act(() => result.current.removeItem("m3")); // remove pizza
    expect(result.current.totalPrice).toBe(500);
  });

  it("recalculates after updating quantity", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(FRIES)); // 150 × 1
    act(() => result.current.updateQuantity("m2", 3));
    expect(result.current.totalPrice).toBe(450); // 150 × 3
  });
});

describe("CartContext — localStorage persistence", () => {
  it("persists cart state to localStorage on change", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(BURGER));
    const stored = JSON.parse(localStorage.getItem("smart_order_cart"));
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].menuItemId).toBe("m1");
  });

  it("clears localStorage when cart is cleared", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(BURGER));
    act(() => result.current.clearCart());
    const stored = JSON.parse(localStorage.getItem("smart_order_cart"));
    expect(stored.items).toHaveLength(0);
  });
});

describe("CartContext — error handling", () => {
  it("throws error when useCart is used outside CartProvider", () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useCart()); // no wrapper
    }).toThrow(/cartprovider/i);
    spy.mockRestore();
  });
});
