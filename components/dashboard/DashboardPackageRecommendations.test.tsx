import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Package } from "@/lib/types";
import DashboardPackageRecommendations from "./DashboardPackageRecommendations";

const state = vi.hoisted(() => ({
  packages: [] as Package[],
  payments: [] as { packageId: number; status: string }[],
}));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { email: "user@example.com" } } }) }));
vi.mock("@/hooks/useTryoutQueries", () => ({
  usePackages: () => ({ data: state.packages, isPending: false, isError: false }),
  useUserPayments: () => ({ data: state.payments, isPending: false, isError: false }),
}));
vi.mock("@/components/landing/Highlight", () => ({ Highlight: ({ children }: { children: ReactNode }) => <span>{children}</span> }));

beforeEach(() => {
  state.packages = [1, 2, 3, 4].map((id) => ({
    id, name: `Paket ${id}`, description: "Latihan SKD", price: 50000,
    isTrial: false, includesVideoPembelajaran: false, tryoutCount: 1,
    startDate: "2020-01-01T00:00:00Z", endDate: null,
    createdAt: "2020-01-01T00:00:00Z", updatedAt: "2020-01-01T00:00:00Z",
  }));
  state.packages.push({ ...state.packages[0], id: 5, name: "Tryout Gratis", price: 0, isTrial: true });
  state.payments = [];
});
afterEach(cleanup);

describe("DashboardPackageRecommendations trials", () => {
  it("keeps the free trial visible within the three recommendations and bypasses checkout", () => {
    render(<DashboardPackageRecommendations />);
    const cards = screen.getAllByRole("heading", { level: 3 });
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("Tryout Gratis");
    expect(screen.getByRole("link", { name: "Coba Gratis: Tryout Gratis" })).toHaveAttribute("href", "/tryout");
    expect(screen.getByRole("link", { name: "Lihat Paket: Paket 1" })).toHaveAttribute("href", "/buy#paket-1");
  });

  it("still excludes owned and pending paid packages without hiding the trial", () => {
    state.payments = [
      { packageId: 1, status: "verified" },
      { packageId: 2, status: "pending" },
      { packageId: 5, status: "pending" },
    ];
    render(<DashboardPackageRecommendations />);
    expect(screen.getByRole("link", { name: "Coba Gratis: Tryout Gratis" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Paket 1" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Paket 2" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Paket 3" })).toBeInTheDocument();
  });
});
