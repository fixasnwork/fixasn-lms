import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentPage from "./page";

const state = vi.hoisted(() => ({
  packageId: "1" as string | null,
  mutate: vi.fn(),
  payments: [] as { packageId: number; status: string }[],
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.packageId === null ? "" : `pkg=${state.packageId}`),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "user@example.com", name: "Peserta" } }, status: "authenticated" }),
}));
vi.mock("@/hooks/useTryoutQueries", () => ({
  usePackages: () => ({ data: [
    { id: 1, name: "Paket Pilihan", description: "Latihan untuk persiapan SKD", price: 50000, tryoutCount: 5, accessDurationMonths: 3, startDate: "2000-01-01", endDate: null },
    { id: 2, name: "Paket Lain", price: 100000, startDate: "2000-01-01", endDate: null },
  ], isPending: false, isError: false }),
  useUserPayments: () => ({ data: state.payments, isPending: false, isError: false }),
  useBanks: () => ({ data: [{ id: 1, bankName: "BCA", accountHolder: "FIX ASN", accountNumber: "1234567890", isActive: true }], isPending: false, isError: false }),
  useLogoConfig: () => ({ data: { contactWA: "6281234567890" } }),
  useCreatePayment: () => ({ mutate: state.mutate, isPending: false }),
}));

beforeEach(() => {
  state.packageId = "1";
  state.payments = [];
  state.mutate.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function submitProof() {
  fireEvent.click(screen.getByRole("button", { name: "Lanjut ke Pembayaran" }));
  const dialog = await screen.findByRole("dialog", { name: "Pembayaran Paket" });
  fireEvent.change(within(dialog).getByLabelText("Pilih bukti transfer"), {
    target: { files: [new File(["proof"], "proof.png", { type: "image/png" })] },
  });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "Kirim Bukti Transfer" })).toHaveProperty("disabled", false));
  fireEvent.click(within(dialog).getByRole("button", { name: "Kirim Bukti Transfer" }));
}

describe("selected package checkout", () => {
  it("shows selected details and opens the payment form in a dialog", async () => {
    render(<PaymentPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Paket Pilihan" })).toBeDefined();
    expect(screen.getByText("5 tryout SKD")).toBeDefined();
    expect(screen.getByRole("link", { name: "Butuh bantuan? Hubungi admin" })).toBeDefined();
    expect(screen.queryByText("Paket Lain")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("1234567890")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lanjut ke Pembayaran" }));
    const dialog = await screen.findByRole("dialog", { name: "Pembayaran Paket" });
    expect(within(dialog).getByText("1234567890")).toBeDefined();
    expect(within(dialog).queryByText(/WhatsApp/)).toBeNull();
    expect(within(dialog).queryByRole("group", { name: "Metode konfirmasi" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Kirim Bukti Transfer" })).toHaveProperty("disabled", true);
  });

  it("can close the dialog and return to package details", async () => {
    render(<PaymentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Lanjut ke Pembayaran" }));
    const dialog = await screen.findByRole("dialog", { name: "Pembayaran Paket" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Kembali ke Detail Paket" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("heading", { name: "Isi paket belajarmu" })).toBeDefined();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it.each([null, "1abc", "999"])("handles missing or invalid package %s without showing checkout", (packageId) => {
    state.packageId = packageId;
    render(<PaymentPage />);
    expect(screen.queryByRole("button", { name: "Lanjut ke Pembayaran" })).toBeNull();
    expect(screen.getByRole("link", { name: "Kembali ke Beli Paket" }).getAttribute("href")).toBe("/buy");
  });

  it("shows success only after payment creation succeeds", async () => {
    render(<PaymentPage />);
    await submitProof();
    expect(state.mutate.mock.calls[0][0]).toEqual({ packageId: 1, proofUrl: expect.stringContaining("data:image/png;base64,") });
    expect(screen.queryByRole("heading", { name: "Konfirmasi terkirim" })).toBeNull();
    const { onSuccess } = state.mutate.mock.calls[0][1];
    act(() => onSuccess());
    expect(screen.getByRole("heading", { name: "Konfirmasi terkirim" })).toBeDefined();
    expect(screen.queryByText("Mulai Tryout")).toBeNull();
  });

  it("keeps payment details visible after a failed submission", async () => {
    state.mutate.mockImplementation((_input, callbacks) => callbacks.onError());
    render(<PaymentPage />);
    await submitProof();
    expect(screen.getByRole("dialog", { name: "Pembayaran Paket" })).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("belum berhasil disimpan");
    expect(screen.queryByRole("heading", { name: "Konfirmasi terkirim" })).toBeNull();
  });

  it.each(["verified", "pending"])("prevents another checkout for a %s purchase", (status) => {
    state.payments = [{ packageId: 1, status }];
    render(<PaymentPage />);
    expect(screen.queryByRole("button", { name: "Lanjut ke Pembayaran" })).toBeNull();
    if (status === "verified") expect(screen.getByRole("link", { name: "Buka" }).getAttribute("href")).toBe("/tryout");
    else expect(screen.getByRole("status").textContent).toContain("menunggu verifikasi");
  });
});
