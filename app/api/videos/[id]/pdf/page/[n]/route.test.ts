import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "./route";
import sharp from "sharp";

/* ── Hoisted mocks ──────────────────────────────────────────────── */
const mockSession = vi.hoisted(() => ({
  ok: true as boolean,
  email: "user@example.com",
  isAdmin: false as boolean,
}));

const mockState = vi.hoisted(() => ({
  video: null as
    | { id: number; pdfUrl: string | null; pdfPageCount: number | null }
    | null,
  hasAccess: true as boolean,
  fetched: null as Buffer | null,
  watermark: null as Buffer | null,
}));

const mockPrisma = vi.hoisted(() => ({
  video: {
    findFirst: vi.fn().mockImplementation(async () => mockState.video),
  },
  userPurchase: {
    findFirst: vi.fn().mockImplementation(async () =>
      mockState.hasAccess ? { id: "purchase-uuid-1" } : null
    ),
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
vi.mock("@/lib/supabaseStorage", () => ({
  fetchPagePng: vi.fn().mockImplementation(async () => mockState.fetched),
}));
vi.mock("@/lib/pdfWatermark", () => ({
  compositeWatermark: vi.fn().mockImplementation(async (b: Buffer) => mockState.watermark ?? b),
  WATERMARK_TEXT: "Copyright Fix ASN Property",
}));

function makeReq(id: string, n: string): NextRequest {
  return {
    nextUrl: new URL(`http://localhost/api/videos/${id}/pdf/page/${n}`),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

const paramsFor = (id: string, n: string) => ({ params: Promise.resolve({ id, n }) });

beforeEach(async () => {
  mockSession.ok = true;
  mockSession.email = "user@example.com";
  mockSession.isAdmin = false;
  mockState.video = { id: 42, pdfUrl: "uploads/videos/42/module.pdf", pdfPageCount: 5 };
  mockState.hasAccess = true;
  // Provide a tiny real PNG so compositeWatermark's optional fallback can pass it through.
  const tinyPng = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } })
    .png()
    .toBuffer();
  mockState.fetched = tinyPng;
  mockState.watermark = null; // means: pass through fetched unchanged
  mockPrisma.video.findFirst.mockClear();
  mockPrisma.userPurchase.findFirst.mockClear();
});

describe("GET /api/videos/[id]/pdf/page/[n]", () => {
  it("returns 401 when no session", async () => {
    mockSession.ok = false;
    const res = await GET(makeReq("42", "1"), paramsFor("42", "1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a positive integer", async () => {
    const res = await GET(makeReq("abc", "1"), paramsFor("abc", "1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when n is not a positive integer", async () => {
    const res = await GET(makeReq("42", "x"), paramsFor("42", "x"));
    expect(res.status).toBe(400);
    const res2 = await GET(makeReq("42", "0"), paramsFor("42", "0"));
    expect(res2.status).toBe(400);
  });

  it("returns 404 when video does not exist", async () => {
    mockState.video = null;
    const res = await GET(makeReq("42", "1"), paramsFor("42", "1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the video has no PDF", async () => {
    mockState.video = { id: 42, pdfUrl: null, pdfPageCount: null };
    const res = await GET(makeReq("42", "1"), paramsFor("42", "1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the page is out of range", async () => {
    const res = await GET(makeReq("42", "999"), paramsFor("42", "999"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the user has no video-package access", async () => {
    mockState.hasAccess = false;
    const res = await GET(makeReq("42", "1"), paramsFor("42", "1"));
    expect(res.status).toBe(403);
  });

  it("returns 200 PNG when access + page are valid", async () => {
    const res = await GET(makeReq("42", "1"), paramsFor("42", "1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toContain("private");
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
    const buf = Buffer.from(await res.arrayBuffer());
    // Either a real PNG (if watermark ran) or the passthrough PNG.
    expect(buf.length).toBeGreaterThan(0);
  });

  it("admins bypass the package gate", async () => {
    mockSession.isAdmin = true;
    mockState.hasAccess = false; // would be 403 for non-admin
    const res = await GET(makeReq("42", "1"), paramsFor("42", "1"));
    expect(res.status).toBe(200);
    // The UserPurchase query must not be called for admins.
    expect(mockPrisma.userPurchase.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the underlying storage object is missing", async () => {
    mockState.fetched = null;
    const res = await GET(makeReq("42", "1"), paramsFor("42", "1"));
    expect(res.status).toBe(404);
  });
});
