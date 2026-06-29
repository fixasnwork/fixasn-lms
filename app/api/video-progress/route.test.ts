import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { PATCH } from "./route";

/* ── Hoisted mocks ──────────────────────────────────────────────── */
const mockSession = vi.hoisted(() => ({
  ok: true as boolean,
  email: "user@example.com",
  isAdmin: false as boolean,
}));

const mockState = vi.hoisted(() => ({
  video: { id: 42, isPublished: true, deletedAt: null } as
    | { id: number; isPublished: boolean; deletedAt: Date | null }
    | null,
  callerId: "user-uuid-1" as string | null,
  existing: null as
    | { watchedSeconds: number; completedAt: Date | null }
    | null,
}));

const mockPrisma = vi.hoisted(() => ({
  video: {
    findUnique: vi.fn().mockImplementation(async () => mockState.video),
  },
  user: {
    findUnique: vi.fn().mockImplementation(async () =>
      mockState.callerId ? { id: mockState.callerId } : null
    ),
  },
  videoProgress: {
    findUnique: vi.fn().mockImplementation(async () => mockState.existing),
    upsert: vi.fn().mockImplementation(
      async ({
        where,
        create,
        update,
      }: {
        where: { userId_videoId: { userId: string; videoId: number } };
        create: { userId: string; videoId: number; lastSecond: number; watchedSeconds: number; completedAt: Date | null };
        update: { lastSecond: number; watchedSeconds: number; completedAt: Date | null };
      }) => {
        const isNew = mockState.existing === null;
        const data = isNew ? create : update;
        return {
          userId: where.userId_videoId.userId,
          videoId: where.userId_videoId.videoId,
          lastSecond: data.lastSecond,
          watchedSeconds: data.watchedSeconds,
          completedAt: data.completedAt,
        };
      }
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

function makeReq(body: unknown): NextRequest {
  return {
    json: async () => body,
    nextUrl: new URL("http://localhost/api/video-progress"),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

beforeEach(() => {
  mockSession.ok = true;
  mockSession.email = "user@example.com";
  mockSession.isAdmin = false;
  mockState.video = { id: 42, isPublished: true, deletedAt: null };
  mockState.callerId = "user-uuid-1";
  mockState.existing = null;
  mockPrisma.video.findUnique.mockClear();
  mockPrisma.user.findUnique.mockClear();
  mockPrisma.videoProgress.findUnique.mockClear();
  mockPrisma.videoProgress.upsert.mockClear();
});

describe("PATCH /api/video-progress", () => {
  it("returns 401 when no session", async () => {
    mockSession.ok = false;
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 10 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when videoId is missing", async () => {
    const res = await PATCH(makeReq({ lastSecond: 10 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when videoId is not a positive integer", async () => {
    const res = await PATCH(makeReq({ videoId: 0, lastSecond: 10 }));
    expect(res.status).toBe(400);
    const res2 = await PATCH(makeReq({ videoId: -1, lastSecond: 10 }));
    expect(res2.status).toBe(400);
    const res3 = await PATCH(makeReq({ videoId: 1.5, lastSecond: 10 }));
    expect(res3.status).toBe(400);
  });

  it("returns 400 when lastSecond is negative", async () => {
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lastSecond is not an integer", async () => {
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 1.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when watchedSecondsDelta is negative", async () => {
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 10, watchedSecondsDelta: -5 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when video does not exist", async () => {
    mockState.video = null;
    const res = await PATCH(makeReq({ videoId: 999, lastSecond: 10 }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when non-admin user tries to write progress for a draft video", async () => {
    mockState.video = { id: 42, isPublished: false, deletedAt: null };
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 10 }));
    expect(res.status).toBe(404);
  });

  it("allows admin to write progress for a draft video", async () => {
    mockSession.isAdmin = true;
    mockState.video = { id: 42, isPublished: false, deletedAt: null };
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 10 }));
    expect(res.status).toBe(200);
  });

  it("returns 404 when caller User record is missing", async () => {
    mockState.callerId = null;
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 10 }));
    expect(res.status).toBe(404);
  });

  it("creates a new row with lastSecond + watchedSecondsDelta when no prior progress", async () => {
    mockState.existing = null;
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 30, watchedSecondsDelta: 30 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.progress.lastSecond).toBe(30);
    expect(data.progress.watchedSeconds).toBe(30);
    expect(data.progress.completedAt).toBeNull();
  });

  it("keeps watchedSeconds monotonic when a stale client tries to roll it back", async () => {
    mockState.existing = { watchedSeconds: 120, completedAt: null };
    // Client claims delta=5 (suspicious small delta), but the existing is
    // already 120; the server keeps the Math.max — no rollback.
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 50, watchedSecondsDelta: 5 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progress.watchedSeconds).toBe(125);
  });

  it("sets completedAt when completed: true on a fresh row", async () => {
    mockState.existing = null;
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 999, completed: true }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progress.completedAt).not.toBeNull();
  });

  it("does NOT set completedAt when completed is omitted", async () => {
    mockState.existing = null;
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 999 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progress.completedAt).toBeNull();
  });

  it("does NOT set completedAt when completed is false", async () => {
    mockState.existing = { watchedSeconds: 60, completedAt: null };
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 999, completed: false }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progress.completedAt).toBeNull();
  });

  it("preserves prior completedAt when a later PATCH omits completed", async () => {
    const priorCompleted = new Date("2026-06-15T10:00:00Z");
    mockState.existing = { watchedSeconds: 200, completedAt: priorCompleted };
    const res = await PATCH(makeReq({ videoId: 42, lastSecond: 50, watchedSecondsDelta: 10 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progress.completedAt).toBe(priorCompleted.toISOString());
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = {
      json: async () => { throw new Error("bad"); },
      nextUrl: new URL("http://localhost/api/video-progress"),
      cookies: { get: () => undefined },
    } as unknown as NextRequest;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
