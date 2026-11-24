"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Crown, Trophy } from "lucide-react";
import type { RankingEntry } from "@/lib/ranking";

type Metric = "totalScore" | "twkScore" | "tiuScore" | "tkpScore";

interface Props {
  all: RankingEntry[];
  viewerUserId?: string;
}

const metrics: { value: Metric; label: string }[] = [
  { value: "totalScore", label: "Total skor" },
  { value: "twkScore", label: "TWK" },
  { value: "tiuScore", label: "TIU" },
  { value: "tkpScore", label: "TKP" },
];
const number = new Intl.NumberFormat("id-ID");
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-secondary";

function Avatar({ entry, podium = false }: { entry: RankingEntry; podium?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = podium ? "size-16 sm:size-24" : "size-10 sm:size-12";
  return entry.avatar && !failed ? (
    <Image src={entry.avatar} alt="" width={96} height={96}
      className={`${size} shrink-0 rounded-full object-cover`} onError={() => setFailed(true)} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-blue-50 font-extrabold text-brand ${podium ? "text-xl sm:text-3xl" : "text-sm"}`}>
      {entry.initials}
    </span>
  );
}

const podiumStyles = [
  { frame: "bg-amber-200", badge: "bg-amber-400 text-amber-950", bar: "bg-amber-400", text: "text-amber-700", fill: "bg-amber-50" },
  { frame: "bg-cyan-200", badge: "bg-cyan-500 text-white", bar: "bg-cyan-400", text: "text-cyan-700", fill: "bg-cyan-50" },
  { frame: "bg-rose-200", badge: "bg-rose-500 text-white", bar: "bg-rose-400", text: "text-rose-600", fill: "bg-rose-50" },
];

function Winners({ entries }: { entries: RankingEntry[] }) {
  // Visual order follows the reference: runner-up, winner, third place.
  const places = entries.length === 1 ? [0] : entries.length === 2 ? [1, 0] : [1, 0, 2];
  return (
    <div className="mx-auto flex max-w-3xl items-end justify-center gap-3 pt-12 sm:gap-8 sm:pt-14">
      {places.map((place) => {
        const entry = entries[place];
        const style = podiumStyles[place];
        return (
          <div key={entry.userId} className="flex min-w-0 max-w-64 flex-1 flex-col items-center text-center">
            <div className={`relative rounded-full p-1.5 ${style.frame} ${place === 0 ? "mb-2 scale-110 sm:mb-4 sm:scale-115" : ""}`}>
              {place === 0 && <Crown aria-hidden="true" className="absolute -top-9 left-1/2 size-8 -translate-x-1/2 fill-amber-300 text-amber-500 sm:-top-10 sm:size-9" strokeWidth={1.5} />}
              <div className="rounded-full bg-white p-1"><Avatar key={entry.avatar} entry={entry} podium /></div>
              <span className={`absolute -bottom-2 left-1/2 min-w-16 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-black tabular-nums sm:text-sm ${style.badge}`}>
                {place + 1}
              </span>
            </div>
            <p title={entry.name} className="mt-6 w-full truncate text-xs font-extrabold text-slate-900 sm:text-base">{entry.name}</p>
            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">{entry.tryoutCount} tryout</p>
            <span className="mt-3 text-[10px] font-bold text-slate-600 sm:text-xs">Total nilai {number.format(entry.totalScore)}</span>
            <div aria-hidden="true" className={`mt-5 h-1.5 w-full rounded-full sm:mt-7 ${style.bar}`} />
          </div>
        );
      })}
    </div>
  );
}

export function RankingParticipant({ entry, rank, metric, viewer = false, compact = false }: {
  entry: RankingEntry; rank: number; metric: Metric; viewer?: boolean; compact?: boolean;
}) {
  return (
    <div className={`grid items-center ${compact ? "gap-3 rounded-xl bg-slate-50/80 p-3" : `gap-x-4 gap-y-5 rounded-2xl p-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-6 ${viewer ? "bg-blue-50/70" : "bg-white"}`}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span aria-label={`Peringkat ${rank}`} className={`min-w-7 shrink-0 text-center text-sm font-extrabold tabular-nums ${viewer ? "text-brand-secondary" : "text-slate-400"}`}>{compact ? `#${rank}` : rank}</span>
        <Avatar key={`${entry.userId}-${entry.avatar}`} entry={entry} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`${compact ? "wrap-break-word" : "truncate"} text-sm font-extrabold text-slate-900`} title={entry.name}>{entry.name}</p>
            {viewer && <span className="shrink-0 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-secondary">Kamu</span>}
          </div>
          {compact ? (
            <p className="mt-1 text-xs text-slate-500"><span>Total skor</span>: <strong className="font-bold tabular-nums text-brand">{number.format(entry.totalScore)}</strong></p>
          ) : (
            <p className="mt-1 truncate text-xs text-slate-400" title={entry.packages}>{entry.tryoutCount} tryout{entry.packages ? ` · ${entry.packages}` : ""}</p>
          )}
        </div>
      </div>
      {!compact && <dl className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50/80 px-3 py-3 lg:bg-transparent lg:p-0">
        {metrics.map(({ value, label }) => (
          <div key={value} className="text-center lg:text-left">
            <dt className={`text-[10px] sm:text-xs ${metric === value ? "font-semibold text-brand-secondary" : "text-slate-400"}`}>{label}</dt>
            <dd className={`mt-1.5 text-sm font-extrabold tabular-nums sm:text-base ${metric === value ? "text-brand" : "text-slate-700"}`}>{number.format(entry[value])}</dd>
          </div>
        ))}
      </dl>}
    </div>
  );
}

export default function GlobalRanking({ all, viewerUserId }: Props) {
  const [metric, setMetric] = useState<Metric>("totalScore");
  const entries = useMemo(() => [...all].sort((a, b) => b[metric] - a[metric]), [all, metric]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Leaderboard</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">Ranking Nasional</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">Setiap latihan membawamu lebih dekat ke puncak. Lihat pencapaianmu di sini.</p>
        </div>
        <Link href="/tryout" className={`inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-brand transition-colors hover:bg-blue-50 ${focus}`}>Kerjakan tryout <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
      </header>

      <section aria-label="Papan peringkat" className="rounded-3xl bg-white p-4 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-brand"><Trophy aria-hidden="true" className="size-4 text-amber-500" /> Bintang tryout</h2>
          <div role="group" aria-label="Jenis skor" className="flex max-w-full flex-wrap gap-1 rounded-xl bg-slate-50 p-1">
            {metrics.map(({ value, label }) => (
              <button key={value} type="button" aria-pressed={metric === value} onClick={() => setMetric(value)} className={`rounded-lg px-3 py-2.5 text-[11px] font-bold transition-colors sm:text-xs ${focus} ${metric === value ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-100"}`}>{label}</button>
            ))}
          </div>
        </div>
        {entries.length > 0 ? <Winners entries={entries.slice(0, 3)} /> : (
          <div className="px-4 py-16 text-center">
            <Trophy aria-hidden="true" className="mx-auto mb-4 size-10 text-amber-400" />
            <h3 className="text-lg font-extrabold text-brand">Belum ada ranking</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Belum ada peserta di papan peringkat. Kerjakan tryout dan mulai perjalananmu ke puncak.</p>
            <Link href="/tryout" className={`mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white ${focus}`}>Mulai tryout</Link>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Diurutkan berdasarkan <span className="font-semibold text-slate-600">{metrics.find((item) => item.value === metric)?.label}</span></p>
        </div>
      </section>

      {entries.length > 0 && (
        <section aria-labelledby="all-rankings" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="all-rankings" className="text-sm font-extrabold text-brand">Peringkat peserta</h2>
            <span className="text-xs text-slate-400">{entries.length} peserta ditampilkan · Maks. 100 besar</span>
          </div>
          <ol aria-label="Daftar peringkat peserta" className="space-y-2.5">
            {entries.map((entry, index) => <li key={entry.userId}><RankingParticipant entry={entry} rank={index + 1} metric={metric} viewer={entry.userId === viewerUserId} /></li>)}
          </ol>
          <p className="px-1 pt-1 text-xs leading-relaxed text-slate-400">Skor merupakan akumulasi hasil terbaik dari setiap tryout sepanjang waktu.</p>
        </section>
      )}
    </div>
  );
}
