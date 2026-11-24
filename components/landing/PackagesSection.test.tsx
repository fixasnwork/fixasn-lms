import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Package } from "@/lib/types";
import { PackagesSection } from "./PackagesSection";

vi.mock("motion/react", () => ({
  useReducedMotion: () => true,
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    article: ({ children }: { children: ReactNode }) => <article>{children}</article>,
  },
}));
vi.mock("./Highlight", () => ({ Highlight: ({ children }: { children: ReactNode }) => <span>{children}</span> }));

const trial: Package = {
  id: 1, name: "Tryout Gratis", description: "Latihan gratis", price: 0,
  isTrial: true, includesVideoPembelajaran: false, tryoutCount: 1,
  startDate: "2020-01-01T00:00:00Z", endDate: null,
  createdAt: "2020-01-01T00:00:00Z", updatedAt: "2020-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("PackagesSection trial visibility", () => {
  it.each(["landing", "dashboard"] as const)("shows active trials in the %s catalog and Tryout SKD tab", (variant) => {
    const onRegister = vi.fn();
    render(<PackagesSection variant={variant} packages={[
      { ...trial, id: 4, name: "Paket Berbayar A", isTrial: false, price: 50000 },
      { ...trial, id: 5, name: "Paket Berbayar B", isTrial: false, price: 75000 },
      trial,
      { ...trial, id: 2, name: "Trial Kedaluwarsa", endDate: "2020-02-01T00:00:00Z" },
      { ...trial, id: 3, name: "Trial Mendatang", startDate: "2099-01-01T00:00:00Z" },
    ]} logoConfig={{ paketTitle: "Semua Paket", paketSubtitle: "Pilih paket" }} onRegister={onRegister} />);

    expect(screen.getByRole("heading", { name: "Tryout Gratis" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent))
      .toEqual(["Tryout Gratis", "Paket Berbayar A", "Paket Berbayar B"]);
    expect(screen.queryByText("Trial Kedaluwarsa")).toBeNull();
    expect(screen.queryByText("Trial Mendatang")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Coba Gratis: Tryout Gratis" }));
    expect(onRegister).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("tab", { name: "Tryout SKD" }));
    expect(screen.getByRole("heading", { name: "Tryout Gratis" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Video Pembelajaran" }));
    expect(screen.queryByRole("heading", { name: "Tryout Gratis" })).toBeNull();
  });
});
