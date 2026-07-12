import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TryoutRankingPanel from "./TryoutRankingPanel";

/* ── Mock fetch (api/tryouts/[tryoutId]/ranking) ────────────────── */
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/* ── Helpers ──────────────────────────────────────────────────── */
function withQueryClient(node: React.ReactNode) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

function makeResponse(payload: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => payload,
	} as Response;
}

function makeRankingResponse(
	overrides: Partial<{
		entries: Array<{
			userId: string;
			name: string;
			avatar: string | null;
			initials: string;
			totalScore: number;
			tryoutCount: number;
			packages: string;
		}>;
		viewer: { rank: number; score: number } | null;
		participantCount: number;
		period: "all" | "weekly" | "monthly";
	}> = {},
) {
	const entries = overrides.entries ?? [
		{
			userId: "u-1",
			name: "Andi S",
			avatar: null,
			initials: "AS",
			totalScore: 385,
			tryoutCount: 1,
			packages: "",
		},
		{
			userId: "u-2",
			name: "Budi S",
			avatar: null,
			initials: "BS",
			totalScore: 315,
			tryoutCount: 1,
			packages: "",
		},
		{
			userId: "u-3",
			name: "Citra L",
			avatar: null,
			initials: "CL",
			totalScore: 298,
			tryoutCount: 1,
			packages: "",
		},
	];
	return {
		entries,
		viewer: overrides.viewer ?? null,
		participantCount: overrides.participantCount ?? entries.length,
		period: overrides.period ?? "all",
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
});

describe("TryoutRankingPanel", () => {
	it("fetches /api/tryouts/[id]/ranking?period=all on mount and renders entries", async () => {
		mockFetch.mockResolvedValueOnce(makeResponse(makeRankingResponse()));
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-1" />),
		);
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/tryouts/42/ranking?period=all",
			);
		});
		// Wait for the data to land and the heading to render
		await waitFor(() => {
			expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(
				/Ranking Tryout Ini/,
			);
		});
	});

	it("renders the empty state when participantCount is 0", async () => {
		mockFetch.mockResolvedValueOnce(
			makeResponse(
				makeRankingResponse({ entries: [], participantCount: 0, viewer: null }),
			),
		);
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-1" />),
		);
		await waitFor(() => {
			expect(screen.getByTestId("ranking-empty")).toBeInTheDocument();
		});
		expect(screen.getByText(/Belum ada peserta/)).toBeInTheDocument();
	});

	it("still shows the sub-tab nav when participantCount is 0 (regression: user can switch back)", async () => {
		mockFetch.mockResolvedValueOnce(
			makeResponse(
				makeRankingResponse({ entries: [], participantCount: 0, viewer: null }),
			),
		);
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-1" />),
		);
		await waitFor(() => {
			expect(screen.getByTestId("ranking-empty")).toBeInTheDocument();
		});
		// The three period buttons must still be present so the user can
		// switch back from a filtered period that has zero participants.
		expect(
			screen.getByRole("tablist", { name: /Periode ranking/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/Semua/)).toBeInTheDocument();
		expect(screen.getByText(/Mingguan/)).toBeInTheDocument();
		expect(screen.getByText(/Bulanan/)).toBeInTheDocument();
	});

	it("empty-state message reflects the active period", async () => {
		mockFetch.mockResolvedValue(
			makeResponse(
				makeRankingResponse({ entries: [], participantCount: 0, viewer: null }),
			),
		);
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-1" />),
		);
		await waitFor(() => {
			expect(screen.getByTestId("ranking-empty")).toBeInTheDocument();
		});
		// Default period is "all" → generic message
		expect(
			screen.getByTestId("ranking-empty").getAttribute("data-empty-period"),
		).toBe("all");
		expect(screen.getByText(/Jadilah yang pertama!/)).toBeInTheDocument();
		// Switch to weekly
		fireEvent.click(screen.getByText(/Mingguan/));
		await waitFor(() => {
			const empty = screen.getByTestId("ranking-empty");
			expect(empty.getAttribute("data-empty-period")).toBe("weekly");
		});
		expect(screen.getByText(/dalam 7 hari terakhir/)).toBeInTheDocument();
	});

	it("re-fetches when switching back from weekly to all, even after empty weekly", async () => {
		mockFetch.mockResolvedValue(
			makeResponse(
				makeRankingResponse({ entries: [], participantCount: 0, viewer: null }),
			),
		);
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-1" />),
		);
		await waitFor(() => {
			expect(screen.getByTestId("ranking-empty")).toBeInTheDocument();
		});
		// Click Mingguan
		fireEvent.click(await screen.findByText(/Mingguan/));
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/tryouts/42/ranking?period=weekly",
			);
		});
		// Click Semua — must work even though the weekly view was empty
		fireEvent.click(await screen.findByText(/Semua/));
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/tryouts/42/ranking?period=all",
			);
		});
	});

	it("renders the sticky your-row card with rank + score + participant count", async () => {
		mockFetch.mockResolvedValueOnce(
			makeResponse(
				makeRankingResponse({
					viewer: { rank: 2, score: 315 },
				}),
			),
		);
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-2" />),
		);
		await waitFor(() => {
			expect(screen.getByTestId("ranking-your-row")).toBeInTheDocument();
		});
		const card = screen.getByTestId("ranking-your-row");
		expect(card.textContent).toMatch(/Peringkat Kamu/);
		expect(card.textContent).toMatch(/2/);
		expect(card.textContent).toMatch(/315/);
		expect(card.textContent).toMatch(/Budi S/);
		expect(card.textContent).toMatch(/Kamu/);
	});

	it("does NOT render the viewer in the scrollable list", async () => {
		mockFetch.mockResolvedValueOnce(
			makeResponse(
				makeRankingResponse({
					entries: [
						{
							userId: "u-1",
							name: "Andi",
							avatar: null,
							initials: "A",
							totalScore: 385,
							tryoutCount: 1,
							packages: "",
						},
						{
							userId: "u-2",
							name: "Budi",
							avatar: null,
							initials: "B",
							totalScore: 315,
							tryoutCount: 1,
							packages: "",
						},
						{
							userId: "u-3",
							name: "Citra",
							avatar: null,
							initials: "C",
							totalScore: 298,
							tryoutCount: 1,
							packages: "",
						},
					],
					viewer: { rank: 2, score: 315 },
					participantCount: 3,
				}),
			),
		);
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-2" />),
		);
		// The viewer (u-2) is in the podium (2nd place) AND in the your-row,
		// but should NOT appear as a separate list entry. Wait for data to land.
		await waitFor(() => {
			expect(screen.getByTestId("ranking-your-row")).toBeInTheDocument();
		});
		const yourRow = screen.getByTestId("ranking-your-row");
		expect(yourRow.textContent).toMatch(/Budi/);
		expect(yourRow.textContent).toMatch(/\(Kamu\)/);
		expect(yourRow.textContent).toMatch(/315/); // score
	});

	it("shows 'only you' message when the viewer is the only finisher", async () => {
		mockFetch.mockResolvedValueOnce(
			makeResponse(
				makeRankingResponse({
					entries: [
						{
							userId: "u-1",
							name: "Solo",
							avatar: null,
							initials: "S",
							totalScore: 200,
							tryoutCount: 1,
							packages: "",
						},
					],
					viewer: { rank: 1, score: 200 },
					participantCount: 1,
				}),
			),
		);
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-1" />),
		);
		await waitFor(() => {
			expect(screen.getByTestId("ranking-only-you")).toBeInTheDocument();
		});
	});

	it("re-fetches when the sub-tab changes to weekly", async () => {
		mockFetch.mockResolvedValue(makeResponse(makeRankingResponse()));
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-1" />),
		);
		// initial fetch
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/tryouts/42/ranking?period=all",
			);
		});
		// click "Mingguan" — TabBar from RankingClient renders this label
		const mingguanBtn = await screen.findByText(/Mingguan/);
		fireEvent.click(mingguanBtn);
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/tryouts/42/ranking?period=weekly",
			);
		});
	});

	it("does not render the sticky your-row card when viewer is null (defensive)", async () => {
		mockFetch.mockResolvedValueOnce(
			makeResponse(
				makeRankingResponse({
					viewer: null,
				}),
			),
		);
		render(
			withQueryClient(<TryoutRankingPanel tryoutId={42} viewerUserId="u-1" />),
		);
		await waitFor(() => {
			expect(screen.getByText(/Ranking Tryout Ini/)).toBeInTheDocument();
		});
		expect(screen.queryByTestId("ranking-your-row")).not.toBeInTheDocument();
	});
});
