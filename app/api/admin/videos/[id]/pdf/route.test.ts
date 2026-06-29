import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { POST, DELETE } from "./route";

/* ── Mocks ─────────────────────────────────────────────────────── */
const mockAdminOk = vi.hoisted(() => ({ value: true as boolean }));

const mockState = vi.hoisted(() => ({
  video: { id: 1, pdfPageCount: 0, pdfUrl: null } as
    | { id: number; pdfPageCount: number | null; pdfUrl: string | null }
    | null,
  rendered: { pngBuffers: [] as Buffer[], failedPages: [] as number[] },
  throwOnRender: false as boolean,
  throwOnUploadOriginal: false as boolean,
  throwOnUploadPage: false as boolean,
  uploadedPages: [] as number[],
  deletedPageCounts: [] as number[],
  updatedRows: [] as Array<{ pdfUrl: string | null; pdfPageCount: number | null }>,
}));

const mockPrisma = vi.hoisted(() => ({
  video: {
    findFirst: vi.fn().mockImplementation(async () => mockState.video),
    update: vi.fn().mockImplementation(async ({ data }: { data: { pdfUrl: string | null; pdfPageCount: number | null } }) => {
      mockState.updatedRows.push(data);
      return { id: mockState.video?.id ?? 1, ...data };
    }),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: vi.fn().mockImplementation(async () => {
    if (!mockAdminOk.value) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return null;
  }),
}));

vi.mock("@/lib/pdfPageRender", () => ({
  renderPdfToPngs: vi.fn().mockImplementation(async () => {
    if (mockState.throwOnRender) throw new Error("render boom");
    return mockState.rendered;
  }),
  PdfTooLargeError: class PdfTooLargeError extends Error {
    constructor(public pageCount: number) {
      super(`PDF has ${pageCount} pages; maximum is 200`);
      this.name = "PdfTooLargeError";
    }
  },
}));

vi.mock("@/lib/supabaseStorage", () => ({
  uploadOriginalPdf: vi.fn().mockImplementation(async () => {
    if (mockState.throwOnUploadOriginal) throw new Error("upload-original boom");
    return { path: "videos/1/module.pdf" };
  }),
  uploadPagePng: vi.fn().mockImplementation(async (_id: number, n: number) => {
    if (mockState.throwOnUploadPage) throw new Error(`upload-page-${n} boom`);
    mockState.uploadedPages.push(n);
    return { path: `videos/1/page-${n}.png` };
  }),
  deleteAllPdfAssets: vi.fn().mockImplementation(async (_id: number, count: number) => {
    mockState.deletedPageCounts.push(count);
  }),
}));

function makeFileReq(opts: { name?: string; type?: string; size?: number; content?: string } = {}): NextRequest {
  const file = new File(
    [new Uint8Array(opts.content ? opts.content.length : 100)],
    opts.name ?? "test.pdf",
    { type: opts.type ?? "application/pdf" }
  );
  // Override the size when the caller wants to test the cap (File.size is read-only).
  if (opts.size !== undefined) {
    Object.defineProperty(file, "size", { value: opts.size, configurable: true });
  }
  const form = new FormData();
  form.append("file", file);
  return {
    formData: async () => form,
    nextUrl: new URL("http://localhost/api/admin/videos/1/pdf"),
  } as unknown as NextRequest;
}

const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mockAdminOk.value = true;
  mockState.video = { id: 1, pdfPageCount: 0, pdfUrl: null };
  mockState.rendered = { pngBuffers: [], failedPages: [] };
  mockState.throwOnRender = false;
  mockState.throwOnUploadOriginal = false;
  mockState.throwOnUploadPage = false;
  mockState.uploadedPages = [];
  mockState.deletedPageCounts = [];
  mockState.updatedRows = [];
  mockPrisma.video.findFirst.mockClear();
  mockPrisma.video.update.mockClear();
});

describe("POST /api/admin/videos/[id]/pdf", () => {
  it("returns 401 when not admin", async () => {
    mockAdminOk.value = false;
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a positive integer", async () => {
    const res = await POST(makeFileReq(), paramsFor("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no file in FormData", async () => {
    const req = {
      formData: async () => new FormData(),
      nextUrl: new URL("http://localhost/api/admin/videos/1/pdf"),
    } as unknown as NextRequest;
    const res = await POST(req, paramsFor("1"));
    expect(res.status).toBe(400);
  });

  it("returns 415 when MIME is not application/pdf", async () => {
    const res = await POST(makeFileReq({ type: "image/png" }), paramsFor("1"));
    expect(res.status).toBe(415);
  });

  it("returns 413 when file exceeds 20MB", async () => {
    const res = await POST(makeFileReq({ size: 21 * 1024 * 1024 }), paramsFor("1"));
    expect(res.status).toBe(413);
  });

  it("returns 404 when the video does not exist", async () => {
    mockState.video = null;
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(404);
  });

  it("happy path: uploads original + pages + updates Video row", async () => {
    mockState.rendered = {
      pngBuffers: [Buffer.from("page1"), Buffer.from("page2")],
      failedPages: [],
    };
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.video.pdfPageCount).toBe(2);
    expect(data.video.pdfUrl).toBe("uploads/videos/1/module.pdf");
    expect(mockState.uploadedPages).toEqual([1, 2]);
    expect(mockState.updatedRows.at(-1)).toEqual({
      pdfUrl: "uploads/videos/1/module.pdf",
      pdfPageCount: 2,
    });
  });

  it("returns 413 when PDF exceeds 200 pages (PdfTooLargeError)", async () => {
    const { PdfTooLargeError } = await import("@/lib/pdfPageRender");
    // Re-mock renderPdfToPngs to throw a fresh instance
    const renderMock = (await import("@/lib/pdfPageRender")).renderPdfToPngs as unknown as ReturnType<typeof vi.fn>;
    renderMock.mockImplementationOnce(async () => {
      throw new (PdfTooLargeError as unknown as new (n: number) => Error)(500);
    });
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(413);
  });

  it("returns 422 on generic render failure", async () => {
    mockState.throwOnRender = true;
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(422);
  });

  it("returns 422 with failedPages when some pages fail to render but others succeed", async () => {
    mockState.rendered = {
      pngBuffers: [Buffer.from("p1"), Buffer.from("p2"), Buffer.from("p3")],
      failedPages: [2],
    };
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.failedPages).toEqual([2]);
    expect(data.video.pdfPageCount).toBe(3);
  });

  it("returns 500 when uploading the original PDF fails", async () => {
    mockState.throwOnUploadOriginal = true;
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(500);
  });

  it("returns 500 when a page upload fails mid-render", async () => {
    mockState.rendered = {
      pngBuffers: [Buffer.from("p1"), Buffer.from("p2")],
      failedPages: [],
    };
    mockState.throwOnUploadPage = true;
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(500);
  });

  it("cleans up prior pages on re-upload", async () => {
    mockState.video = { id: 1, pdfPageCount: 3, pdfUrl: "uploads/videos/1/module.pdf" };
    mockState.rendered = {
      pngBuffers: [Buffer.from("p1"), Buffer.from("p2")],
      failedPages: [],
    };
    const res = await POST(makeFileReq(), paramsFor("1"));
    expect(res.status).toBe(200);
    expect(mockState.deletedPageCounts).toContain(3);
    expect(mockState.uploadedPages).toEqual([1, 2]);
  });
});

describe("DELETE /api/admin/videos/[id]/pdf", () => {
  it("returns 401 when not admin", async () => {
    mockAdminOk.value = false;
    const res = await DELETE({} as NextRequest, paramsFor("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a positive integer", async () => {
    const res = await DELETE({} as NextRequest, paramsFor("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the video does not exist", async () => {
    mockState.video = null;
    const res = await DELETE({} as NextRequest, paramsFor("1"));
    expect(res.status).toBe(404);
  });

  it("removes the original PDF and all rendered pages, then nulls the Video row", async () => {
    mockState.video = { id: 1, pdfPageCount: 5, pdfUrl: "uploads/videos/1/module.pdf" };
    const res = await DELETE({} as NextRequest, paramsFor("1"));
    expect(res.status).toBe(200);
    expect(mockState.deletedPageCounts).toEqual([5]);
    expect(mockState.updatedRows.at(-1)).toEqual({
      pdfUrl: null,
      pdfPageCount: null,
    });
  });

  it("is a no-op when the video has no PDF (still clears the row to be safe)", async () => {
    mockState.video = { id: 1, pdfPageCount: 0, pdfUrl: null };
    const res = await DELETE({} as NextRequest, paramsFor("1"));
    expect(res.status).toBe(200);
    expect(mockState.deletedPageCounts).toEqual([]);
  });
});
