"use client";

import { ArrowLeft, BookOpen, CircleCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Question } from "@/lib/types";
import { getAttemptStatistics } from "@/lib/tryoutResult";

function ResultRanking({ tryoutId }: { tryoutId: number }) {
  const { data, isPending, isError, refetch } = useQuery<{
    viewer: { rank: number; score: number } | null;
    participantCount: number;
  }>({
    queryKey: ["tryout-ranking", tryoutId, "all"],
    queryFn: async () => {
      const response = await fetch(`/api/tryouts/${tryoutId}/ranking?period=all`);
      if (!response.ok) throw new Error("Gagal memuat ranking");
      return response.json();
    },
    staleTime: 0,
  });
  return (
    <div className="rounded-xl bg-amber-50 p-4 text-amber-900">
      <p className="text-xs font-medium">Ranking tryout</p>
      {isPending ? <p role="status" className="mt-2 text-sm">Memuat...</p> : isError ? <button type="button" onClick={() => void refetch()} className="mt-2 cursor-pointer rounded px-1 py-2 text-xs underline focus-visible:outline-2 focus-visible:outline-amber-700">Gagal memuat. Coba lagi</button> : data?.viewer ? <p className="mt-1 text-2xl font-semibold tabular-nums">#{data.viewer.rank}<span className="ml-1 text-xs font-normal">dari {data.participantCount} peserta</span></p> : <p className="mt-2 text-sm">Ranking sedang diperbarui</p>}
    </div>
  );
}

export default function TryoutCompletion({ questions, answers, totalScore, tryoutId, onReview, onBack }: {
  questions: Question[];
  answers: Record<number, number>;
  totalScore: number;
  tryoutId?: number;
  onReview: () => void;
  onBack: () => void;
}) {
  const statistics = getAttemptStatistics(questions, answers);
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-8rem-env(safe-area-inset-bottom,0px))] w-full max-w-xl items-center justify-center py-8 sm:min-h-[calc(100dvh-9.75rem)] md:min-h-[calc(100dvh-3.5rem)]">
      <div className="w-full rounded-2xl bg-white p-6 text-center sm:p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-700 text-white"><CircleCheck aria-hidden="true" className="size-7" /></span>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">Terima kasih</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Jawaban berhasil disimpan.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <div className={`rounded-xl bg-blue-50 p-4 text-brand ${tryoutId == null ? "col-span-2 text-center" : ""}`}>
            <p className="text-xs font-medium">Total nilai</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{totalScore}</p>
          </div>
          {tryoutId != null && <ResultRanking tryoutId={tryoutId} />}
        </div>
        <div className="mt-4 overflow-hidden rounded-xl bg-slate-50 p-3 sm:p-4">
          <table className="w-full text-left text-xs sm:text-sm">
            <caption className="mb-3 text-left text-sm font-semibold text-slate-900">Statistik jawaban</caption>
            <thead><tr className="text-slate-500"><th scope="col" className="pb-2 font-medium">Kategori</th><th scope="col" className="pb-2 text-center font-medium text-emerald-700">Benar</th><th scope="col" className="pb-2 text-center font-medium text-red-700">Salah</th><th scope="col" className="pb-2 text-center font-medium">Kosong</th></tr></thead>
            <tbody>{(["TWK", "TIU", "TKP"] as const).map((category) => <tr key={category} className="tabular-nums"><th scope="row" className="py-2 font-semibold text-slate-700">{category}</th><td className="py-2 text-center font-semibold text-emerald-700">{statistics[category].correct}</td><td className="py-2 text-center font-semibold text-red-700">{statistics[category].wrong}</td><td className="py-2 text-center text-slate-500">{statistics[category].empty}</td></tr>)}</tbody>
          </table>
          <p className="mt-2 text-left text-[11px] leading-relaxed text-slate-500">TKP: benar = pilihan dengan poin tertinggi; salah = pilihan dengan poin lebih rendah. Nilai tetap mengikuti bobot pilihan.</p>
          {Object.values(statistics).some((count) => count.ungraded > 0) && <p className="mt-1 text-left text-[11px] text-slate-500">{Object.values(statistics).reduce((total, count) => total + count.ungraded, 0)} jawaban belum dapat dinilai karena kunci atau bobot belum tersedia.</p>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onBack} className="flex min-h-14 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-sm">
            <ArrowLeft aria-hidden="true" className="size-4 shrink-0" /><span>Kembali Ke Tryout</span>
          </button>
          <button type="button" onClick={onReview} className="flex min-h-14 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-3 text-xs font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:text-sm">
            <BookOpen aria-hidden="true" className="size-4 shrink-0" /><span>Pembahasan</span>
          </button>
        </div>
      </div>
    </section>
  );
}
