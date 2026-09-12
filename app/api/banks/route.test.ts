import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

const findMany = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/prisma", () => ({
  default: {
    bankAccount: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

function makeGetReq(url: string): NextRequest {
  return { nextUrl: new URL(url) } as unknown as NextRequest;
}

function makePostReq(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    nextUrl: new URL("http://localhost/api/banks"),
  } as unknown as NextRequest;
}

describe("POST /api/banks", () => {
  it("returns 400 when required fields missing", async () => {
    const response = await POST(makePostReq({}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("required");
  });

  it("returns 400 when bankName empty", async () => {
    const response = await POST(
      makePostReq({
        bankName: "",
        accountNumber: "123",
        accountHolder: "Test",
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /api/banks", () => {
  beforeEach(() => {
    findMany.mockClear();
  });

  it("returns banks (default scope), active only", async () => {
    findMany.mockResolvedValueOnce([
      {
        id: 1,
        bankName: "BCA",
        accountNumber: "1234567890",
        accountHolder: "FIX ASN",
        isActive: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ]);
    const response = await GET(makeGetReq("http://localhost/api/banks"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.banks).toHaveLength(1);
    expect(data.banks[0].bankName).toBe("BCA");
    // non-admin scope must filter to active accounts
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, isActive: true } }),
    );
  });

  it("returns all banks for admin scope", async () => {
    const response = await GET(
      makeGetReq("http://localhost/api/banks?scope=admin"),
    );
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
  });

  it("returns empty list when DB has no banks — no hardcoded fallback", async () => {
    findMany.mockResolvedValueOnce([]);
    const response = await GET(makeGetReq("http://localhost/api/banks"));
    const data = await response.json();
    expect(data.banks).toEqual([]);
    // only one findMany call — no auto-seed re-query
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
