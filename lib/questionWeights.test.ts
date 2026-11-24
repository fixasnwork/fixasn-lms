import { describe, expect, it } from "vitest";
import { defaultOptionWeights, isValidOptionWeight } from "./questionWeights";
import { inputToQuestion } from "./questionTransform";

describe("question weights", () => {
  it.each(["TWK", "TIU"] as const)("defaults %s to the existing binary score", (category) => {
    expect(defaultOptionWeights(category, 2)).toEqual([0, 0, 1, 0, 0]);
  });

  it("preserves the TKP default weights", () => {
    expect(defaultOptionWeights("TKP")).toEqual([5, 4, 3, 2, 1]);
  });

  it.each([-1, 1.5, NaN, Infinity, "5", null, 2147483648])("rejects invalid weight %s", (value) => {
    expect(isValidOptionWeight(value)).toBe(false);
  });

  it.each([0, 1, 5, 2147483647])("accepts weight %s", (value) => {
    expect(isValidOptionWeight(value)).toBe(true);
  });

  it.each(["TWK", "TIU", "TKP"] as const)("preserves %s weights in static question conversion", (category) => {
    const question = inputToQuestion({ id: 1, category, question: "Test", correctAnswer: 0,
      options: ["A", "B"], tkpValues: [5, 0] });
    expect(question.options.map((option) => option.tkpValue)).toEqual([5, 0]);
  });
});
