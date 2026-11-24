import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Question, QuestionTopic } from "@/lib/types";
import SoalPage from "./page";

const state = vi.hoisted(() => ({ questions: [] as Question[], topics: [] as QuestionTopic[], fetch: vi.fn() }));
vi.mock("@/hooks/useTryoutQueries", () => ({
  usePackages: () => ({ data: [], isFetching: false }),
  useTryouts: () => ({ data: { trial: [{ id: 1, isTrial: true, name: "Trial", questions: [] }] }, isFetching: false }),
  useTryoutQuestions: () => ({ data: state.questions, isFetching: false }),
}));
vi.mock("@/hooks/useQuestionTopics", () => ({
  useQuestionTopics: () => ({ data: state.topics, isPending: false, isError: false }),
}));
vi.mock("@/components/admin/QuestionTopicManager", () => ({ default: () => <div>Panel Topik</div> }));
vi.mock("@/components/admin/ImageUpload", () => ({ default: () => null }));
vi.mock("@/components/admin/SoalTable", () => ({
  default: ({ questions, onEdit }: { questions: Question[]; onEdit: (question: Question) => void }) => (
    <ul>{questions.map((question) => <li key={question.id}>{question.question}<button onClick={() => onEdit(question)}>Edit {question.question}</button></li>)}</ul>
  ),
}));

let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  state.topics = [{ id: 10, category: "TWK", name: "Pancasila" }, { id: 20, category: "TIU", name: "Deret Angka" }];
  state.questions = [
    { id: 1, category: "TWK", topicId: 10, question: "Soal Pancasila" },
    { id: 2, category: "TIU", topicId: 20, question: "Soal Deret" },
    { id: 3, category: "TWK", topicId: null, question: "Soal Lama" },
  ].map((question) => ({ ...question, correctAnswer: 0, questionImage: null, explanation: null, explanationImage: null,
    options: [0, 1].map((optionIndex) => ({ id: optionIndex + 1, questionId: question.id, optionIndex, optionText: `Opsi ${optionIndex}`, optionImage: null, tkpValue: null })),
    createdAt: "", updatedAt: "",
  })) as Question[];
  state.fetch.mockReset();
  state.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal("fetch", state.fetch);
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
function renderPage() {
  render(<QueryClientProvider client={client}><SoalPage /></QueryClientProvider>);
}

describe("Bank Soal topics", () => {
  it("searches topics and filters by topic, category, and unassigned status", async () => {
    const user = userEvent.setup();
    renderPage();
    const filter = screen.getByRole("combobox", { name: "Topik soal" });
    await user.click(filter);
    await user.clear(filter);
    await user.type(filter, "pancasila");
    expect(screen.queryByRole("option", { name: "TIU — Deret Angka" })).toBeNull();
    await user.click(await screen.findByRole("option", { name: "TWK — Pancasila" }));
    expect(screen.getByText("Soal Pancasila")).toBeInTheDocument();
    expect(screen.queryByText("Soal Deret")).toBeNull();
    expect(screen.queryByText("Soal Lama")).toBeNull();

    fireEvent.change(screen.getByLabelText("Kategori soal"), { target: { value: "TWK" } });
    expect(screen.getByText("Soal Lama")).toBeInTheDocument();
    expect(screen.queryByText("Soal Deret")).toBeNull();
    await user.click(filter);
    await user.clear(filter);
    await user.type(filter, "Belum");
    await user.click(await screen.findByRole("option", { name: "Belum ditentukan" }));
    expect(screen.getByText("Soal Lama")).toBeInTheDocument();
    expect(screen.queryByText("Soal Pancasila")).toBeNull();
  });

  it("restores the topic on edit and limits searchable topics after changing category", async () => {
    const user = userEvent.setup();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Edit Soal Pancasila" }));
    const select = screen.getByLabelText(/Topik soal.*opsional/);
    expect(select).toHaveValue("Pancasila");
    fireEvent.click(screen.getByRole("button", { name: "TIU" }));
    expect(select).toHaveValue("Belum ditentukan");
    await user.click(select);
    await user.clear(select);
    await user.type(select, "Deret");
    expect(await screen.findByRole("option", { name: "Deret Angka" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Pancasila" })).toBeNull();
  });

  it.each([null, 10])("saves the selected or cleared topic (%s)", async (topicId) => {
    const user = userEvent.setup();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Edit Soal Pancasila" }));
    const input = screen.getByRole("combobox", { name: /Topik soal.*opsional/ });
    await user.click(input);
    await user.clear(input);
    await user.type(input, topicId == null ? "Belum" : "Pancasila");
    await user.click(await screen.findByRole("option", { name: topicId == null ? "Belum ditentukan" : "Pancasila" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan Soal" }));
    await waitFor(() => expect(state.fetch).toHaveBeenCalledOnce());
    const [url, init] = state.fetch.mock.calls[0];
    expect(url).toBe("/api/tryouts/1/questions/1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body).topicId).toBe(topicId);
  });

  it("shows an empty state when no topic matches the search", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByRole("combobox", { name: "Topik soal" });
    await user.click(input);
    await user.clear(input);
    await user.type(input, "topik-tidak-ada");
    expect(await screen.findByText("Topik tidak ditemukan.")).toBeVisible();
    expect(screen.queryByRole("option", { name: "TWK — Pancasila" })).toBeNull();
    expect(screen.queryByRole("option", { name: "TIU — Deret Angka" })).toBeNull();
  });
});
