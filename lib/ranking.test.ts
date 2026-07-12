import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Prisma mock ──────────────────────────────────────────────────────
const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
	default: {
		tryoutAttempt: { findMany: mockFindMany },
	},
}));

import {
	getUserRank,
	getTryoutRanking,
	getUserTryoutRank,
	periodSince,
	withTtlCache,
	__resetRankingCache,
} from "./ranking";

const SESSION_DATE = new Date("2026-06-27T10:00:00Z");

function attempt(
	overrides: Partial<{
		userId: string;
		tryoutId: number;
		totalScore: number;
		updatedAt: Date;
		createdAt: Date;
	}>,
) {
	return {
		userId: "u-default",
		tryoutId: 1,
		totalScore: 0,
		updatedAt: SESSION_DATE,
		createdAt: SESSION_DATE,
		...overrides,
	};
}

describe("getUserRank", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when the user has no attempts at all", async () => {
		mockFindMany.mockResolvedValue([]);
		const result = await getUserRank("u-me");
		expect(result).toBeNull();
	});

	it("returns null when only other users have attempts", async () => {
		mockFindMany.mockResolvedValue([
			attempt({ userId: "u-other", tryoutId: 1, totalScore: 100 }),
		]);
		const result = await getUserRank("u-me");
		expect(result).toBeNull();
	});

	it("single user with one attempt → rank 1", async () => {
		mockFindMany.mockResolvedValue([
			attempt({ userId: "u-me", tryoutId: 1, totalScore: 80 }),
		]);
		const result = await getUserRank("u-me");
		expect(result).toEqual({ rank: 1, totalScore: 80, tryoutCount: 1 });
	});

	it("sums max totalScore per tryoutId for the user", async () => {
		mockFindMany.mockResolvedValue([
			// tryout 1 — best 80 wins
			attempt({ userId: "u-me", tryoutId: 1, totalScore: 60 }),
			attempt({ userId: "u-me", tryoutId: 1, totalScore: 80 }),
			// tryout 2 — best 90 wins
			attempt({ userId: "u-me", tryoutId: 2, totalScore: 90 }),
			attempt({ userId: "u-me", tryoutId: 2, totalScore: 70 }),
		]);
		const result = await getUserRank("u-me");
		expect(result).toEqual({ rank: 1, totalScore: 170, tryoutCount: 2 });
	});

	it("ranks me behind users with strictly higher scores", async () => {
		mockFindMany.mockResolvedValue([
			attempt({ userId: "u-me", tryoutId: 1, totalScore: 100 }),
			attempt({ userId: "u-a", tryoutId: 1, totalScore: 200 }),
			attempt({ userId: "u-b", tryoutId: 1, totalScore: 150 }),
		]);
		const result = await getUserRank("u-me");
		expect(result?.rank).toBe(3);
		expect(result?.totalScore).toBe(100);
	});

	it("breaks ties on earliest updatedAt — earlier wins", async () => {
		mockFindMany.mockResolvedValue([
			// u-me: score 100, updated LATE
			attempt({
				userId: "u-me",
				tryoutId: 1,
				totalScore: 100,
				updatedAt: new Date("2026-06-27T12:00:00Z"),
			}),
			// u-tied: score 100, updated EARLIER → should beat me
			attempt({
				userId: "u-tied",
				tryoutId: 1,
				totalScore: 100,
				updatedAt: new Date("2026-06-27T08:00:00Z"),
			}),
			// u-low: score 50 → below me
			attempt({ userId: "u-low", tryoutId: 1, totalScore: 50 }),
		]);
		const result = await getUserRank("u-me");
		expect(result?.rank).toBe(2);
	});

	it("earliest updatedAt among many attempts of the same user is the tie-breaker", async () => {
		mockFindMany.mockResolvedValue([
			// u-me: first attempt at 09:00, second at 13:00 → tie-breaker = 09:00
			attempt({
				userId: "u-me",
				tryoutId: 1,
				totalScore: 100,
				updatedAt: new Date("2026-06-27T13:00:00Z"),
			}),
			attempt({
				userId: "u-me",
				tryoutId: 1,
				totalScore: 100,
				updatedAt: new Date("2026-06-27T09:00:00Z"),
			}),
			// u-tied: same total 100, earliest 10:00 → u-me wins
			attempt({
				userId: "u-tied",
				tryoutId: 1,
				totalScore: 100,
				updatedAt: new Date("2026-06-27T10:00:00Z"),
			}),
		]);
		const result = await getUserRank("u-me");
		expect(result?.rank).toBe(1);
	});

	it("honors the `since` filter when computing rank", async () => {
		const since = new Date("2026-06-01T00:00:00Z");
		mockFindMany.mockResolvedValue([
			// The query is built with a createdAt >= since where clause.
			attempt({
				userId: "u-me",
				tryoutId: 1,
				totalScore: 200,
				createdAt: new Date("2026-06-15T00:00:00Z"),
			}),
		]);
		const result = await getUserRank("u-me", since);
		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					deletedAt: null,
					createdAt: { gte: since },
				}),
			}),
		);
		expect(result?.rank).toBe(1);
		expect(result?.totalScore).toBe(200);
	});
});

// ── getTryoutRanking ─────────────────────────────────────────────────

function tryoutAttempt(
	overrides: Partial<{
		userId: string;
		tryoutId: number;
		totalScore: number;
		finishedAt: Date | null;
		deletedAt: Date | null;
		user: { id: string; name: string; avatar: string | null; email: string };
	}>,
) {
	return {
		userId: "u-default",
		tryoutId: 1,
		totalScore: 0,
		finishedAt: SESSION_DATE,
		deletedAt: null,
		user: {
			id: "u-default",
			name: "Default",
			avatar: null,
			email: "u-default@x",
		},
		...overrides,
	};
}

describe("getTryoutRanking", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns empty array when no finished attempts", async () => {
		mockFindMany.mockResolvedValue([]);
		const result = await getTryoutRanking(42);
		expect(result).toEqual([]);
	});

	it("keeps the max totalScore per user for the tryout", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-a",
				tryoutId: 42,
				totalScore: 200,
				finishedAt: new Date("2026-06-01T00:00:00Z"),
			}),
			tryoutAttempt({
				userId: "u-a",
				tryoutId: 42,
				totalScore: 250,
				finishedAt: new Date("2026-06-02T00:00:00Z"),
			}),
			tryoutAttempt({
				userId: "u-a",
				tryoutId: 42,
				totalScore: 220,
				finishedAt: new Date("2026-06-03T00:00:00Z"),
			}),
		]);
		const result = await getTryoutRanking(42);
		expect(result).toHaveLength(1);
		expect(result[0].userId).toBe("u-a");
		expect(result[0].totalScore).toBe(250);
		expect(result[0].tryoutCount).toBe(1);
	});

	it("orders by score descending", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-low",
				tryoutId: 42,
				totalScore: 100,
				finishedAt: new Date("2026-06-01T00:00:00Z"),
			}),
			tryoutAttempt({
				userId: "u-high",
				tryoutId: 42,
				totalScore: 300,
				finishedAt: new Date("2026-06-01T00:00:00Z"),
			}),
			tryoutAttempt({
				userId: "u-mid",
				tryoutId: 42,
				totalScore: 200,
				finishedAt: new Date("2026-06-01T00:00:00Z"),
			}),
		]);
		const result = await getTryoutRanking(42);
		expect(result.map((e) => e.userId)).toEqual(["u-high", "u-mid", "u-low"]);
		expect(result.map((e) => e.totalScore)).toEqual([300, 200, 100]);
	});

	it("breaks ties by earliest finishedAt (earlier wins)", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-late",
				tryoutId: 42,
				totalScore: 100,
				finishedAt: new Date("2026-06-05T00:00:00Z"),
			}),
			tryoutAttempt({
				userId: "u-early",
				tryoutId: 42,
				totalScore: 100,
				finishedAt: new Date("2026-06-01T00:00:00Z"),
			}),
		]);
		const result = await getTryoutRanking(42);
		expect(result.map((e) => e.userId)).toEqual(["u-early", "u-late"]);
	});

	it("excludes deleted attempts (filtered at the query layer)", async () => {
		// The route/prisma where clause filters deletedAt=null. The helper just
		// trusts the rows it gets. Verify the helper passes the right filter
		// through, which excludes deleted attempts upstream.
		const since = new Date("2026-06-01T00:00:00Z");
		mockFindMany.mockResolvedValue([]);
		await getTryoutRanking(42, since);
		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tryoutId: 42,
					deletedAt: null,
					finishedAt: { not: null, gte: since },
				}),
			}),
		);
	});

	it("maps name + initials from the user relation", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-x",
				tryoutId: 42,
				totalScore: 100,
				finishedAt: new Date("2026-06-01T00:00:00Z"),
				user: {
					id: "u-x",
					name: "Budi Santoso",
					avatar: "https://x/a.jpg",
					email: "budi@x",
				},
			}),
		]);
		const result = await getTryoutRanking(42);
		expect(result[0].name).toBe("Budi Santoso");
		expect(result[0].initials).toBe("BS");
		expect(result[0].avatar).toBe("https://x/a.jpg");
	});
});

// ── getUserTryoutRank ────────────────────────────────────────────────

describe("getUserTryoutRank", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when no attempts at all", async () => {
		mockFindMany.mockResolvedValue([]);
		const result = await getUserTryoutRank("u-me", 42);
		expect(result).toBeNull();
	});

	it("returns null when the user has no finished attempt for the tryout", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-other",
				tryoutId: 42,
				totalScore: 200,
				finishedAt: SESSION_DATE,
			}),
		]);
		const result = await getUserTryoutRank("u-me", 42);
		expect(result).toBeNull();
	});

	it("returns rank 1 for the only finisher", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-me",
				tryoutId: 42,
				totalScore: 250,
				finishedAt: SESSION_DATE,
			}),
		]);
		const result = await getUserTryoutRank("u-me", 42);
		expect(result).toEqual({ rank: 1, score: 250 });
	});

	it("counts users with strictly higher scores ahead of me", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-me",
				tryoutId: 42,
				totalScore: 200,
				finishedAt: SESSION_DATE,
			}),
			tryoutAttempt({
				userId: "u-a",
				tryoutId: 42,
				totalScore: 300,
				finishedAt: SESSION_DATE,
			}),
			tryoutAttempt({
				userId: "u-b",
				tryoutId: 42,
				totalScore: 250,
				finishedAt: SESSION_DATE,
			}),
		]);
		const result = await getUserTryoutRank("u-me", 42);
		expect(result).toEqual({ rank: 3, score: 200 });
	});

	it("breaks ties by earliest finishedAt (earlier wins → ranks ahead)", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-me",
				tryoutId: 42,
				totalScore: 100,
				finishedAt: new Date("2026-06-05T00:00:00Z"),
			}),
			tryoutAttempt({
				userId: "u-tied",
				tryoutId: 42,
				totalScore: 100,
				finishedAt: new Date("2026-06-01T00:00:00Z"),
			}),
		]);
		const result = await getUserTryoutRank("u-me", 42);
		// u-tied has earlier finishedAt → ranks ahead of me
		expect(result).toEqual({ rank: 2, score: 100 });
	});

	it("returns the user best across multiple attempts on the tryout", async () => {
		mockFindMany.mockResolvedValue([
			tryoutAttempt({
				userId: "u-me",
				tryoutId: 42,
				totalScore: 200,
				finishedAt: new Date("2026-06-01T00:00:00Z"),
			}),
			tryoutAttempt({
				userId: "u-me",
				tryoutId: 42,
				totalScore: 300,
				finishedAt: new Date("2026-06-02T00:00:00Z"),
			}),
			tryoutAttempt({
				userId: "u-a",
				tryoutId: 42,
				totalScore: 250,
				finishedAt: SESSION_DATE,
			}),
		]);
		const result = await getUserTryoutRank("u-me", 42);
		// best 300 > u-a 250 → rank 1
		expect(result).toEqual({ rank: 1, score: 300 });
	});
});

// ── periodSince ──────────────────────────────────────────────────────

describe("periodSince", () => {
	it('returns undefined for "all" / null / undefined / unknown', () => {
		expect(periodSince("all")).toBeUndefined();
		expect(periodSince(null)).toBeUndefined();
		expect(periodSince(undefined)).toBeUndefined();
		expect(periodSince("garbage")).toBeUndefined();
	});

	it('returns ~7 days ago for "weekly"', () => {
		const before = Date.now();
		const since = periodSince("weekly");
		if (!since)
			throw new Error("expected periodSince('weekly') to return a Date");
		const d = since.getTime();
		const after = Date.now();
		const sevenDays = 7 * 24 * 60 * 60 * 1000;
		// The returned value should be in (now-7d, now] (executed between before & after)
		expect(d).toBeLessThanOrEqual(after);
		expect(d).toBeGreaterThanOrEqual(before - sevenDays);
	});

	it('returns ~30 days ago for "monthly"', () => {
		const before = Date.now();
		const since = periodSince("monthly");
		if (!since)
			throw new Error("expected periodSince('monthly') to return a Date");
		const d = since.getTime();
		const after = Date.now();
		const thirtyDays = 30 * 24 * 60 * 60 * 1000;
		expect(d).toBeLessThanOrEqual(after);
		expect(d).toBeGreaterThanOrEqual(before - thirtyDays);
	});
});

// ── withTtlCache ─────────────────────────────────────────────────────

describe("withTtlCache", () => {
	beforeEach(() => {
		__resetRankingCache();
	});

	it("caches the compute result and reuses it within TTL", async () => {
		const compute = vi.fn().mockResolvedValue("payload-1");
		const a = await withTtlCache("k1", 60_000, compute);
		const b = await withTtlCache("k1", 60_000, compute);
		expect(a).toBe("payload-1");
		expect(b).toBe("payload-1");
		expect(compute).toHaveBeenCalledTimes(1);
	});

	it("recomputes after TTL expires", async () => {
		let counter = 0;
		const compute = vi.fn().mockImplementation(async () => `v${++counter}`);
		const a = await withTtlCache("k2", 1, compute); // 1ms TTL
		expect(a).toBe("v1");
		// wait > 1ms
		await new Promise((r) => setTimeout(r, 5));
		const b = await withTtlCache("k2", 1, compute);
		expect(b).toBe("v2");
		expect(compute).toHaveBeenCalledTimes(2);
	});

	it("deduplicates concurrent calls for the same key (single-flight)", async () => {
		let calls = 0;
		const compute = vi.fn().mockImplementation(async () => {
			calls += 1;
			await new Promise((r) => setTimeout(r, 10));
			return "shared";
		});
		const [a, b, c] = await Promise.all([
			withTtlCache("k3", 60_000, compute),
			withTtlCache("k3", 60_000, compute),
			withTtlCache("k3", 60_000, compute),
		]);
		expect(a).toBe("shared");
		expect(b).toBe("shared");
		expect(c).toBe("shared");
		expect(compute).toHaveBeenCalledTimes(1);
		expect(calls).toBe(1);
	});

	it("does not share state across distinct keys", async () => {
		const compute = vi.fn().mockImplementation(async (k: string) => `v-${k}`);
		// Use a closure-style compute to vary the return per key
		const a = await withTtlCache("kx", 60_000, async () => "ax");
		const b = await withTtlCache("ky", 60_000, async () => "ay");
		expect(a).toBe("ax");
		expect(b).toBe("ay");
		expect(compute).not.toHaveBeenCalled();
	});
});
