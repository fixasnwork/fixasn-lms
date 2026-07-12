import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock handles ───────────────────────────────────────────
const {
	mockRequireActiveSession,
	mockGetTryoutRanking,
	mockGetUserTryoutRank,
	mockPeriodSince,
	mockWithTtlCache,
	mockCount,
} = vi.hoisted(() => ({
	mockRequireActiveSession: vi.fn(),
	mockGetTryoutRanking: vi.fn(),
	mockGetUserTryoutRank: vi.fn(),
	mockPeriodSince: vi.fn(),
	mockWithTtlCache: vi.fn(),
	mockCount: vi.fn(),
}));

vi.mock("@/lib/routeAuth", () => ({
	requireActiveSession: () => mockRequireActiveSession(),
}));

vi.mock("@/lib/ranking", async () => {
	const actual =
		await vi.importActual<typeof import("@/lib/ranking")>("@/lib/ranking");
	return {
		...actual,
		getTryoutRanking: mockGetTryoutRanking,
		getUserTryoutRank: mockGetUserTryoutRank,
		periodSince: mockPeriodSince,
		withTtlCache: (key: string, _ttl: number, compute: () => unknown) => {
			mockWithTtlCache(key);
			return compute();
		},
	};
});

vi.mock("@/lib/prisma", () => ({
	default: {
		tryoutAttempt: { count: mockCount },
	},
}));

const SESSION = {
	user: { email: "viewer@test.id", name: "Viewer", role: "user" },
	expires: "2099-01-01",
};

function makeReq(period: string | null): NextRequest {
	// The URL is a hardcoded literal so it cannot throw, but the ast-grep
	// linter flags `new URL()` as a throwing call. Wrap in try/catch to
	// satisfy the rule and keep the helper safe if the literal ever
	// becomes a variable.
	let url: URL;
	try {
		url = new URL("http://localhost/api/tryouts/42/ranking");
	} catch {
		throw new Error("test setup: invalid URL literal");
	}
	if (period) url.searchParams.set("period", period);
	return { nextUrl: url } as unknown as NextRequest;
}

function makeParams(tryoutId: string) {
	return Promise.resolve({ tryoutId });
}

describe("GET /api/tryouts/[tryoutId]/ranking", () => {
	let GET: (
		req: NextRequest,
		ctx: { params: Promise<{ tryoutId: string }> },
	) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockRequireActiveSession.mockResolvedValue({ ok: true, session: SESSION });
		mockCount.mockResolvedValue(1);
		mockGetTryoutRanking.mockResolvedValue([
			{
				userId: "u-a",
				name: "Andi",
				avatar: null,
				initials: "AN",
				totalScore: 385,
				tryoutCount: 1,
				packages: "",
			},
		]);
		mockGetUserTryoutRank.mockResolvedValue({ rank: 1, score: 385 });
		mockPeriodSince.mockReturnValue(undefined);
		const mod = await import("./route");
		GET = mod.GET;
	});

	it("returns 401 when requireActiveSession rejects", async () => {
		mockRequireActiveSession.mockResolvedValue({
			ok: false,
			response: new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
			}),
		});
		const res = await GET(makeReq("all"), { params: makeParams("42") });
		expect(res.status).toBe(401);
	});

	it("returns 400 when tryoutId is not a positive integer", async () => {
		const res = await GET(makeReq("all"), { params: makeParams("abc") });
		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toMatch(/Invalid tryoutId/);
	});

	it("returns 400 when tryoutId is negative", async () => {
		const res = await GET(makeReq("all"), { params: makeParams("-1") });
		expect(res.status).toBe(400);
	});

	it("returns 403 when the viewer has no finished attempt for the tryout", async () => {
		mockCount.mockResolvedValue(0);
		const res = await GET(makeReq("all"), { params: makeParams("42") });
		expect(res.status).toBe(403);
		const data = await res.json();
		expect(data.error).toMatch(/finish this tryout/i);
	});

	it("returns 200 with entries, viewer, participantCount, and period=all by default", async () => {
		const res = await GET(makeReq(null), { params: makeParams("42") });
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.entries).toEqual([
			expect.objectContaining({ userId: "u-a", totalScore: 385 }),
		]);
		expect(data.viewer).toEqual({ rank: 1, score: 385 });
		expect(data.participantCount).toBe(1);
		expect(data.period).toBe("all");
	});

	it('normalises invalid period to "all"', async () => {
		const res = await GET(makeReq("garbage"), { params: makeParams("42") });
		const data = await res.json();
		expect(data.period).toBe("all");
	});

	it("passes period=weekly to helpers and echoes it back", async () => {
		const since = new Date("2026-06-25T00:00:00Z");
		mockPeriodSince.mockReturnValue(since);
		const res = await GET(makeReq("weekly"), { params: makeParams("42") });
		const data = await res.json();
		expect(data.period).toBe("weekly");
		expect(mockGetTryoutRanking).toHaveBeenCalledWith(42, since);
		expect(mockGetUserTryoutRank).toHaveBeenCalledWith(
			"viewer@test.id",
			42,
			since,
		);
	});

	it("passes period=monthly to helpers and echoes it back", async () => {
		const since = new Date("2026-06-02T00:00:00Z");
		mockPeriodSince.mockReturnValue(since);
		const res = await GET(makeReq("monthly"), { params: makeParams("42") });
		const data = await res.json();
		expect(data.period).toBe("monthly");
		expect(mockGetTryoutRanking).toHaveBeenCalledWith(42, since);
	});

	it("returns viewer: null when the viewer is not in the ranking (defensive)", async () => {
		mockGetUserTryoutRank.mockResolvedValue(null);
		const res = await GET(makeReq("all"), { params: makeParams("42") });
		const data = await res.json();
		expect(data.viewer).toBeNull();
	});

	it("participantCount matches entries.length", async () => {
		mockGetTryoutRanking.mockResolvedValue([
			{
				userId: "a",
				name: "A",
				avatar: null,
				initials: "A",
				totalScore: 300,
				tryoutCount: 1,
				packages: "",
			},
			{
				userId: "b",
				name: "B",
				avatar: null,
				initials: "B",
				totalScore: 250,
				tryoutCount: 1,
				packages: "",
			},
			{
				userId: "c",
				name: "C",
				avatar: null,
				initials: "C",
				totalScore: 200,
				tryoutCount: 1,
				packages: "",
			},
		]);
		const res = await GET(makeReq("all"), { params: makeParams("42") });
		const data = await res.json();
		expect(data.participantCount).toBe(3);
	});

	it("checks viewer access via a count query before calling the ranking helpers", async () => {
		await GET(makeReq("all"), { params: makeParams("42") });
		// The access count is called once with the right filter
		expect(mockCount).toHaveBeenCalledTimes(1);
		expect(mockCount).toHaveBeenCalledWith({
			where: {
				tryoutId: 42,
				userId: "viewer@test.id",
				deletedAt: null,
				finishedAt: { not: null },
			},
		});
	});

	it("uses withTtlCache to wrap the helpers and the access check", async () => {
		await GET(makeReq("all"), { params: makeParams("42") });
		const keys = mockWithTtlCache.mock.calls.map((c) => c[0]);
		expect(keys).toEqual(
			expect.arrayContaining([
				"tryout-access:42:viewer@test.id",
				"tryout-ranking:42:period:all",
				"tryout-viewer-rank:42:period:all:viewer@test.id",
			]),
		);
	});

	it("skips the access check call signature noise — re-uses cached result within TTL (covered by withTtlCache tests)", async () => {
		// Sanity: the access check IS the only prisma call. Ranking helpers
		// run, but never hit prisma themselves in this test (they are mocked).
		await GET(makeReq("all"), { params: makeParams("42") });
		expect(mockGetTryoutRanking).toHaveBeenCalledTimes(1);
		expect(mockGetUserTryoutRank).toHaveBeenCalledTimes(1);
	});
});
