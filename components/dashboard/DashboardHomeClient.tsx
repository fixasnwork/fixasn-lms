"use client";

import Link from "next/link";
import { ArrowUpRight, ChartNoAxesColumnIncreasing, CheckCheck, ClipboardList, PlaySquare, RotateCcw, Trophy } from "lucide-react";
import { Card } from "@/components/ui";
import { Skeleton } from "@/components/shadcn/skeleton";
import { useDashboardSummaryQuery } from "@/hooks/useDashboardSummary";
import DashboardPackageRecommendations from "./DashboardPackageRecommendations";
import DashboardOpenTryouts from "./DashboardOpenTryouts";

const categories = [
  { key: "twk", label: "TWK", name: "Wawasan Kebangsaan", color: "bg-brand-secondary" },
  { key: "tiu", label: "TIU", name: "Intelegensia Umum", color: "bg-teal-500" },
  { key: "tkp", label: "TKP", name: "Karakteristik Pribadi", color: "bg-amber-400" },
] as const;

const quickActions = [
  { href: "/tryout", icon: ClipboardList, title: "Tryout SKD", description: "Mulai atau lanjutkan latihanmu", color: "bg-brand/5 text-brand" },
  { href: "/video", icon: PlaySquare, title: "Video Belajar", description: "Pelajari materi sesuai kebutuhanmu", color: "bg-teal-50 text-teal-700" },
  { href: "/ranking", icon: Trophy, title: "Ranking", description: "Lihat posisimu di antara peserta", color: "bg-amber-50 text-amber-700" },
] as const;

export default function DashboardHomeClient({ userName }: { userName: string }) {
  const { data: summary, isPending, isError, isFetching, refetch } = useDashboardSummaryQuery();
  const hasSummary = !!summary;
  const hasPerformance = !!summary && (summary.completedTryouts > 0 || categories.some(({ key }) => summary.categoryScores[key] > 0));
  const chartMax = Math.max(1, ...categories.map(({ key }) => summary?.categoryScores[key] ?? 0));
  const statistics = [
    { label: "Sisa Tryout", value: summary?.remainingTryouts ?? 0, description: summary?.remainingTryouts ? "Tryout yang sedang berjalan" : "Belum ada tryout berjalan", icon: ClipboardList, color: "bg-blue-50 text-brand-secondary" },
    { label: "Tryout Selesai", value: summary?.completedTryouts ?? 0, description: summary?.completedTryouts ? "Terus tingkatkan kemampuanmu" : "Mulai tryout pertamamu", icon: CheckCheck, color: "bg-teal-50 text-teal-700" },
    { label: "Peringkat", value: summary?.rank == null ? "—" : `#${summary.rank.toLocaleString("id-ID")}`, description: summary?.rank == null ? "Selesaikan tryout untuk mendapat peringkat" : "Peringkat keseluruhan peserta", icon: Trophy, color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="mx-auto grid w-full max-w-[1440px] min-w-0 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,2.25fr)_minmax(280px,1fr)]">
        <header className="min-w-0 pt-1 xl:col-span-2">
          <p className="mb-2 text-sm font-medium text-slate-500">Halo, {userName.trim().split(/\s+/)[0] || "Pengguna"}</p>
          <h1 id="dashboard-title" className="text-2xl leading-tight font-semibold tracking-tight text-slate-900 sm:text-3xl">Selangkah lebih dekat <span className="text-brand">menuju ASN.</span></h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">Bangun kesiapanmu, satu latihan setiap hari.</p>
        </header>

        {isError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 xl:col-span-2">
            <p>{hasSummary ? "Statistik belum berhasil diperbarui. Menampilkan data terakhir." : "Statistik belum berhasil dimuat."}</p>
            <button type="button" disabled={isFetching} onClick={() => void refetch()} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"><RotateCcw aria-hidden="true" className="size-4" />{isFetching ? "Memuat..." : "Coba Lagi"}</button>
          </div>
        )}

      <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
        <div aria-label="Ringkasan tryout" aria-busy={isPending} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {statistics.map(({ label, value, description, icon: Icon, color }) => (
            <Card key={label} className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2.5"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon aria-hidden="true" className="size-4" /></span><h2 className="text-sm font-medium text-slate-600">{label}</h2></div>
              {isPending ? (
                <div role="status" className="mt-3"><span className="sr-only">Memuat {label}</span><Skeleton className="h-9 w-20" /><Skeleton className="mt-1 h-3 w-full max-w-36" /></div>
              ) : (
                <><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{hasSummary ? typeof value === "number" ? value.toLocaleString("id-ID") : value : "—"}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{hasSummary ? description : "Data belum tersedia"}</p></>
              )}
            </Card>
          ))}
        </div>

        {summary && <DashboardOpenTryouts tryouts={summary.openTryouts ?? []} />}
        <DashboardPackageRecommendations />
      </div>

      <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      <Card className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Performa SKD</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Rata-rata skor dari hasil selesai terbaru setiap tryout dalam paket aktif.</p></div><ChartNoAxesColumnIncreasing aria-hidden="true" className="size-5 shrink-0 text-brand" /></div>
        {isPending ? (
          <div role="status" className="mt-6 flex flex-1 items-end gap-4"><span className="sr-only">Memuat performa SKD</span><Skeleton className="h-24 flex-1" /><Skeleton className="h-40 flex-1" /><Skeleton className="h-32 flex-1" /></div>
        ) : !hasSummary ? (
          <p className="flex flex-1 items-center py-10 text-sm leading-relaxed text-slate-500">Performa akan ditampilkan setelah statistik berhasil dimuat. Gunakan Coba Lagi untuk memuat ulang.</p>
        ) : hasPerformance ? (
          <div className="mt-6 flex flex-1 flex-col justify-end">
            <div className="grid grid-cols-3 items-end gap-4" aria-label="Rata-rata skor per kategori">
              {categories.map(({ key, label, color }) => (
                <div key={key} className="min-w-0 text-center"><div className="flex h-36 flex-col justify-end gap-2"><span className="text-sm font-semibold text-slate-800 tabular-nums">{summary.categoryScores[key].toLocaleString("id-ID", { maximumFractionDigits: 1 })}</span><div aria-hidden="true" className={`mx-auto w-full max-w-14 rounded-t-lg ${color}`} style={{ height: `${(summary.categoryScores[key] / chartMax) * 112}px` }} /></div><span className="mt-3 block text-xs font-medium text-slate-500">{label}</span></div>
              ))}
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-2">{categories.map(({ key, label, name, color }) => <li key={key} title={name} className="flex items-center gap-1.5 text-[11px] text-slate-500"><span aria-hidden="true" className={`size-2 rounded-full ${color}`} />{label}</li>)}</ul>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-7 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand/5 text-brand"><ChartNoAxesColumnIncreasing aria-hidden="true" className="size-6" /></span><h3 className="text-sm font-semibold text-slate-900">Kenali kemampuan awalmu</h3><p className="mt-2 max-w-64 text-xs leading-relaxed text-slate-500">Hasil TWK, TIU, dan TKP akan muncul setelah kamu menyelesaikan tryout.</p>
            <Link href="/tryout" className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Lihat Tryout <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
          </div>
        )}
      </Card>

      <Card className="min-w-0">
        <h2 className="font-semibold text-slate-900">Aksi Cepat</h2><p className="mt-1 text-xs text-slate-500">Pilih langkah belajarmu hari ini.</p>
        <div className="mt-5 space-y-2">{quickActions.map(({ href, icon: Icon, title, description, color }) => (
          <Link key={href} href={href} className="group flex min-h-20 items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon aria-hidden="true" className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span></span><ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand" /></Link>
        ))}</div>
        <p className="mt-5 rounded-xl bg-brand/5 p-3 text-xs leading-relaxed text-brand">Konsistensi kecil hari ini jadi bekal besar saat ujian nanti.</p>
      </Card>
      </div>
    </div>
  );
}
