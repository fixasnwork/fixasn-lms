import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TryoutReviewMode from "./TryoutReviewMode";
import type { Question } from "@/lib/types";

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

describe("TryoutReviewMode — review player", () => {
	function renderReview(questions: Question[], answers: Record<number, number>) {
		return render(withQueryClient(
			<TryoutReviewMode questions={questions} answers={answers} name="Review SKD" scores={{ twk: 1, tiu: 0, tkp: 3 }} onBack={vi.fn()} onRetry={vi.fn()} />,
		));
	}

	it("counts missing and negative answers as empty, separately from wrong answers and TKP", () => {
		const questions = makeQuestions(5);
		questions[4] = { ...questions[4], category: "TKP" };
		renderReview(questions, { 0: 0, 1: 1, 2: -1, 4: 1 });
		const summary = within(screen.getByLabelText("Ringkasan jawaban"));
		expect(summary.getByText("Benar").nextElementSibling).toHaveTextContent("1");
		expect(summary.getByText("Salah").nextElementSibling).toHaveTextContent("1");
		expect(summary.getByText("Tidak dijawab").nextElementSibling).toHaveTextContent("2");
		expect(summary.queryByText("TKP terjawab")).not.toBeInTheDocument();
	});

	it("shows the selected wrong answer alongside the correct answer without answer controls", () => {
		renderReview(makeQuestions(1), { 0: 1 });
		const options = within(screen.getByRole("group", { name: "Jawaban dan kunci soal" }));
		expect(options.getByText("Jawaban benar").closest("div")?.parentElement).toHaveTextContent("A");
		expect(options.getByText("Pilihan kamu").closest("div")?.parentElement).toHaveTextContent("B");
		expect(options.queryByRole("button")).not.toBeInTheDocument();
	});

	it("renders option images and image-only explanations", () => {
		const question = { ...baseQuestion, explanationImage: "https://images.unsplash.com/explanation.jpg", options: baseQuestion.options.map((option, i) => ({ ...option, optionImage: i === 0 ? "https://images.unsplash.com/option.jpg" : null })) };
		renderReview([question], { 0: 0 });
		expect(screen.getByAltText("Gambar pilihan A")).toBeInTheDocument();
		expect(screen.getByAltText("Gambar pembahasan soal 1")).toBeInTheDocument();
		expect(screen.queryByText("Pembahasan belum tersedia untuk soal ini.")).not.toBeInTheDocument();
	});

	it("shows TKP weights and all equally best options", () => {
		const question: Question = { ...baseQuestion, category: "TKP", correctAnswer: null, options: baseQuestion.options.map((option) => ({ ...option, tkpValue: 5 })) };
		renderReview([question], { 0: 1 });
		expect(screen.getByText("Penilaian TKP")).toBeInTheDocument();
		expect(screen.getAllByText("Jawaban terbaik")).toHaveLength(2);
		expect(screen.getAllByText("5 poin")).toHaveLength(2);
	});

	it.each(["TWK", "TIU"] as const)("shows %s option weights while retaining correct-answer feedback", (category) => {
		const question: Question = { ...baseQuestion, category, correctAnswer: 0,
			options: baseQuestion.options.map((option, index) => ({ ...option, tkpValue: index === 0 ? 5 : 0 })) };
		renderReview([question], { 0: 1 });
		expect(screen.getByText("5 poin")).toBeInTheDocument();
		expect(screen.getByText("0 poin")).toBeInTheDocument();
		expect(screen.getByText("Jawaban benar")).toBeInTheDocument();
		expect(screen.queryByText("Jawaban terbaik")).toBeNull();
	});

	it("handles an empty question set without crashing", () => {
		renderReview([], {});
		expect(screen.getByRole("status")).toHaveTextContent("Soal pembahasan belum tersedia.");
	});
});

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

describe("Review navigation", () => {
  it("opens questions directly without review or ranking tabs", () => {
    render(withQueryClient(
      <TryoutReviewMode questions={makeQuestions(3)} answers={{ 0: 0 }} name="Test" scores={{ twk: 1, tiu: 0, tkp: 0 }} onBack={vi.fn()} onRetry={vi.fn()} />,
    ));
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Soal 3"));
    expect(screen.getByText("Soal 3 dari 3")).toBeInTheDocument();
  });
});
