/**
 * Test global setup — loaded before all test files via setupFiles in vitest.config.js.
 *
 * Key strategy: Mock @prisma/client so `new PrismaClient()` returns stubs.
 * Since controllers use CJS require() and prisma.js uses a global singleton,
 * we also delete global.prisma before/after to force re-initialisation with stub.
 */

import { vi, beforeAll, afterAll } from "vitest";

// ── Environment variables ──────────────────────────────────────────────────────
process.env.JWT_SECRET   = "test-super-secret-jwt-key-for-testing-only";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NODE_ENV     = "test";

// ── Clear the CJS prisma singleton ────────────────────────────────────────────
beforeAll(() => { delete global.prisma; });
afterAll(()  => { delete global.prisma; });

// ── Build a mock Prisma model with all common methods ─────────────────────────
function mockModel() {
  return {
    findUnique:  vi.fn().mockResolvedValue(null),
    findMany:    vi.fn().mockResolvedValue([]),
    findFirst:   vi.fn().mockResolvedValue(null),
    create:      vi.fn().mockResolvedValue({}),
    update:      vi.fn().mockResolvedValue({}),
    updateMany:  vi.fn().mockResolvedValue({ count: 0 }),
    upsert:      vi.fn().mockResolvedValue({}),
    delete:      vi.fn().mockResolvedValue({}),
    count:       vi.fn().mockResolvedValue(0),
    aggregate:   vi.fn().mockResolvedValue({ _sum: {} }),
    groupBy:     vi.fn().mockResolvedValue([]),
  };
}

// ── Mock @prisma/client so `new PrismaClient()` returns our stub ───────────────
vi.mock("@prisma/client", () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      user:             mockModel(),
      restaurant:       mockModel(),
      order:            mockModel(),
      menuItem:         mockModel(),
      featureToggle:    mockModel(),
      passwordResetOtp: mockModel(),
      activityLog:      mockModel(),
      supportTicket:    mockModel(),
      announcement:     mockModel(),
      $queryRaw:        vi.fn().mockResolvedValue([{ "?column?": 1 }]),
      $transaction:     vi.fn().mockResolvedValue([]),
      $disconnect:      vi.fn(),
    })),
    Prisma: {
      PrismaClientKnownRequestError: class extends Error {},
    },
  };
});

// ── Mock SendGrid ─────────────────────────────────────────────────────────────
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send:      vi.fn().mockResolvedValue([{ statusCode: 202 }]),
  },
}));
