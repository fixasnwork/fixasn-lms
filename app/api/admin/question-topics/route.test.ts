import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { GET, POST } from "./route";
import { DELETE, PATCH } from "./[topicId]/route";

const db = vi.hoisted(() => ({
  questionTopic: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  question: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: vi.fn() }));
const topic = { id: 1, category: "TWK", name: "Pancasila" };
const context = () => ({ params: Promise.resolve({ topicId: "1" }) });
function request(body?: unknown) {
  return new NextRequest("http://localhost/api/admin/question-topics", { method: "POST", body: JSON.stringify(body ?? {}) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue(null);
  db.questionTopic.findMany.mockResolvedValue([topic]);
  db.questionTopic.create.mockResolvedValue(topic);
  db.questionTopic.update.mockResolvedValue(topic);
  db.questionTopic.delete.mockResolvedValue(topic);
  db.question.updateMany.mockResolvedValue({ count: 2 });
  db.$transaction.mockImplementation((callback) => callback(db));
});

describe("admin question topics", () => {
  it("lists topics for the admin", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).topics).toEqual([topic]);
  });

  it("creates a topic with a normalized name", async () => {
    expect((await POST(request({ category: "TWK", name: "  Pancasila  dan   UUD  " }))).status).toBe(201);
    expect(db.questionTopic.create).toHaveBeenCalledWith(expect.objectContaining({ data: { category: "TWK", name: "Pancasila dan UUD" } }));
  });

  it.each([
    { category: "BAD", name: "Test" }, { category: "TWK", name: " " },
    { category: "TIU", name: "x".repeat(121) }, { category: "TWK", name: 123 },
  ])("rejects invalid topic input %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(db.questionTopic.create).not.toHaveBeenCalled();
  });

  it("reports duplicate names as a conflict", async () => {
    db.questionTopic.create.mockRejectedValue({ code: "P2002" });
    expect((await POST(request(topic))).status).toBe(409);
  });

  it("renames a topic without changing its category", async () => {
    expect((await PATCH(request({ name: "UUD 1945" }), context())).status).toBe(200);
    expect(db.questionTopic.update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: "UUD 1945" } }));
    expect((await PATCH(request({ name: "Test", category: "TIU" }), context())).status).toBe(400);
  });

  it("clears topic assignments before deleting a topic within one transaction", async () => {
    expect((await DELETE(request(), context())).status).toBe(200);
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.question.updateMany).toHaveBeenCalledWith({ where: { topicId: 1 }, data: { topicId: null } });
    expect(db.questionTopic.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(db.question.updateMany.mock.invocationCallOrder[0]).toBeLessThan(db.questionTopic.delete.mock.invocationCallOrder[0]);
  });

  it("returns 404 when a topic was already deleted", async () => {
    db.questionTopic.delete.mockRejectedValue({ code: "P2025" });
    expect((await DELETE(request(), context())).status).toBe(404);
  });

  it.each([401, 403])("guards all topic endpoints with admin authorization (%i)", async (status) => {
    vi.mocked(requireAdmin).mockResolvedValue(NextResponse.json({ error: "Denied" }, { status }));
    for (const response of [await GET(), await POST(request(topic)), await PATCH(request({ name: "Test" }), context()), await DELETE(request(), context())]) {
      expect(response.status).toBe(status);
    }
    expect(db.questionTopic.findMany).not.toHaveBeenCalled();
    expect(db.questionTopic.create).not.toHaveBeenCalled();
    expect(db.questionTopic.update).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
