import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AttemptHistoryEntry } from "@/hooks/useTryoutQueries";
import type { Tryout } from "@/lib/types";
import TryoutPageClient from "./TryoutPageClient";

const state = vi.hoisted(() => ({ attempts: [] as AttemptHistoryEntry[] }));
const tryout: Tryout = { id: 1, name: "Trial SKD", isTrial: true, sortOrder: 0, durationMin: 100,
  questions: [], _questionCount: 110, startDate: "2020-01-01T00:00:00Z", endDate: null, createdAt: "", updatedAt: "" };
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { email: "user@test.id" } }, status: "authenticated" }) }));
vi.mock("@/components/landing/Highlight", () => ({ Highlight: ({ children }: { children: ReactNode }) => <span>{children}</span> }));
vi.mock("@/hooks/useDashboardSummary", () => ({ useDashboardSummaryQuery: () => ({ data: { rank: null } }) }));
vi.mock("@/hooks/useTryoutQueries", () => ({
  usePackages: () => ({ data: [], isLoading: false, isError: false }),
  useTryouts: () => ({ data: {}, isLoading: false, isError: false }),
  useAllTryouts: () => ({ data: [tryout], isLoading: false, isError: false }),
  useUserPayments: () => ({ data: [], isLoading: false, isError: false }),
  useAttemptHistory: () => ({ data: state.attempts, isLoading: false, isError: false }),
  useCreateOrResumeAttempt: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));

function attempt(id: string, scores: [number, number, number], finishedAt: string): AttemptHistoryEntry {
  return { id, tryoutId: 1, twkScore: scores[0], tiuScore: scores[1], tkpScore: scores[2],
    totalScore: scores.reduce((total, score) => total + score, 0), finishedAt, createdAt: finishedAt };
}
function renderPage() { render(<TryoutPageClient rankingPreview={null} />); }
function expectBreakdown(scores: [number, number, number]) {
  const view = within(screen.getByLabelText("Nilai kategori skor terbaik Trial SKD"));
  ["TWK", "TIU", "TKP"].forEach((category, index) => {
    expect(view.getByText(category).nextElementSibling).toHaveTextContent(String(scores[index]));
  });
}
beforeEach(() => { state.attempts = []; });
afterEach(cleanup);

describe("Tryout retry score breakdown", () => {
  it("shows all category scores from the same highest-total completed attempt", () => {
    state.attempts = [
      attempt("newer", [120, 80, 200], "2026-11-23T10:00:00Z"),
      attempt("best", [100, 110, 200], "2026-11-22T10:00:00Z"),
      { ...attempt("deleted", [150, 150, 250], "2026-11-21T10:00:00Z"), deletedAt: "2026-11-22T00:00:00Z" },
    ];
    renderPage();
    expect(screen.getByRole("button", { name: "Ulangi Trial SKD" })).toBeInTheDocument();
    expect(screen.getByText("Skor terbaik 410")).toBeInTheDocument();
    expectBreakdown([100, 110, 200]);
  });

  it("uses the earlier finish when completed attempts tie on total score", () => {
    state.attempts = [
      attempt("newer", [110, 100, 200], "2026-11-23T10:00:00Z"),
      attempt("earlier", [100, 110, 200], "2026-11-22T10:00:00Z"),
    ];
    renderPage();
    expectBreakdown([100, 110, 200]);
  });

  it("shows zero scores for a completed attempt", () => {
    state.attempts = [attempt("zero", [0, 0, 0], "2026-11-23T10:00:00Z")];
    renderPage();
    expect(screen.getByRole("button", { name: "Ulangi Trial SKD" })).toBeInTheDocument();
    expectBreakdown([0, 0, 0]);
  });

  it("does not show a score breakdown before any completed attempt", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Mulai Trial SKD" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nilai kategori skor terbaik Trial SKD")).toBeNull();
  });

  it("keeps in-progress retries as continuation cards without an unfinished score", () => {
    state.attempts = [
      { ...attempt("in-progress", [150, 150, 250], "2026-11-23T10:00:00Z"), finishedAt: null, timeLeftSeconds: 3000 },
      attempt("best", [100, 110, 200], "2026-11-22T10:00:00Z"),
    ];
    renderPage();
    expect(screen.getByRole("button", { name: "Lanjutkan Trial SKD" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nilai kategori skor terbaik Trial SKD")).toBeNull();
    expect(screen.queryByText("Skor terbaik 550")).toBeNull();
  });
});
