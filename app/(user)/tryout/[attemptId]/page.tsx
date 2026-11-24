"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateScoring } from "@/lib/scoring";
import TryoutEngine from "@/components/tryout/TryoutEngine";
import { Button } from "@/components/ui";
import PageLoading from "@/components/ui/PageLoading";
import { useAttempt, useUpdateAttempt } from "@/hooks/useTryoutQueries";
import TryoutReviewMode from "@/components/tryout/TryoutReviewMode";

export default function TryoutAttemptPage({
	params,
}: {
	params: Promise<{ attemptId: string }>;
}) {
	const { attemptId } = use(params);
	const router = useRouter();

	const { data, isFetching, error } = useAttempt(attemptId);
	const updateAttempt = useUpdateAttempt(attemptId);
	const [finishingHere, setFinishingHere] = useState(false);

	// ── Browser-close guard ──
	// Only register while an in-progress attempt is mounted. The native
	// `beforeunload` dialog ("Changes you made may not be saved") is the
	// only mechanism the browser exposes for this; custom messages are
	// ignored by every modern browser for security reasons. The user is
	// directed to the in-app "Simpan & Keluar" modal for a friendlier
	// confirmation when navigating via the sidebar.
	useEffect(() => {
		if (!data || data.attempt.finishedAt) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			// Setting returnValue (any string) is what actually triggers the
			// native prompt; the value itself is ignored by the browser.
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [data]);

	if (isFetching && !data) {
		return (
			<PageLoading label="Memuat tryout..." />
		);
	}

	if (error || !data) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="text-4xl mb-3">⚠️</div>
					<h2 className="font-black text-xl text-brand mb-2">
						Tryout Tidak Ditemukan
					</h2>
					<p className="text-sm text-gray-400 mb-4">
						{error instanceof Error
							? error.message
							: "Terjadi kesalahan saat memuat tryout."}
					</p>
					<Button variant="primary" onClick={() => router.push("/tryout")}>
						← Kembali ke Daftar Tryout
					</Button>
				</div>
			</div>
		);
	}

	const { attempt, tryout } = data;
	const isCompleted = !!attempt.finishedAt;

	// If completed, show review mode
	if (isCompleted && !finishingHere) {
		return (
			<TryoutReviewMode
				questions={tryout.questions}
				answers={attempt.answers}
				name={tryout.name}
				raguRaguFlags={attempt.raguRagu ?? {}}
				scores={{
					twk: attempt.twkScore,
					tiu: attempt.tiuScore,
					tkp: attempt.tkpScore,
				}}				onBack={() => router.push("/tryout")}
				onRetry={async () => {
					// Create new attempt for the same tryout
					try {
						const res = await fetch("/api/tryout-attempts/resume", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ tryoutId: tryout.id }),
						});
						const result = await res.json();
						if (result.success) {
							router.push(`/tryout/${result.attempt.id}`);
						}
					} catch {
						// Fallback: just go back to list
						router.push("/tryout");
					}
				}}
			/>
		);
	}

	// In-progress: show tryout engine
	return (
		<TryoutEngine
			attemptId={attemptId}
			questions={tryout.questions}
			durationMin={tryout.durationMin || (tryout.isTrial ? 15 : 100)}
			setName={tryout.isTrial ? "Trial Gratis" : tryout.name}
			isTrial={tryout.isTrial}
			preloadedAnswers={attempt.answers}
			preloadedRaguRagu={attempt.raguRagu ?? {}}
			// Resume-seed: only meaningful when the server returned a saved timer.
			// The engine itself guards against stale/legacy nulls.
			initialTimeLeftSeconds={attempt.timeLeftSeconds ?? null}
			// Save-and-exit routes the user back to the list page; the engine
			// already flushed answers + timer + flags before invoking onExit.
			onExit={() => router.push("/tryout")}
			onFinish={async (answers: Record<number, number>) => {
				setFinishingHere(true);
				try {
					const scores = calculateScoring(tryout.questions, answers);
					await updateAttempt.mutateAsync({
						twkScore: scores.TWK,
						tiuScore: scores.TIU,
						tkpScore: scores.TKP,
						totalScore: scores.total,
						answers,
					});
					router.replace(`/tryout/${attemptId}/hasil`);
				} catch (err) {
					setFinishingHere(false);
					throw err;
				}
			}}
			onBack={() => router.push("/tryout")}
		/>
	);
}
