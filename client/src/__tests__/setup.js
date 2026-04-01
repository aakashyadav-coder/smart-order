/**
 * Test setup for React component tests.
 * - Imports jest-dom matchers (toBeInTheDocument, etc.)
 * - Mocks browser APIs not available in jsdom
 * - Mocks axios globally so no real HTTP requests are made
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";

// ── Mock axios globally ────────────────────────────────────────────────────────
vi.mock("axios", () => {
  const mockAxios = {
    get:     vi.fn().mockResolvedValue({ data: {} }),
    post:    vi.fn().mockResolvedValue({ data: {} }),
    put:     vi.fn().mockResolvedValue({ data: {} }),
    patch:   vi.fn().mockResolvedValue({ data: {} }),
    delete:  vi.fn().mockResolvedValue({ data: {} }),
    create:  vi.fn().mockReturnThis(),
    defaults: { baseURL: "http://localhost:5001" },
    interceptors: {
      request:  { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };
  return { default: mockAxios };
});

// ── Mock socket.io-client ─────────────────────────────────────────────────────
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on:         vi.fn(),
    off:        vi.fn(),
    emit:       vi.fn(),
    disconnect: vi.fn(),
    connect:    vi.fn(),
    connected:  true,
  })),
}));

// ── Mock react-hot-toast ──────────────────────────────────────────────────────
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error:   vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error:   vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// ── Mock sonner ───────────────────────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error:   vi.fn(),
    info:    vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

// ── Mock localStorage ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key) => store[key] || null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ── Mock window.matchMedia ────────────────────────────────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches:             false,
    media:               query,
    onchange:            null,
    addListener:         vi.fn(),
    removeListener:      vi.fn(),
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent:       vi.fn(),
  })),
});

// ── Mock ResizeObserver ───────────────────────────────────────────────────────
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe:   vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// ── Clean up after each test ──────────────────────────────────────────────────
import { afterEach } from "vitest";
import { cleanup }   from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorageMock.clear();
  vi.clearAllMocks();
});
