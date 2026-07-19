import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "./route";

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
		createdAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
		deletedAt: null,
	};
	return {
		video: {
			findFirst: vi.fn().mockImplementation(async ({ where }) => {
				if (where.id === 1) return baseVideo;
				return null;
			}),
			update: vi.fn().mockImplementation(async ({ where, data }) => ({
				...baseVideo,
				...(data as Record<string, unknown>),
				id: where.id,
				updatedAt: new Date("2026-06-27T00:00:00Z"),
			})),
		},
		videoProgress: {
			deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
		},
	};
});

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/adminAuth", () => ({
	requireAdmin: vi.fn().mockResolvedValue(null),
}));

function safeUrl(s: string): URL {
	try {
		return new URL(s);
	} catch {
		return new URL("http://localhost/");
	}
}

function makeReq(): NextRequest {
	return {
		nextUrl: safeUrl("http://localhost/api/admin/videos/1"),
	} as unknown as NextRequest;
}
function makePutReq(body: Record<string, unknown>): NextRequest {
	return {
		json: async () => body,
		nextUrl: safeUrl("http://localhost/api/admin/videos/1"),
	} as unknown as NextRequest;
}
function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

describe("GET /api/admin/videos/[id]", () => {
	it("returns the video when it exists", async () => {
		const res = await GET(makeReq(), makeParams("1"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.video.id).toBe(1);
	});

	it("returns 404 when video does not exist", async () => {
		const res = await GET(makeReq(), makeParams("999"));
		expect(res.status).toBe(404);
	});

	it("returns 400 when id is not a positive integer", async () => {
		const res = await GET(makeReq(), makeParams("abc"));
		expect(res.status).toBe(400);
	});
});

describe("PUT /api/admin/videos/[id]", () => {
	it("updates the title", async () => {
		const res = await PUT(makePutReq({ title: "Updated" }), makeParams("1"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.video.title).toBe("Updated");
	});

	it("rejects empty title", async () => {
		const res = await PUT(makePutReq({ title: "  " }), makeParams("1"));
		expect(res.status).toBe(400);
	});

	it("rejects invalid category", async () => {
		const res = await PUT(makePutReq({ category: "UMUM" }), makeParams("1"));
		expect(res.status).toBe(400);
	});

	it("rejects invalid youtubeId", async () => {
		const res = await PUT(
			makePutReq({ youtubeId: "ABCDEFGHIJKL" }),
			makeParams("1"),
		);
		expect(res.status).toBe(400);
	});

	it("resets video progress when youtubeId changes", async () => {
		const res = await PUT(
			makePutReq({ youtubeId: "dQw4w9WgXcQ" }),
			makeParams("1"),
		);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.video.youtubeId).toBe("dQw4w9WgXcQ");
		expect(data.progressReset).toBe(true);
		expect(mockPrisma.videoProgress.deleteMany).toHaveBeenCalledWith({
			where: { videoId: 1 },
		});
	});

	it("does not reset progress when youtubeId unchanged", async () => {
		const res = await PUT(
			makePutReq({ title: "Just a title update" }),
			makeParams("1"),
		);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.progressReset).toBeUndefined();
	});

	it("rejects negative durationSec", async () => {
		const res = await PUT(makePutReq({ durationSec: -1 }), makeParams("1"));
		expect(res.status).toBe(400);
	});

	it("rejects non-integer sortOrder", async () => {
		const res = await PUT(makePutReq({ sortOrder: 1.5 }), makeParams("1"));
		expect(res.status).toBe(400);
	});

	it("returns 404 when video does not exist", async () => {
		const res = await PUT(makePutReq({ title: "x" }), makeParams("999"));
		expect(res.status).toBe(404);
	});
});

describe("DELETE /api/admin/videos/[id]", () => {
	it("soft-deletes an existing video", async () => {
		const res = await DELETE(makeReq(), makeParams("1"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.success).toBe(true);
	});

	it("returns 404 when video does not exist", async () => {
		const res = await DELETE(makeReq(), makeParams("999"));
		expect(res.status).toBe(404);
	});

	it("returns 400 when id is not a positive integer", async () => {
		const res = await DELETE(makeReq(), makeParams("0"));
		expect(res.status).toBe(400);
	});
});
