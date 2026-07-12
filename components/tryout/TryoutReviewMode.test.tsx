import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TryoutReviewMode from "./TryoutReviewMode";
import type { Question } from "@/lib/types";

// TryoutReviewMode uses useQuery for the Ranking tab badge.
// Even when the ranking props are omitted (and the tab is hidden), the
// hook still runs and needs a QueryClient in the tree.
function withQueryClient(node: React.ReactNode) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

const baseQuestion: Question = {
	id: 1,
	category: "TWK",
	question: "Sample?",
	correctAnswer: 0,
	questionImage: null,
	explanation: null,
	explanationImage: null,
	options: [
		{
			id: 1,
			questionId: 1,
			optionIndex: 0,
			optionText: "A",
			optionImage: null,
			tkpValue: null,
		},
		{
			id: 2,
			questionId: 1,
			optionIndex: 1,
			optionText: "B",
			optionImage: null,
			tkpValue: null,
		},
	],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeQuestions(n: number): Question[] {
	return Array.from({ length: n }, (_, i) => ({
		...baseQuestion,
		id: i + 1,
		question: `Q${i + 1}`,
	}));
}

describe("TryoutReviewMode — Ragu-ragu flag", () => {
	it('shows "X dari Y soal ditandai Ragu-ragu" summary', () => {
		const questions = makeQuestions(10);
		const answers: Record<number, number> = {
			0: 0,
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 0,
			6: 0,
			7: 0,
			8: 0,
			9: 0,
		};
		const raguRaguFlags: Record<number, boolean> = {
			0: true,
			2: true,
			4: true,
			6: true,
			8: true,
		};

		render(
			withQueryClient(
				<TryoutReviewMode
					questions={questions}
					answers={answers}
					name="Test"
					scores={{ twk: 25, tiu: 30, tkp: 150 }}
					raguRaguFlags={raguRaguFlags}
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);

		expect(screen.getByTestId("ragu-ragu-summary")).toHaveTextContent(
			"5 dari 10 soal ditandai Ragu-ragu",
		);
	});

	it("shows 0 of Y when no questions are flagged", () => {
		const questions = makeQuestions(3);
		const answers: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
		render(
			withQueryClient(
				<TryoutReviewMode
					questions={questions}
					answers={answers}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					raguRaguFlags={{}}
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);

		expect(screen.getByTestId("ragu-ragu-summary")).toHaveTextContent(
			"0 dari 3 soal ditandai Ragu-ragu",
		);
	});

	it("renders a Ragu-ragu pill on flagged questions and not on others", () => {
		const questions = makeQuestions(3);
		const answers: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
		const raguRaguFlags: Record<number, boolean> = { 1: true };

		const { container } = render(
			withQueryClient(
				<TryoutReviewMode
					questions={questions}
					answers={answers}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					raguRaguFlags={raguRaguFlags}
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);

		// Question 0 is displayed by default. It is not flagged.
		expect(screen.queryByTestId("review-pill")).not.toBeInTheDocument();

		// Click question 2 (index 1) — flagged. Pill should appear.
		const navButtons = container.querySelectorAll("button[aria-label]");
		const target = Array.from(navButtons).find((b) =>
			b.getAttribute("aria-label")?.includes("ditandai Ragu-ragu"),
		);
		expect(target).toBeDefined();
		fireEvent.click(target!);
		expect(screen.getByTestId("review-pill")).toBeInTheDocument();

		// Click question 1 (index 0) — not flagged. Pill should disappear.
		const target2 = Array.from(navButtons).find(
			(b) => b.getAttribute("aria-label") === "Soal 1",
		);
		fireEvent.click(target2!);
		expect(screen.queryByTestId("review-pill")).not.toBeInTheDocument();
	});

	it("does not render any flag toggle button in review mode (read-only)", () => {
		const questions = makeQuestions(1);
		const answers: Record<number, number> = { 0: 0 };
		const { container } = render(
			withQueryClient(
				<TryoutReviewMode
					questions={questions}
					answers={answers}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					raguRaguFlags={{ 0: true }}
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);
		expect(
			container.querySelector('[data-testid="ragu-ragu-toggle"]'),
		).toBeNull();
	});
});

/* ── Per-tryout Ranking tab integration ─────────────────────────────────
 * These tests verify the outer Pembahasan | Ranking tab nav added in
 * the per-tryout-ranking change. They live in the same file because
 * TryoutReviewMode is the component under test for both.
 * ------------------------------------------------------------------------ */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRankingPayload(rank = 5, total = 50, score = 250) {
	return {
		entries: Array.from({ length: total }, (_, i) => ({
			userId: `u-${i + 1}`,
			name: `User ${i + 1}`,
			avatar: null,
			initials: `U${i + 1}`,
			totalScore: 350 - i * 2,
			tryoutCount: 1,
			packages: "",
		})),
		viewer: { rank, score },
		participantCount: total,
		period: "all",
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((q: string) => ({
			matches: false,
			media: q,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
});

describe("TryoutReviewMode — Ranking tab", () => {
	it("hides the outer tab nav when ranking props are omitted", () => {
		render(
			withQueryClient(
				<TryoutReviewMode
					questions={makeQuestions(2)}
					answers={{ 0: 0, 1: 0 }}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);
		expect(screen.queryByTestId("outer-tablist")).not.toBeInTheDocument();
	});

	it("renders the outer tab nav when tryoutId/attemptId/viewerUserId are provided", () => {
		mockFetch.mockResolvedValue(makeResponse(makeRankingPayload()));
		render(
			withQueryClient(
				<TryoutReviewMode
					questions={makeQuestions(2)}
					answers={{ 0: 0, 1: 0 }}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					tryoutId={42}
					attemptId="att-1"
					viewerUserId="viewer@test.id"
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);
		expect(screen.getByTestId("outer-tablist")).toBeInTheDocument();
		expect(screen.getByTestId("tab-pembahasan")).toBeInTheDocument();
		expect(screen.getByTestId("tab-ranking")).toBeInTheDocument();
	});

	it("defaults to the Pembahasan tab", () => {
		mockFetch.mockResolvedValue(makeResponse(makeRankingPayload()));
		render(
			withQueryClient(
				<TryoutReviewMode
					questions={makeQuestions(2)}
					answers={{ 0: 0, 1: 0 }}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					tryoutId={42}
					attemptId="att-1"
					viewerUserId="viewer@test.id"
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);
		const pembahasanTab = screen.getByTestId("tab-pembahasan");
		expect(pembahasanTab.getAttribute("aria-selected")).toBe("true");
	});

	it("switches to the Ranking tab on click and mounts the panel", async () => {
		mockFetch.mockResolvedValue(makeResponse(makeRankingPayload(5, 50, 250)));
		render(
			withQueryClient(
				<TryoutReviewMode
					questions={makeQuestions(2)}
					answers={{ 0: 0, 1: 0 }}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					tryoutId={42}
					attemptId="att-1"
					viewerUserId="viewer@test.id"
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);
		fireEvent.click(screen.getByTestId("tab-ranking"));
		await waitFor(() => {
			expect(screen.getByTestId("tryout-ranking-panel")).toBeInTheDocument();
		});
	});

	it("preserves the question index when switching back to Pembahasan", async () => {
		mockFetch.mockResolvedValue(makeResponse(makeRankingPayload()));
		render(
			withQueryClient(
				<TryoutReviewMode
					questions={makeQuestions(5)}
					answers={{ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					tryoutId={42}
					attemptId="att-1"
					viewerUserId="viewer@test.id"
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);
		// Click question 3 (index 2) to change idx
		const navButtons = screen.getAllByLabelText(/^Soal \d+$/);
		fireEvent.click(navButtons[2]);
		// Switch to Ranking
		fireEvent.click(screen.getByTestId("tab-ranking"));
		await waitFor(() => {
			expect(screen.getByTestId("tryout-ranking-panel")).toBeInTheDocument();
		});
		// Switch back
		fireEvent.click(screen.getByTestId("tab-pembahasan"));
		// The pembahasan body should be back; the "Soal 3 dari 5" indicator shows
		// we are still on the same idx.
		expect(screen.getByText(/Soal 3 dari 5/)).toBeInTheDocument();
	});

	it("shows the rank/total badge in the Ranking tab label after fetch", async () => {
		mockFetch.mockResolvedValue(makeResponse(makeRankingPayload(5, 50, 250)));
		render(
			withQueryClient(
				<TryoutReviewMode
					questions={makeQuestions(2)}
					answers={{ 0: 0, 1: 0 }}
					name="Test"
					scores={{ twk: 5, tiu: 5, tkp: 15 }}
					tryoutId={42}
					attemptId="att-1"
					viewerUserId="viewer@test.id"
					onBack={vi.fn()}
					onRetry={vi.fn()}
				/>,
			),
		);
		// Badge appears after the fetch lands
		await waitFor(() => {
			const badge = screen.getByTestId("ranking-badge");
			expect(badge.textContent).toMatch(/#5\/50/);
		});
	});
});

// Response helper for the new tests (avoids importing from elsewhere)
function makeResponse(payload: unknown) {
	return { ok: true, status: 200, json: async () => payload } as Response;
}
