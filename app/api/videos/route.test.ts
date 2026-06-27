import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "./route";

const mockSession = vi.hoisted(() => ({
  ok: true as boolean,
  isAdmin: false as boolean,
  email: "user@example.com",
}));

const mockPrisma = vi.hoisted(() => ({
  video: {
    findMany: vi.fn().mockImplementation(async ({ where }) => {
      if (where?.isPublished === false) return [];
      return [
        {
          id: 1,
          title: "Pengantar TWK",
          description: null,
          youtubeId: "eRsGyueVLvQ",
          category: "TWK",
          durationSec: 888,
          sortOrder: 1,
          isPublished: true,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ];
    }),
  },
  userPurchase: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/routeAuth", () => ({
  requireActiveSession: vi.fn().mockImplementation(async () => {
    if (!mockSession.ok) {
      return {
        ok: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      };
    }
    return {
      ok: true,
      session: {
        user: {
          email: mockSession.email,
          role: mockSession.isAdmin ? "admin" : "user",
        },
      },
    };
  }),
}));
vi.mock("@/lib/deviceSession", async () => {
  const actual = await vi.importActual<typeof import("@/lib/deviceSession")>("@/lib/deviceSession");
  return {
    ...actual,
    isAdminRole: vi.fn().mockImplementation((role?: string | null) => role === "admin"),
  };
});

function resetSession(opts: { ok?: boolean; admin?: boolean; email?: string } = {}) {
  mockSession.ok = opts.ok ?? true;
  mockSession.isAdmin = opts.admin ?? false;
  mockSession.email = opts.email ?? "user@example.com";
}

function makeReq(): NextRequest {
  return {
    nextUrl: new URL("http://localhost/api/videos"),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

beforeEach(() => {
  mockPrisma.userPurchase.findFirst.mockReset();
});

describe("GET /api/videos", () => {
  it("returns 401 when no session", async () => {
    resetSession({ ok: false });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns hasAccess:false + empty list when no qualifying UserPurchase row", async () => {
    resetSession({ admin: false });
    mockPrisma.userPurchase.findFirst.mockResolvedValueOnce(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasAccess).toBe(false);
    expect(data.accessReason).toBe("no_video_package");
    expect(data.videos).toEqual([]);
  });

  it("returns hasAccess:true + published videos when a qualifying UserPurchase exists", async () => {
    resetSession({ admin: false });
    mockPrisma.userPurchase.findFirst.mockResolvedValueOnce({ id: "purchase-uuid-1" });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasAccess).toBe(true);
    expect(data.accessReason).toBeNull();
    expect(data.videos).toHaveLength(1);
    expect(data.videos[0].youtubeId).toBe("eRsGyueVLvQ");
  });

  it("returns hasAccess:true for admin without querying UserPurchase", async () => {
    resetSession({ admin: true });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasAccess).toBe(true);
    expect(data.accessReason).toBeNull();
    expect(data.videos).toHaveLength(1);
    // Admins must NOT trigger the purchase check.
    expect(mockPrisma.userPurchase.findFirst).not.toHaveBeenCalled();
  });
});
