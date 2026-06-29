import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VideoForm from "./VideoForm";
import type { Video } from "@/lib/types";

function withQueryClient(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

const sampleVideo: Video = {
  id: 1,
  title: "Pengantar TWK",
  description: "Deskripsi video",
  youtubeId: "eRsGyueVLvQ",
  category: "TWK",
  durationSec: 888,
  sortOrder: 2,
  isPublished: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("VideoForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty form in create mode with submit disabled", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <VideoForm onSubmit={onSubmit} onCancel={onCancel} />
    );

    // Submit button should be disabled (no title, no youtubeId)
    const submitBtn = screen.getByRole("button", { name: /Tambah Video/ });
    expect(submitBtn).toBeDefined();
    expect(submitBtn.getAttribute("disabled")).not.toBeNull();
  });

  it("pre-fills fields in edit mode", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      withQueryClient(
        <VideoForm initial={sampleVideo} onSubmit={onSubmit} onCancel={onCancel} />
      )
    );

    // Title should be pre-filled
    const titleInput = screen.getByPlaceholderText(/Pengantar TWK/);
    expect(titleInput.getAttribute("value")).toBe("Pengantar TWK");
  });

  it("live-parses YouTube URL to 11-char id", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <VideoForm onSubmit={onSubmit} onCancel={onCancel} />
    );

    // Type a full watch URL
    const youtubeInput = screen.getByPlaceholderText(
      /https:\/\/www\.youtube\.com\/watch/
    );
    fireEvent.change(youtubeInput, {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    // The preview should show the parsed 11-char id
    expect(screen.getByText(/dQw4w9WgXcQ/)).toBeDefined();

    // Submit should now be available if title is also set
    const titleInput = screen.getByPlaceholderText(/Contoh: Pengantar TWK/);
    fireEvent.change(titleInput, { target: { value: "Test Video" } });

    const submitBtn = screen.getByRole("button", { name: /Tambah Video/ });
    expect(submitBtn.getAttribute("disabled")).toBeNull();
  });

  it("rejects invalid YouTube URL", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <VideoForm onSubmit={onSubmit} onCancel={onCancel} />
    );

    const youtubeInput = screen.getByPlaceholderText(
      /https:\/\/www\.youtube\.com\/watch/
    );
    fireEvent.change(youtubeInput, {
      target: { value: "not-a-youtube-url" },
    });

    // Should show invalid error
    expect(screen.getByText("✗ Tidak valid")).toBeDefined();
  });

  it("category toggle works", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <VideoForm onSubmit={onSubmit} onCancel={onCancel} />
    );

    // Click TIU button
    const tiuBtn = screen.getByText("TIU");
    fireEvent.click(tiuBtn);

    // TIU should now have the active style
    expect(tiuBtn.className).toContain("bg-purple-50");
  });

  it("submit disabled when title empty", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <VideoForm onSubmit={onSubmit} onCancel={onCancel} />
    );

    // Set valid YouTube ID but leave title empty
    const youtubeInput = screen.getByPlaceholderText(
      /https:\/\/www\.youtube\.com\/watch/
    );
    fireEvent.change(youtubeInput, {
      target: { value: "dQw4w9WgXcQ" },
    });

    // Submit should still be disabled
    const submitBtn = screen.getByRole("button", { name: /Tambah Video/ });
    expect(submitBtn.getAttribute("disabled")).not.toBeNull();
  });

  it("calls onSubmit with correct payload on submit", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <VideoForm onSubmit={onSubmit} onCancel={onCancel} />
    );

    // Fill title
    const titleInput = screen.getByPlaceholderText(/Contoh: Pengantar TWK/);
    fireEvent.change(titleInput, { target: { value: "Test Video" } });

    // Fill YouTube URL (full URL → should be parsed to 11-char)
    const youtubeInput = screen.getByPlaceholderText(
      /https:\/\/www\.youtube\.com\/watch/
    );
    fireEvent.change(youtubeInput, {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    // Click Submit
    const submitBtn = screen.getByRole("button", { name: /Tambah Video/ });
    fireEvent.click(submitBtn);

    // Should have been called with the correct payload
    expect(onSubmit).toHaveBeenCalledTimes(1);

    // Check payload — youtubeId should be the 11-char parsed form, not the URL
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.title).toBe("Test Video");
    expect(payload.youtubeId).toBe("dQw4w9WgXcQ");
    expect(payload.category).toBe("TWK");
    expect(payload.isPublished).toBe(false);
  });
});
