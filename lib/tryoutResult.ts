import type { Question, QuestionCategory } from "@/lib/types";

export function getAttemptStatistics(questions: Question[], answers: Record<number, number>) {
  const counts: Record<QuestionCategory, { correct: number; wrong: number; empty: number; ungraded: number }> = {
    TWK: { correct: 0, wrong: 0, empty: 0, ungraded: 0 },
    TIU: { correct: 0, wrong: 0, empty: 0, ungraded: 0 },
    TKP: { correct: 0, wrong: 0, empty: 0, ungraded: 0 },
  };
  questions.forEach((question, index) => {
    const answer = answers[index];
    const option = question.options[answer];
    const count = counts[question.category];
    if (!option) { count.empty++; return; }
    if (question.category === "TKP") {
      const values = question.options.flatMap((item) => item.tkpValue == null ? [] : [item.tkpValue]);
      if (!values.length || option.tkpValue == null) { count.ungraded++; return; }
      if (option.tkpValue === Math.max(...values)) count.correct++;
      else count.wrong++;
    } else if (question.correctAnswer == null) count.ungraded++;
    else if (answer === question.correctAnswer) count.correct++;
    else count.wrong++;
  });
  return counts;
}
