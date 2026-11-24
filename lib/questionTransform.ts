// ─────────────────────────────────────────────
// QUESTION TRANSFORMERS
// Convert between static data (QuestionInput) and DB shape (Question)
// ─────────────────────────────────────────────
import type { Question, QuestionInput, QuestionOption } from "@/lib/types";

/** Transform a QuestionInput (static data) to a full Question with QuestionOption[] */
export function inputToQuestion(input: QuestionInput): Question {
  const options: QuestionOption[] = input.options.map((text, index) => ({
    id: input.id * 100 + index + 1,
    questionId: input.id,
    optionIndex: index,
    optionText: text,
    optionImage: input.optionImages?.[index] ?? null,
    tkpValue: input.tkpValues?.[index] ?? null,
  }));

  return {
    id: input.id,
    category: input.category,
    question: input.question,
    correctAnswer: input.correctAnswer ?? null,
    questionImage: input.questionImage ?? null,
    explanation: input.explanation ?? null,
    explanationImage: input.explanationImage ?? null,
    options,
    createdAt: "",
    updatedAt: "",
  };
}

/** Transform an array of QuestionInput to Question[] */
export function inputsToQuestions(inputs: QuestionInput[]): Question[] {
  return inputs.map(inputToQuestion);
}

/** Extract option texts from a Question for display (reverse transform) */
export function questionToOptionTexts(question: Question): string[] {
  return question.options.map((o) => o.optionText ?? "");
}

/** Extract TKP values from a Question */
export function questionToTkpValues(question: Question): number[] {
  return question.options.map((o) => o.tkpValue ?? 0);
}
