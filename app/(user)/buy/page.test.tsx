import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Package } from "@/lib/types";
import BuyPage from "./page";

const state = vi.hoisted(() => ({
  payments: [] as { packageId: number; status: string; accessExpiresAt?: string }[],
  paymentError: false,
  paymentPending: false,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "user@example.com" } }, status: "authenticated" }),
}));
vi.mock("@/hooks/useTryoutQueries", () => ({
  usePackages: () => ({ data: [
    { id: 1, name: "Paket Tryout", price: 50000, tryoutCount: 5 },
    { id: 2, name: "Paket Video", price: 50000, tryoutCount: 0, includesVideoPembelajaran: true },
    { id: 3, name: "Tryout Gratis", price: 0, tryoutCount: 1, isTrial: true },
  ], isPending: false, isError: false }),
  useUserPayments: () => ({ data: state.payments, isPending: state.paymentPending, isError: state.paymentError }),
}));
vi.mock("@/components/landing/PackagesSection", () => ({
  PackagesSection: ({ packages, renderPackage, isLoading, isError }: {
    packages: Package[]; renderPackage: (pkg: Package) => ReactNode; isLoading: boolean; isError: boolean;
  }) => isError ? <p role="alert">Gagal memuat paket</p> : isLoading ? <p role="status">Memuat paket</p> : packages.map((pkg) => <div key={pkg.id}>{renderPackage(pkg)}</div>),
}));

beforeEach(() => {
  state.payments = [];
  state.paymentError = false;
  state.paymentPending = false;
});
afterEach(cleanup);

describe("BuyPage package actions", () => {
  it("opens trial packages without checkout even when a payment is pending", () => {
    state.payments = [{ packageId: 3, status: "pending" }];
    render(<BuyPage />);
    expect(screen.getByRole("link", { name: "Coba Gratis: Tryout Gratis" })).toHaveAttribute("href", "/tryout");
    expect(screen.getByText("Gratis")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Beli Paket: Tryout Gratis" })).toBeNull();
  });

  it("links unpurchased packages to checkout", () => {
    render(<BuyPage />);
    expect(screen.getByRole("link", { name: "Beli Paket: Paket Tryout" }).getAttribute("href")).toBe("/payment?pkg=1");
  });

  it("opens active tryout and video packages, prioritizing active access over pending payments", () => {
    state.payments = [
      { packageId: 1, status: "pending" },
      { packageId: 1, status: "verified" },
      { packageId: 2, status: "verified" },
    ];
    render(<BuyPage />);
    expect(screen.getByRole("link", { name: "Buka: Paket Tryout" }).getAttribute("href")).toBe("/tryout");
    expect(screen.getByRole("link", { name: "Buka: Paket Video" }).getAttribute("href")).toBe("/video");
  });

  it("disables purchasing while payment awaits verification", () => {
    state.payments = [{ packageId: 1, status: "pending" }];
    render(<BuyPage />);
    expect(screen.getByRole("button", { name: "Menunggu verifikasi: Paket Tryout" })).toHaveProperty("disabled", true);
  });

  it("allows repurchasing expired access", () => {
    state.payments = [{ packageId: 1, status: "verified", accessExpiresAt: "2000-01-01T00:00:00Z" }];
    render(<BuyPage />);
    expect(screen.getByRole("link", { name: "Beli Paket: Paket Tryout" }).getAttribute("href")).toBe("/payment?pkg=1");
  });

  it.each(["loading", "error"])("hides purchase actions when ownership is %s", (status) => {
    state.paymentPending = status === "loading";
    state.paymentError = status === "error";
    render(<BuyPage />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole(status === "error" ? "alert" : "status")).toBeDefined();
  });
});
