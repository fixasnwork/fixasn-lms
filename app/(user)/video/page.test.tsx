import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VideoPage from "./page";
import type { Video, VideoListResponse } from "@/lib/types";

/* ── Mock next/image (pass through to plain img) ───────────────── */
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

/* ── Mock next/link (anchor) ───────────────────────────────────── */
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

/* ── Mock the hook ─────────────────────────────────────────────── */
const mockUseUserVideos = vi.fn();
const mockUseVideoProgressQuery = vi.fn().mockReturnValue({ data: null });
vi.mock("@/hooks/useVideoQueries", () => ({
  useUserVideos: () => mockUseUserVideos(),
  useFetchVideoProgress: (...args: unknown[]) => mockUseVideoProgressQuery(...args),
}));

vi.mock("@/hooks/useVideoProgress", () => ({
  useVideoProgress: () => ({
    saveProgress: vi.fn(),
    flushPending: vi.fn(),
  }),
}));

vi.mock("@/components/video/YouTubePlayer", () => ({
  default: ({ youtubeId, initialSecond }: { youtubeId: string; initialSecond: number }) => (
    <div data-testid="youtube-player-mock" data-youtube-id={youtubeId} data-initial-second={initialSecond}>
      YouTubePlayer mock
    </div>
  ),
}));

vi.mock("@/components/video/PdfViewerModal", () => ({
  default: ({ video }: { video: unknown }) =>
    video ? <div data-testid="pdf-viewer-mock">PDF mock</div> : null,
}));

const sampleVideo: Video = {
  id: 1,
  title: "Pengantar TWK",
  description: "Materi dasar TWK",
  youtubeId: "dQw4w9WgXcQ",
  category: "TWK",
  durationSec: 888,
  sortOrder: 1,
  isPublished: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const sampleVideoTIU: Video = { ...sampleVideo, id: 2, title: "Pengantar TIU", youtubeId: "oHg5SJYRHA0", category: "TIU" };
const sampleVideoTKP: Video = { ...sampleVideo, id: 3, title: "Pengantar TKP", youtubeId: "L_jWHffIx5E", category: "TKP" };

beforeEach(() => {
  mockUseUserVideos.mockReset();
  mockUseVideoProgressQuery.mockReturnValue({ data: null });
});

describe("VideoPage — render branches", () => {
  it("renders loading state when isLoading", () => {
    mockUseUserVideos.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<VideoPage />);
    expect(screen.getByTestId("video-page-loading")).toBeInTheDocument();
  });

  it("renders error state when hook returns an error", () => {
    mockUseUserVideos.mockReturnValue({ data: undefined, isLoading: false, error: new Error("boom") });
    render(<VideoPage />);
    expect(screen.getByTestId("video-page-error")).toBeInTheDocument();
    expect(screen.getByText(/Gagal memuat video/i)).toBeInTheDocument();
  });

  it("renders locked state when hasAccess is false", () => {
    const data: VideoListResponse = { videos: [], hasAccess: false, accessReason: "no_video_package" };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    expect(screen.getByTestId("video-page-locked")).toBeInTheDocument();
    expect(screen.getByText(/Video Belajar Terkunci/i)).toBeInTheDocument();
    const belilink = screen.getByRole("link", { name: /Beli Paket/i });
    expect(belilink.getAttribute("href")).toBe("/buy");
  });

  it("renders empty state when hasAccess true and no videos", () => {
    const data: VideoListResponse = { videos: [], hasAccess: true, accessReason: null };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    expect(screen.getByTestId("video-page-empty")).toBeInTheDocument();
    expect(screen.getByText(/Belum ada video/i)).toBeInTheDocument();
  });

  it("renders catalog grouped by category when hasAccess true and videos present", () => {
    const data: VideoListResponse = {
      videos: [sampleVideo, sampleVideoTIU, sampleVideoTKP],
      hasAccess: true,
      accessReason: null,
    };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    expect(screen.getByTestId("video-page-catalog")).toBeInTheDocument();
    // 3 group sections in fixed order TWK → TIU → TKP
    expect(screen.getByTestId("video-group-TWK")).toBeInTheDocument();
    expect(screen.getByTestId("video-group-TIU")).toBeInTheDocument();
    expect(screen.getByTestId("video-group-TKP")).toBeInTheDocument();
    // 3 Mulai buttons present
    expect(screen.getByTestId("video-mulai-1")).toBeInTheDocument();
    expect(screen.getByTestId("video-mulai-2")).toBeInTheDocument();
    expect(screen.getByTestId("video-mulai-3")).toBeInTheDocument();
  });

  it("clicking Mulai opens player modal with YouTubePlayer", () => {
    const data: VideoListResponse = { videos: [sampleVideo], hasAccess: true, accessReason: null };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    fireEvent.click(screen.getByTestId("video-mulai-1"));
    const modal = screen.getByTestId("video-player-modal");
    expect(modal).toBeInTheDocument();
    const player = screen.getByTestId("youtube-player-mock");
    expect(player).toBeInTheDocument();
    expect(player.getAttribute("data-youtube-id")).toBe("dQw4w9WgXcQ");
  });

  it("uses ▶ Mulai label when no progress is present", () => {
    const data: VideoListResponse = { videos: [sampleVideo], hasAccess: true, accessReason: null };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    expect(screen.getByTestId("video-mulai-1").textContent).toBe("▶ Mulai");
  });

  it("uses ▶ Lanjut dari m:ss label when progress is in-progress", () => {
    const data: VideoListResponse = {
      videos: [
        { ...sampleVideo, progress: { lastSecond: 75, watchedSeconds: 80, completedAt: null } },
      ],
      hasAccess: true,
      accessReason: null,
    };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    expect(screen.getByTestId("video-mulai-1").textContent).toBe("▶ Lanjut dari 1:15");
  });

  it("uses ▶ Tonton Lagi label when progress is completed", () => {
    const data: VideoListResponse = {
      videos: [
        {
          ...sampleVideo,
          progress: {
            lastSecond: 888,
            watchedSeconds: 888,
            completedAt: "2026-06-15T10:00:00.000Z",
          },
        },
      ],
      hasAccess: true,
      accessReason: null,
    };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    expect(screen.getByTestId("video-mulai-1").textContent).toBe("▶ Tonton Lagi");
  });

  it("does NOT render the 📄 Modul button when pdfPageCount is missing", () => {
    const data: VideoListResponse = { videos: [sampleVideo], hasAccess: true, accessReason: null };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    expect(screen.queryByTestId("video-pdf-1")).toBeNull();
  });

  it("renders the 📄 Modul button when pdfPageCount > 0 and opens the PDF modal", () => {
    const data: VideoListResponse = {
      videos: [{ ...sampleVideo, pdfPageCount: 12 }],
      hasAccess: true,
      accessReason: null,
    };
    mockUseUserVideos.mockReturnValue({ data, isLoading: false, error: null });
    render(<VideoPage />);
    expect(screen.getByTestId("video-pdf-1")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("video-pdf-1"));
    expect(screen.getByTestId("pdf-viewer-mock")).toBeInTheDocument();
  });
});
