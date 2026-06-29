import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "./route";

const mockSession = vi.hoisted(() => ({
  ok: true as boolean,
  email: "user@example.com",
}));

const mockState = vi.hoisted(() => ({
  callerId: "user-uuid-1" as string | null,
  row: null as
    | { lastSecond: number; watchedSeconds: number; completedAt: Date | null }
    | null,
}));

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn().mockImplementation(async () =>
      mockState.callerId ? { id: mockState.callerId } : null
    ),
  },
  videoProgress: {
    findUnique: vi.fn().mockImplementation(async () => mockState.row),
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
      session: { user: { email: mockSession.email } },
    };
  }),
}));

function makeReq(id: string): NextRequest {
  return {
    nextUrl: new URL(`http://localhost/api/videos/${id}/progress`),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mockSession.ok = true;
  mockSession.email = "user@example.com";
  mockState.callerId = "user-uuid-1";
  mockState.row = null;
  mockPrisma.user.findUnique.mockClear();
  mockPrisma.videoProgress.findUnique.mockClear();
});

describe("GET /api/videos/[id]/progress", () => {
  it("returns 401 when no session", async () => {
    mockSession.ok = false;
    const res = await GET(makeReq("42"), paramsFor("42"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a positive integer", async () => {
    const res = await GET(makeReq("abc"), paramsFor("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when caller User record is missing", async () => {
    mockState.callerId = null;
    const res = await GET(makeReq("42"), paramsFor("42"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with progress: null when no progress row exists", async () => {
    // The "no progress yet" case is not an error — we return 200 with
    // an explicit null so the client doesn't have to special-case 404.
    mockState.row = null;
    const res = await GET(makeReq("42"), paramsFor("42"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ progress: null });
  });

  it("returns the caller's progress, scoped to the requesting user", async () => {
    mockState.row = {
      lastSecond: 120,
      watchedSeconds: 240,
      completedAt: new Date("2026-06-20T10:00:00Z"),
    };
    const res = await GET(makeReq("42"), paramsFor("42"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progress.lastSecond).toBe(120);
    expect(data.progress.watchedSeconds).toBe(240);
    expect(data.progress.completedAt).toBe("2026-06-20T10:00:00.000Z");

    // Verify the query scoped by userId + videoId
    const callArgs = mockPrisma.videoProgress.findUnique.mock.calls[0][0];
    expect(callArgs.where.userId_videoId.userId).toBe("user-uuid-1");
    expect(callArgs.where.userId_videoId.videoId).toBe(42);
  });
});
