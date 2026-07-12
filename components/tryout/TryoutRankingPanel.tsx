"use client";

// ─────────────────────────────────────────────
// Per-tryout ranking panel for the pembahasan Ranking tab.
// Renders a sub-tab nav (All-time / Mingguan / Bulanan), the top-3
// podium, a sticky "your row" card, and a scrollable list of other
// participants. Renders plain — no celebration effect on top-3.
// ─────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui";
import {
	Podium,
	RankingRow,
	ScoreTypeBar,
	TabBar,
	getMetricScore,
} from "@/components/ranking/RankingClient";
import type { ScoreType } from "@/components/ranking/RankingClient";
import type { RankingEntry } from "@/lib/ranking";

type Period = "all" | "weekly" | "monthly";

interface RankingResponse {
	entries: RankingEntry[];
	viewer: { rank: number; score: number } | null;
	participantCount: number;
	period: Period;
}

export default function TryoutRankingPanel({
	tryoutId,
	viewerUserId,
}: {
	tryoutId: number;
	viewerUserId: string;
}) {
	const [period, setPeriod] = useState<Period>("all");
	const [scoreType, setScoreType] = useState<ScoreType>("total");
	const headingRef = useRef<HTMLHeadingElement>(null);

	// Move keyboard focus to the heading when the panel first mounts
	// (i.e., when the user switches from the Pembahasan tab).
	useEffect(() => {
		headingRef.current?.focus();
	}, []);

	const { data, isLoading, isError } = useQuery<RankingResponse>({
		queryKey: ["tryout-ranking", tryoutId, period],
		queryFn: async () => {
			const res = await fetch(
				`/api/tryouts/${tryoutId}/ranking?period=${period}`,
			);
			if (!res.ok) throw new Error("Failed to load ranking");
			return (await res.json()) as RankingResponse;
		},
		staleTime: 60_000,
	});

	// Re-sort by selected metric. useMemo so the sort only runs when
	// the underlying entries array or scoreType change — not on every
	// render. Must be called unconditionally (before any early returns)
	// per Rules of Hooks. We also memoise `entries` itself so the
	// useMemo dep reference stays stable when `data` is undefined or
	// when the server returns the same data reference.
	const entries = useMemo(() => data?.entries ?? [], [data]);
	const viewer = data?.viewer ?? null;
	const participantCount = data?.participantCount ?? 0;

	const sortedEntries = useMemo(() => {
		return [...entries].sort(
			(a, b) => getMetricScore(b, scoreType) - getMetricScore(a, scoreType),
		);
	}, [entries, scoreType]);

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 text-gray-400 text-sm py-12 justify-center">
				<span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
				Memuat ranking…
			</div>
		);
	}

	if (isError || !data) {
		return (
			<Card className="p-8 text-center">
				<div className="text-4xl mb-2">⚠️</div>
				<p className="text-sm text-gray-500">
					Gagal memuat ranking. Silakan coba lagi.
				</p>
			</Card>
		);
	}

	const top3 = sortedEntries.slice(0, 3);
	const maxScore = sortedEntries[0]
		? getMetricScore(sortedEntries[0], scoreType)
		: 350;

	// Pre-compute the rank for each user (1-based) from the CURRENT sort
	// order so ranks match whichever metric the user picked.
	const rankByUserId = new Map<string, number>(
		sortedEntries.map((e, i) => [e.userId, i + 1]),
	);
	const list = sortedEntries.filter((e) => e.userId !== viewerUserId);
	const viewerEntry = viewer
		? sortedEntries.find((e) => e.userId === viewerUserId)
		: null;

	// Recompute viewer's rank from the current sort so it matches the
	// selected metric (e.g. "You're #2 by TWK" vs "You're #5 by Total").
	const computedViewerRank = viewerEntry
		? (rankByUserId.get(viewerUserId) ?? null)
		: null;
	const viewerDisplayScore = viewerEntry
		? getMetricScore(viewerEntry, scoreType)
		: 0;

	// Period-aware empty-state copy. When the user filters to Mingguan /
	// Bulanan and there are no participants in that window, the message
	// should reflect the time window so the user isn't misled into
	// thinking the tryout itself is empty.
	const emptyMessage =
		period === "weekly"
			? "Belum ada yang menyelesaikan tryout ini dalam 7 hari terakhir."
			: period === "monthly"
				? "Belum ada yang menyelesaikan tryout ini dalam 30 hari terakhir."
				: "Belum ada yang menyelesaikan tryout ini. Jadilah yang pertama!";

	return (
		<div data-testid="tryout-ranking-panel">
			<h2
				ref={headingRef}
				tabIndex={-1}
				className="font-black text-2xl text-brand mb-1 outline-none"
			>
				🏅 Ranking Tryout Ini
			</h2>
			<p className="text-gray-400 text-sm mb-5">
				{participantCount} peserta · Pembahasan Tryout
			</p>

			{/* Podium + sticky your-row only when there's data */}
			{participantCount > 0 && top3.length > 0 && (
				<Podium top3={top3} maxScore={maxScore} metric={scoreType} />
			)}

			{participantCount > 0 && viewer && viewerEntry && (
				<Card
					data-testid="ranking-your-row"
					className="p-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2"
					style={{ borderColor: "#2563EB" }}
				>
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-black text-lg flex-shrink-0">
							{computedViewerRank}
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">
								Peringkat Kamu
							</div>
							<div className="font-black text-brand truncate">
								{viewerEntry.name}{" "}
								<span className="text-xs font-bold text-gray-500">(Kamu)</span>
							</div>
							<div className="text-xs text-gray-500">
								{viewerDisplayScore} poin
							</div>
						</div>
						<div className="text-right flex-shrink-0">
							<div className="text-[10px] text-gray-400">dari</div>
							<div className="font-black text-brand text-2xl">
								{participantCount}
							</div>
							<div className="text-[10px] text-gray-400">peserta</div>
						</div>
					</div>
				</Card>
			)}

			{/* Sub-tab nav is ALWAYS visible so the user can switch periods,
			    even when the current period has zero participants (the bug). */}
			<div role="tablist" aria-label="Periode ranking">
				<TabBar tab={period} setTab={setPeriod} />
			</div>

			<div role="tablist" aria-label="Kategori skor">
				<ScoreTypeBar scoreType={scoreType} setScoreType={setScoreType} />
			</div>

			{participantCount === 0 ? (
				<div data-testid="ranking-empty" data-empty-period={period}>
					<Card className="p-12 text-center">
						<div className="text-5xl mb-4">📭</div>
						<h3 className="font-black text-lg text-brand mb-2">
							Belum ada peserta
						</h3>
						<p className="text-gray-400 text-sm">{emptyMessage}</p>
					</Card>
				</div>
			) : (
				<Card className="p-0 overflow-hidden">
					{list.length === 0 ? (
						<div
							data-testid="ranking-only-you"
							className="p-6 text-center text-sm text-gray-400"
						>
							Kamu satu-satunya yang pernah menyelesaikan tryout ini 🎉
						</div>
					) : (
						<div className="flex flex-col gap-0">
							{list.map((entry) => (
								<RankingRow
									key={entry.userId}
									entry={entry}
									rank={rankByUserId.get(entry.userId) ?? 0}
									scoreType={scoreType}
								/>
							))}
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
