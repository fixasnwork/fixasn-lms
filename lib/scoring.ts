import type { Question } from "@/lib/types";

export function getScore(
	q: Question,
	answerIdx: number | undefined | null,
): number {
	if (answerIdx === undefined || answerIdx === null) return 0;
	if (q.category === "TKP") {
		const opt = q.options[answerIdx];
		return opt?.tkpValue ?? 0;
	}
	return answerIdx === q.correctAnswer ? 1 : 0;
}

export function calculateScoring(
	questions: Question[],
	answers: Record<number, number>,
): { TWK: number; TIU: number; TKP: number; total: number } {
	const totals = { TWK: 0, TIU: 0, TKP: 0 };
	questions.forEach((q, i) => {
		totals[q.category] += getScore(q, answers[i]);
	});
	return { ...totals, total: totals.TWK + totals.TIU + totals.TKP };
}

export function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatCurrency(amount: number): string {
	return `Rp ${amount.toLocaleString("id-ID")}`;
}
