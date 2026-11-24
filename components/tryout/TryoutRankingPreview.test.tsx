import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { RankingEntry } from "@/lib/ranking";
import TryoutRankingPreview from "./TryoutRankingPreview";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), ranking: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/ranking", () => ({ getRankingData: mocks.ranking }));

function entry(userId: string, name: string): RankingEntry {
  return { userId, name, avatar: null, initials: "AP", totalScore: 410, twkScore: 100, tiuScore: 110, tkpScore: 200, tryoutCount: 2, packages: "Paket SKD" };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { email: "viewer@test.id", role: "user" } });
  mocks.ranking.mockResolvedValue([
    entry("first@test.id", "Andi Pratama Saputra"),
    entry("viewer@test.id", "Peserta Sendiri"),
    entry("third@test.id", "Siti Nur Aisyah"),
  ]);
});
afterEach(cleanup);

describe("TryoutRankingPreview", () => {
  it("shows full names and the ranking-page participant details without masking", async () => {
    render(await TryoutRankingPreview());
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const first = within(rows[0]);
    expect(first.getByText("Andi Pratama Saputra")).toBeInTheDocument();
    expect(first.queryByText("2 tryout · Paket SKD")).toBeNull();
    expect(first.getByText("Total skor").nextElementSibling).toHaveTextContent("410");
    expect(first.queryByText("TWK")).toBeNull();
    expect(first.queryByText("TIU")).toBeNull();
    expect(first.queryByText("TKP")).toBeNull();
    expect(screen.getByText("Siti Nur Aisyah")).toBeInTheDocument();
    expect(within(rows[1]).getByLabelText("Peringkat 3")).toBeInTheDocument();
    expect(screen.queryByText("Peserta Sendiri")).toBeNull();
  });

  it("limits the preview to ten other participants", async () => {
    mocks.ranking.mockResolvedValue(Array.from({ length: 12 }, (_, index) => entry(`user-${index}`, `Peserta ${index}`)));
    render(await TryoutRankingPreview());
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it.each([null, { user: { email: "viewer@test.id", role: "admin" } }, { user: { email: "viewer@test.id", role: "user" }, isSessionStale: true }])("does not load rankings without a valid user session: %j", async (session) => {
    mocks.auth.mockResolvedValue(session);
    expect(await TryoutRankingPreview()).toBeNull();
    expect(mocks.ranking).not.toHaveBeenCalled();
  });

  it("shows the empty state when no other participants exist", async () => {
    mocks.ranking.mockResolvedValue([entry("viewer@test.id", "Peserta Sendiri")]);
    render(await TryoutRankingPreview());
    expect(screen.getByText("Belum ada peserta lain di ranking.")).toBeInTheDocument();
  });

  it("shows a readable error when ranking data fails to load", async () => {
    mocks.ranking.mockRejectedValue(new Error("Unavailable"));
    render(await TryoutRankingPreview());
    expect(screen.getByText("Daftar peserta belum berhasil dimuat.")).toBeInTheDocument();
  });
});
