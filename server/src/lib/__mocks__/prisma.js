/**
 * __mocks__/prisma.js — Vitest auto-mock for the Prisma client.
 * Every method defaults to vi.fn() returning undefined.
 * Tests can override with .mockResolvedValue() in beforeEach/it blocks.
 */
import { vi } from "vitest";

// Helper — makes a model with all methods as trackable vi.fn() stubs
const mockModel = (...methods) =>
  Object.fromEntries(
    methods.map((m) => [m, vi.fn().mockResolvedValue(undefined)])
  );

const prisma = {
  user:             mockModel("findUnique","findMany","create","update","updateMany","delete","count"),
  restaurant:       mockModel("findUnique","findMany","create","update","updateMany","delete","count"),
  order:            mockModel("findUnique","findMany","findFirst","create","update","count","aggregate","groupBy"),
  menuItem:         mockModel("findMany","findUnique","create","update","delete"),
  featureToggle:    mockModel("findUnique","create","upsert","update"),
  passwordResetOtp: mockModel("create","findFirst","update","updateMany"),
  activityLog:      mockModel("create","findMany"),
  supportTicket:    mockModel("findMany","create","update","delete","count"),
  announcement:     mockModel("findMany","create","delete"),
  $queryRaw:        vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  $transaction:     vi.fn().mockImplementation(async (fn) => {
    if (typeof fn === "function") return fn(prisma);
    return Promise.all(fn);
  }),
};

export default prisma;
