import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mockPrisma = vi.hoisted(() => {
  const baseVideo = {
    id: 1,
    title: "Pengantar TWK",
    description: null,
    youtubeId: "eRsGyueVLvQ",
    category: "TWK",
    durationSec: 888,
    sortOrder: 1,
    isPublished: true,
    pdfUrl: null,
    pdfPageCount: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
  return {
    video: {
      findMany: vi.fn().mockResolvedValue([baseVideo]),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        ...baseVideo,
        ...data,
        description: data.description ?? null,
        durationSec: data.durationSec ?? null,
      })),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: vi.fn().mockResolvedValue(null) }));

function makePostReq(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    nextUrl: new URL("http://localhost/api/admin/videos"),
  } as unknown as NextRequest;
}

describe("GET /api/admin/videos", () => {
  it("returns all non-deleted videos including drafts", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.videos)).toBe(true);
    expect(data.videos[0].youtubeId).toBe("eRsGyueVLvQ");
  });
});

describe("POST /api/admin/videos", () => {
  it("returns 400 when title is missing", async () => {
    const res = await POST(makePostReq({ youtubeId: "eRsGyueVLvQ", category: "TWK" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is empty", async () => {
    const res = await POST(makePostReq({ title: "   ", youtubeId: "eRsGyueVLvQ", category: "TWK" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when youtubeId is invalid (12 chars silently rejected)", async () => {
    const res = await POST(makePostReq({ title: "x", youtubeId: "ABCDEFGHIJKL", category: "TWK" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when youtubeId is a URL with 12-char id (no silent truncation)", async () => {
    const res = await POST(
      makePostReq({ title: "x", youtubeId: "https://www.youtube.com/watch?v=ABCDEFGHIJKL", category: "TWK" })
    );
    expect(res.status).toBe(400);
  });

  it("accepts a full YouTube watch URL and stores the 11-char id", async () => {
    const res = await POST(
      makePostReq({ title: "x", youtubeId: "https://www.youtube.com/watch?v=eRsGyueVLvQ&t=10s", category: "TWK" })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.video.youtubeId).toBe("eRsGyueVLvQ");
  });

  it("returns 400 when category is not in the allowlist", async () => {
    const res = await POST(makePostReq({ title: "x", youtubeId: "eRsGyueVLvQ", category: "UMUM" }));
    expect(res.status).toBe(400);
  });

  it("accepts TWK / TIU / TKP", async () => {
    for (const cat of ["TWK", "TIU", "TKP"]) {
      const res = await POST(makePostReq({ title: "x", youtubeId: "eRsGyueVLvQ", category: cat }));
      expect(res.status).toBe(201);
    }
  });

  it("returns 400 when durationSec is negative", async () => {
    const res = await POST(
      makePostReq({ title: "x", youtubeId: "eRsGyueVLvQ", category: "TWK", durationSec: -5 })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when sortOrder is non-integer", async () => {
    const res = await POST(makePostReq({ title: "x", youtubeId: "eRsGyueVLvQ", category: "TWK", sortOrder: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when sortOrder is fractional", async () => {
    const res = await POST(makePostReq({ title: "x", youtubeId: "eRsGyueVLvQ", category: "TWK", sortOrder: 1.5 }));
    expect(res.status).toBe(400);
  });

  it("accepts valid sortOrder", async () => {
    const res = await POST(makePostReq({ title: "x", youtubeId: "eRsGyueVLvQ", category: "TWK", sortOrder: 5 }));
    expect(res.status).toBe(201);
  });

  it("accepts isPublished: 'true' (string) via Boolean coercion", async () => {
    const res = await POST(
      makePostReq({ title: "x", youtubeId: "eRsGyueVLvQ", category: "TWK", isPublished: "true" })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.video.isPublished).toBe(true);
  });

  it("creates a video with all fields", async () => {
    const res = await POST(
      makePostReq({
        title: "Pengantar TIU",
        description: "A long description",
        youtubeId: "aqz-KE-bpKQ",
        category: "TIU",
        durationSec: 600,
        sortOrder: 2,
        isPublished: true,
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.video.title).toBe("Pengantar TIU");
    expect(data.video.category).toBe("TIU");
    expect(data.video.youtubeId).toBe("aqz-KE-bpKQ");
    expect(data.video.isPublished).toBe(true);
    expect(data.video.durationSec).toBe(600);
    expect(data.video.sortOrder).toBe(2);
  });
});
