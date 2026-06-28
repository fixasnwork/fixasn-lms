import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VideoTable from "./VideoTable";
import type { Video } from "@/lib/types";

const sampleVideos: Video[] = [
  {
    id: 1,
    title: "Pengantar TWK",
    description: "TWK description",
    youtubeId: "eRsGyueVLvQ",
    category: "TWK",
    durationSec: 888,
    sortOrder: 1,
    isPublished: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    title: "Pengantar TIU",
    description: null,
    youtubeId: "aqz-KE-bpKQ",
    category: "TIU",
    durationSec: 596,
    sortOrder: 1,
    isPublished: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("VideoTable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders desktop table with all video rows", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <VideoTable videos={sampleVideos} onEdit={onEdit} onDelete={onDelete} />
    );

    const desktop = screen.getByTestId("video-desktop-table");
    expect(desktop).toBeDefined();

    // Each video title appears in the table (mobile + desktop = 2 matches each)
    expect(screen.getAllByText("Pengantar TWK")).toHaveLength(2);
    expect(screen.getAllByText("Pengantar TIU")).toHaveLength(2);
  });

  it("renders mobile card list", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <VideoTable videos={sampleVideos} onEdit={onEdit} onDelete={onDelete} />
    );

    const mobile = screen.getByTestId("video-mobile-list");
    expect(mobile).toBeDefined();
  });

  it("edit button calls onEdit with the video", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <VideoTable videos={sampleVideos} onEdit={onEdit} onDelete={onDelete} />
    );

    // Find all edit buttons (✏️) — there are 2 in mobile + 2 in desktop
    const editButtons = screen.getAllByText("✏️");
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(sampleVideos[0]);
  });

  it("delete button confirms then calls onDelete", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <VideoTable videos={sampleVideos} onEdit={onEdit} onDelete={onDelete} />
    );

    const deleteButtons = screen.getAllByText("🗑️");
    fireEvent.click(deleteButtons[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith(sampleVideos[0]);
  });

  it("renders empty state when videos is empty", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <VideoTable videos={[]} onEdit={onEdit} onDelete={onDelete} />
    );

    expect(screen.getByText(/Belum ada video/)).toBeDefined();
  });
});
