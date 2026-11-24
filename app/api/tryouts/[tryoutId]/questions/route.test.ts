import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { POST } from "./route";
import { PUT } from "./[questionId]/route";

const db = vi.hoisted(() => ({
  tryout: { findUnique: vi.fn() },
  questionTopic: { findUnique: vi.fn() },
  question: { create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
  questionOption: { deleteMany: vi.fn(), createMany: vi.fn() },
  tryoutQuestion: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: vi.fn() }));

const options = [5, 0].map((tkpValue, optionIndex) => ({ optionIndex, optionText: `Option ${optionIndex}`, tkpValue }));
const body = { category: "TWK", question: "Test", correctAnswer: 0, options };
const handlers = [
  { method: "POST", save: (request: NextRequest) => POST(request, { params: Promise.resolve({ tryoutId: "1" }) }),
    savedOptions: () => db.question.create.mock.calls[0][0].data.options.create },
  { method: "PUT", save: (request: NextRequest) => PUT(request, { params: Promise.resolve({ tryoutId: "1", questionId: "10" }) }),
    savedOptions: () => db.questionOption.createMany.mock.calls[0][0].data },
];
function request(payload: unknown) {
  return new NextRequest("http://localhost/api/tryouts/1/questions", { method: "POST", body: JSON.stringify(payload) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue(null);
  db.tryout.findUnique.mockResolvedValue({ id: 1 });
  db.questionTopic.findUnique.mockResolvedValue({ category: "TWK" });
  db.tryoutQuestion.findUnique.mockResolvedValue({ id: 1 });
  db.tryoutQuestion.findFirst.mockResolvedValue(null);
  const row = { id: 10, ...body, questionImage: null, explanation: null, explanationImage: null,
    createdAt: new Date(), updatedAt: new Date(),
    options: options.map((option, index) => ({ ...option, id: index + 1, questionId: 10, optionImage: null })) };
  db.question.create.mockResolvedValue(row);
  db.question.findUniqueOrThrow.mockResolvedValue(row);
  db.$transaction.mockImplementation((callback) => callback(db));
});

describe.each(handlers)("$method questions", ({ method, save, savedOptions }) => {
  it("stores a topic from the matching category", async () => {
    expect((await save(request({ ...body, topicId: 5 }))).status).toBe(200);
    const write = method === "POST" ? db.question.create : db.question.update;
    expect(write.mock.calls[0][0].data.topicId).toBe(5);
  });

  it("allows clearing a question topic", async () => {
    expect((await save(request({ ...body, topicId: null }))).status).toBe(200);
    const write = method === "POST" ? db.question.create : db.question.update;
    expect(write.mock.calls[0][0].data.topicId).toBeNull();
  });

  it("rejects topics from another category before writing", async () => {
    db.questionTopic.findUnique.mockResolvedValue({ category: "TIU" });
    expect((await save(request({ ...body, topicId: 5 }))).status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects deleted topics before writing", async () => {
    db.questionTopic.findUnique.mockResolvedValue(null);
    expect((await save(request({ ...body, topicId: 5 }))).status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each([-1, 0, 1.5, "5", 2147483648])("rejects invalid topic id %s", async (topicId) => {
    expect((await save(request({ ...body, topicId }))).status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each(["TWK", "TIU", "TKP"])("persists %s option weights and returns them", async (category) => {
    const response = await save(request({ ...body, category }));
    expect(response.status).toBe(200);
    expect(savedOptions().map((option: { tkpValue: number }) => option.tkpValue)).toEqual([5, 0]);
    expect((await response.json()).question.options.map((option: { tkpValue: number }) => option.tkpValue)).toEqual([5, 0]);
  });

  it.each([-1, 1.5, "5", 2147483648])("rejects invalid weights before writing: %s", async (tkpValue) => {
    const response = await save(request({ ...body, options: [{ ...options[0], tkpValue }, options[1]] }));
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("preserves the admin guard", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await save(request(body))).status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
