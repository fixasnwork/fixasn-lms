"use client";

import Image from "next/image";
import GlobalRanking from "./GlobalRanking";
import type { RankingEntry } from "@/lib/ranking";

// ── types ────────────────────────────────────
export type ScoreType = "total" | "twk" | "tiu" | "tkp";

interface Props {
	viewerUserId?: string;
	all: RankingEntry[];
}

// ── helpers ──────────────────────────────────
function truncatePackages(packages: string, maxLen = 30): string {
	if (packages.length <= maxLen) return packages;
	return packages.slice(0, maxLen - 3) + "...";
}

function getScoreBarWidth(score: number, maxScore: number): string {
	if (maxScore === 0) return "0%";
	return `${Math.min((score / maxScore) * 100, 100)}%`;
}

/** Extract the score for the selected metric. Exported so Podium and
 *  RankingRow (in this file) and TryoutRankingPanel can share the lookup. */
export function getMetricScore(entry: RankingEntry, metric: ScoreType): number {
	if (metric === "twk") return entry.twkScore;
	if (metric === "tiu") return entry.tiuScore;
	if (metric === "tkp") return entry.tkpScore;
	return entry.totalScore;
}

// ── component ────────────────────────────────
export default function RankingClient(props: Props) {
	return <GlobalRanking {...props} />;
}

// ── Score-type bar (exported for re-use in TryoutRankingPanel) ──
export function ScoreTypeBar({
	scoreType,
	setScoreType,
}: {
	scoreType: ScoreType;
	setScoreType: (t: ScoreType) => void;
}) {
	const tabs: { id: ScoreType; label: string }[] = [
		{ id: "total", label: "📊 Total" },
		{ id: "twk", label: "📝 TWK" },
		{ id: "tiu", label: "🧮 TIU" },
		{ id: "tkp", label: "🧠 TKP" },
	];
	return (
		<div className="flex gap-2 mb-4">
			{tabs.map((t) => (
				<button
					key={t.id}
					onClick={() => setScoreType(t.id)}
					className={`px-4 py-1.5 rounded-full font-bold text-xs cursor-pointer border-2 transition-all ${
						scoreType === t.id
							? "border-blue-600 bg-blue-600 text-white"
							: "border-gray-200 bg-white text-gray-500 hover:border-blue-400"
					}`}
				>
					{t.label}
				</button>
			))}
		</div>
	);
}

// ── Tab bar (exported for re-use in TryoutRankingPanel) ──
export function TabBar({
	tab,
	setTab,
}: {
	tab: "all" | "weekly" | "monthly";
	setTab: (t: "all" | "weekly" | "monthly") => void;
}) {
	return (
		<div className="flex gap-2 mb-4">
			{(["all", "weekly", "monthly"] as const).map((t) => (
				<button
					key={t}
					onClick={() => setTab(t)}
					className={`px-4 py-1.5 rounded-full font-bold text-xs cursor-pointer border-2 transition-all ${
						tab === t
							? "border-blue-600 bg-blue-600 text-white"
							: "border-gray-200 bg-white text-gray-500 hover:border-blue-400"
					}`}
				>
					{t === "all"
						? "🗓️ Semua"
						: t === "weekly"
							? "📅 Mingguan"
							: "📆 Bulanan"}
				</button>
			))}
		</div>
	);
}

// ── Podium (exported for re-use in TryoutRankingPanel) ──
export function Podium({
	top3,
	maxScore,
	metric = "total",
}: {
	top3: RankingEntry[];
	maxScore: number;
	metric?: ScoreType;
}) {
	// 1 entry only — centered gold
	if (top3.length === 1) {
		const score = getMetricScore(top3[0], metric);
		return (
			<div className="flex justify-center items-end gap-3 mb-6 px-4">
				<div className="flex flex-col items-center flex-1 -mt-3">
					<AvatarBlock
						initials={top3[0].initials}
						avatar={top3[0].avatar}
						size="lg"
						ringColor="ring-amber-200 shadow-lg shadow-amber-200/50"
						gradient="from-amber-500 to-yellow-400"
					/>
					<div className="text-3xl mb-1">🥇</div>
					<div className="font-extrabold text-base text-brand text-center">
						{top3[0].name.split(" ")[0]}
					</div>
					<div className="font-black text-2xl text-amber-600">{score}</div>
					<ScoreBar
						score={score}
						maxScore={maxScore}
						color="from-amber-500 to-yellow-400"
						bg="bg-amber-100"
					/>
				</div>
			</div>
		);
	}

	// 2 entries — 1st center, 2nd left
	if (top3.length === 2) {
		const score0 = getMetricScore(top3[0], metric);
		const score1 = getMetricScore(top3[1], metric);
		return (
			<div className="flex justify-center items-end gap-3 mb-6 px-4">
				{/* 2nd place */}
				<div className="flex flex-col items-center flex-1">
					<AvatarBlock
						initials={top3[1].initials}
						avatar={top3[1].avatar}
						size="md"
						ringColor="ring-gray-200"
						gradient="from-gray-400 to-gray-300"
					/>
					<div className="text-2xl mb-1">🥈</div>
					<div className="font-extrabold text-sm text-gray-800 text-center">
						{top3[1].name.split(" ")[0]}
					</div>
					<div className="font-black text-base text-gray-600">{score1}</div>
					<ScoreBar
						score={score1}
						maxScore={maxScore}
						color="from-gray-400 to-gray-300"
						bg="bg-gray-200"
					/>
				</div>

				{/* 1st place */}
				<div className="flex flex-col items-center flex-1 -mt-3">
					<AvatarBlock
						initials={top3[0].initials}
						avatar={top3[0].avatar}
						size="lg"
						ringColor="ring-amber-200 shadow-lg shadow-amber-200/50"
						gradient="from-amber-500 to-yellow-400"
					/>
					<div className="text-3xl mb-1">🥇</div>
					<div className="font-extrabold text-base text-brand text-center">
						{top3[0].name.split(" ")[0]}
					</div>
					<div className="font-black text-2xl text-amber-600">{score0}</div>
					<ScoreBar
						score={score0}
						maxScore={maxScore}
						color="from-amber-500 to-yellow-400"
						bg="bg-amber-100"
					/>
				</div>
			</div>
		);
	}

	// 3+ entries — full podium: 2nd | 1st | 3rd
	const score0 = getMetricScore(top3[0], metric);
	const score1 = getMetricScore(top3[1], metric);
	const score2 = getMetricScore(top3[2], metric);
	return (
		<div className="flex justify-center items-end gap-3 mb-6 px-4">
			{/* 2nd place */}
			<div className="flex flex-col items-center flex-1">
				<AvatarBlock
					initials={top3[1].initials}
					avatar={top3[1].avatar}
					size="md"
					ringColor="ring-gray-200"
					gradient="from-gray-400 to-gray-300"
				/>
				<div className="text-2xl mb-1">🥈</div>
				<div className="font-extrabold text-sm text-gray-800 text-center">
					{top3[1].name.split(" ")[0]}
				</div>
				<div className="font-black text-base text-gray-600">{score1}</div>
				<ScoreBar
					score={score1}
					maxScore={maxScore}
					color="from-gray-400 to-gray-300"
					bg="bg-gray-200"
				/>
			</div>

			{/* 1st place */}
			<div className="flex flex-col items-center flex-1 -mt-3">
				<AvatarBlock
					initials={top3[0].initials}
					avatar={top3[0].avatar}
					size="lg"
					ringColor="ring-amber-200 shadow-lg shadow-amber-200/50"
					gradient="from-amber-500 to-yellow-400"
				/>
				<div className="text-3xl mb-1">🥇</div>
				<div className="font-extrabold text-base text-brand text-center">
					{top3[0].name.split(" ")[0]}
				</div>
				<div className="font-black text-2xl text-amber-600">{score0}</div>
				<ScoreBar
					score={score0}
					maxScore={maxScore}
					color="from-amber-500 to-yellow-400"
					bg="bg-amber-100"
				/>
			</div>

			{/* 3rd place */}
			<div className="flex flex-col items-center flex-1">
				<AvatarBlock
					initials={top3[2].initials}
					avatar={top3[2].avatar}
					size="md"
					ringColor="ring-amber-100"
					gradient="from-amber-700 to-yellow-600"
				/>
				<div className="text-2xl mb-1">🥉</div>
				<div className="font-extrabold text-sm text-gray-800 text-center">
					{top3[2].name.split(" ")[0]}
				</div>
				<div className="font-black text-base text-gray-600">{score2}</div>
				<ScoreBar
					score={score2}
					maxScore={maxScore}
					color="from-amber-700 to-yellow-600"
					bg="bg-amber-200"
				/>
			</div>
		</div>
	);
}

// ── Avatar block ──────────────────────────────
function AvatarBlock({
	initials,
	avatar,
	size,
	ringColor,
	gradient,
}: {
	initials: string;
	avatar: string | null;
	size: "md" | "lg";
	ringColor: string;
	gradient: string;
}) {
	const sizeClass = size === "lg" ? "w-20 h-20 text-2xl" : "w-16 h-16 text-xl";

	if (avatar) {
		return (
			<Image
				src={avatar}
				alt=""
				width={size === "lg" ? 80 : 64}
				height={size === "lg" ? 80 : 64}
				className={`${sizeClass} rounded-full object-cover ring-4 ${ringColor}`}
			/>
		);
	}

	return (
		<div
			className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white ring-4 ${ringColor}`}
		>
			{initials}
		</div>
	);
}

// ── Score bar ─────────────────────────────────
function ScoreBar({
	score,
	maxScore,
	color,
	bg,
}: {
	score: number;
	maxScore: number;
	color: string;
	bg: string;
}) {
	return (
		<div className={`w-full ${bg} rounded-full h-1.5 mt-1`}>
			<div
				className={`bg-gradient-to-r ${color} h-full rounded-full`}
				style={{ width: getScoreBarWidth(score, maxScore) }}
			/>
		</div>
	);
}

// ── Table row (exported for re-use in TryoutRankingPanel) ──
export function RankingRow({
	entry,
	rank,
	scoreType = "total",
}: {
	entry: RankingEntry;
	rank: number;
	scoreType?: ScoreType;
}) {
	const displayScore = getMetricScore(entry, scoreType);
	return (
		<div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
			{/* rank number */}
			<div className="w-8 text-center font-black text-gray-400 text-sm">
				{rank}
			</div>

			{/* avatar */}
			{entry.avatar ? (
				<Image
					src={entry.avatar}
					alt=""
					width={40}
					height={40}
					className="w-10 h-10 rounded-full object-cover flex-shrink-0"
				/>
			) : (
				<div
					className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
					style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}
				>
					{entry.initials}
				</div>
			)}

			{/* name + meta */}
			<div className="flex-1 min-w-0">
				<div className="font-bold text-sm text-gray-800 truncate">
					{entry.name}
				</div>
				<div className="text-xs text-gray-400">
					{entry.tryoutCount} tryout
					{entry.packages ? ` · ${truncatePackages(entry.packages)}` : ""}
				</div>
			</div>

			{/* score */}
			<div className="flex flex-col items-end flex-shrink-0">
				<div className="font-black text-base text-brand">{displayScore}</div>
				<div className="text-[10px] text-gray-400">poin</div>
			</div>
		</div>
	);
}
