import { describe, expect, it } from "vitest";
import type { Question } from "@/lib/types";
import { getAttemptStatistics } from "./tryoutResult";

function question(category: Question["category"], weights: (number | null)[] = [null, null]): Question {
  return {
    id: 1, category, correctAnswer: category === "TKP" ? null : 0,
    question: "Test", questionImage: null, explanation: null, explanationImage: null,
    createdAt: "", updatedAt: "",
    options: weights.map((tkpValue, index) => ({ id: index, questionId: 1, optionIndex: index, optionText: String(index), optionImage: null, tkpValue })),
  };
}

describe("getAttemptStatistics", () => {
  it("separates correct, wrong, and unanswered questions per category", () => {
    const result = getAttemptStatistics([question("TWK"), question("TWK"), question("TIU"), question("TIU")], { 0: 0, 1: 1, 2: -1 });
    expect(result.TWK).toEqual({ correct: 1, wrong: 1, empty: 0, ungraded: 0 });
    expect(result.TIU).toEqual({ correct: 0, wrong: 0, empty: 2, ungraded: 0 });
  });

  it("accepts tied highest TKP weights and keeps lower scores separate", () => {
    const tkp = question("TKP", [3, 5, 5]);
    const result = getAttemptStatistics([tkp, tkp, tkp, tkp], { 0: 1, 1: 2, 2: 0 });
    expect(result.TKP).toEqual({ correct: 2, wrong: 1, empty: 1, ungraded: 0 });
  });

  it("does not count missing answer keys or weights as incorrect", () => {
    const twk = { ...question("TWK"), correctAnswer: null };
    const result = getAttemptStatistics([twk, question("TKP")], { 0: 0, 1: 0 });
    expect(result.TWK.ungraded).toBe(1);
    expect(result.TKP.ungraded).toBe(1);
    expect(result.TKP.wrong).toBe(0);
  });
});
