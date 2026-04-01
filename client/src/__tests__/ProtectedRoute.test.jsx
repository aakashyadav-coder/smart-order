/**
 * ProtectedRoute.test.jsx — Route guard tests for all three portal guards
 * Tests: ProtectedRoute, OwnerRoute, SuperAdminRoute
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ProtectedRoute  from "../components/ProtectedRoute";
import OwnerRoute      from "../components/OwnerRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";

// ── Mock useAuth ──────────────────────────────────────────────────────────────
// We need fine-grained control per test, so we mock the module and override per test.
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// ── Mock socket to avoid real connections ─────────────────────────────────────
vi.mock("../lib/socket", () => ({ default: { disconnect: vi.fn(), connect: vi.fn() } }));
vi.mock("../lib/api",    () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import { useAuth } from "../context/AuthContext";

// Helper: render a route guard and check if the child or redirect is shown
function renderGuard(GuardComponent, child = <div>Protected Content</div>) {
  return render(
    <MemoryRouter>
      <GuardComponent>{child}</GuardComponent>
    </MemoryRouter>
  );
}

// ── ProtectedRoute ─────────────────────────────────────────────────────────────
describe("ProtectedRoute", () => {
  it("shows loading spinner when auth is loading", () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: true });
    renderGuard(ProtectedRoute);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects to /kitchen/login when not authenticated", () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false });
    renderGuard(ProtectedRoute);
    // Children should NOT be rendered
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects CUSTOMER role (no role) to /kitchen/login", () => {
    useAuth.mockReturnValue({ user: { role: undefined }, isAuthenticated: true, loading: false });
    renderGuard(ProtectedRoute);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("allows KITCHEN role access", () => {
    useAuth.mockReturnValue({ user: { role: "KITCHEN" }, isAuthenticated: true, loading: false });
    renderGuard(ProtectedRoute);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("allows OWNER role access to kitchen dashboard", () => {
    useAuth.mockReturnValue({ user: { role: "OWNER" }, isAuthenticated: true, loading: false });
    renderGuard(ProtectedRoute);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("allows SUPER_ADMIN role access to kitchen dashboard", () => {
    useAuth.mockReturnValue({ user: { role: "SUPER_ADMIN" }, isAuthenticated: true, loading: false });
    renderGuard(ProtectedRoute);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});

// ── OwnerRoute ─────────────────────────────────────────────────────────────────
describe("OwnerRoute", () => {
  it("shows loading spinner when auth is loading", () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: true });
    renderGuard(OwnerRoute);
    // Loading state renders a spinner, not content
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects KITCHEN role to /owner/login", () => {
    useAuth.mockReturnValue({ user: { role: "KITCHEN" }, isAuthenticated: true, loading: false });
    renderGuard(OwnerRoute);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated user to /owner/login", () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false });
    renderGuard(OwnerRoute);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("allows OWNER role access", () => {
    useAuth.mockReturnValue({ user: { role: "OWNER" }, isAuthenticated: true, loading: false });
    renderGuard(OwnerRoute);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("allows ADMIN role access", () => {
    useAuth.mockReturnValue({ user: { role: "ADMIN" }, isAuthenticated: true, loading: false });
    renderGuard(OwnerRoute);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("allows SUPER_ADMIN role access to owner routes", () => {
    useAuth.mockReturnValue({ user: { role: "SUPER_ADMIN" }, isAuthenticated: true, loading: false });
    renderGuard(OwnerRoute);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});

// ── SuperAdminRoute ────────────────────────────────────────────────────────────
describe("SuperAdminRoute", () => {
  it("shows loading spinner when auth is loading", () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: true });
    renderGuard(SuperAdminRoute);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects OWNER role to /super/login", () => {
    useAuth.mockReturnValue({ user: { role: "OWNER" }, isAuthenticated: true, loading: false });
    renderGuard(SuperAdminRoute);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects KITCHEN role to /super/login", () => {
    useAuth.mockReturnValue({ user: { role: "KITCHEN" }, isAuthenticated: true, loading: false });
    renderGuard(SuperAdminRoute);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated user to /super/login", () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false });
    renderGuard(SuperAdminRoute);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("allows SUPER_ADMIN role access", () => {
    useAuth.mockReturnValue({ user: { role: "SUPER_ADMIN" }, isAuthenticated: true, loading: false });
    renderGuard(SuperAdminRoute);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("denies even ADMIN role from super admin routes", () => {
    useAuth.mockReturnValue({ user: { role: "ADMIN" }, isAuthenticated: true, loading: false });
    renderGuard(SuperAdminRoute);
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
