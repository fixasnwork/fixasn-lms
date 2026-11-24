import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { DashboardOpenTryout } from "@/lib/types";
import DashboardOpenTryouts from "./DashboardOpenTryouts";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/useTryoutQueries", () => ({
  useCreateOrResumeAttempt: () => ({ mutate: mocks.mutate, isPending: false, isError: false }),
}));

const tryouts: DashboardOpenTryout[] = [
  { tryoutId: 1, name: "Belum Dimulai", status: "not-started", answeredCount: 0, questionCount: 110 },
  { tryoutId: 2, name: "Sedang Dikerjakan", status: "in-progress", answeredCount: 12, questionCount: 110 },
  { tryoutId: 3, name: "Sudah Selesai", status: "finished", answeredCount: 0, questionCount: 110 },
  { tryoutId: 4, name: "Baru Mulai", status: "in-progress", answeredCount: 0, questionCount: 110 },
];
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("DashboardOpenTryouts", () => {
  it("shows only in-progress tryouts, including a started timer with no answers yet", () => {
    render(<DashboardOpenTryouts tryouts={tryouts} />);
    expect(screen.getByRole("heading", { name: "Tryout Berjalan" })).toBeInTheDocument();
    expect(screen.getByText("Sedang Dikerjakan")).toBeInTheDocument();
    expect(screen.getByText("12 dari 110 soal terjawab")).toBeInTheDocument();
    expect(screen.getByText("Baru Mulai")).toBeInTheDocument();
    expect(screen.queryByText("Belum Dimulai")).toBeNull();
    expect(screen.queryByText("Sudah Selesai")).toBeNull();
  });

  it("shows the empty state and links to all tryouts when none are in progress", () => {
    render(<DashboardOpenTryouts tryouts={tryouts.filter((tryout) => tryout.status !== "in-progress")} />);
    expect(screen.getByText(/Belum ada tryout yang sedang dikerjakan/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat Semua" })).toHaveAttribute("href", "/tryout");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("resumes the selected tryout and navigates to its attempt", () => {
    render(<DashboardOpenTryouts tryouts={tryouts} />);
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan Sedang Dikerjakan" }));
    expect(mocks.mutate).toHaveBeenCalledWith(2, expect.objectContaining({ onSuccess: expect.any(Function) }));
    mocks.mutate.mock.calls[0][1].onSuccess({ attempt: { id: "existing-attempt" } });
    expect(mocks.push).toHaveBeenCalledWith("/tryout/existing-attempt");
  });
});
