import type { QuestionCategory } from "./types";

export function defaultOptionWeights(category: QuestionCategory, correctAnswer = 0): number[] {
  return category === "TKP" ? [5, 4, 3, 2, 1] : Array.from({ length: 5 }, (_, index) => index === correctAnswer ? 1 : 0);
}

export function isValidOptionWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647;
}
