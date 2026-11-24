"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, ArrowUpRight, CirclePlay, ClipboardList, History, ListOrdered, Trophy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Highlight } from "@/components/landing/Highlight";
import FinishedAttemptCard from "@/components/tryout/FinishedAttemptCard";
import { Skeleton } from "@/components/shadcn/skeleton";
import { useDashboardSummaryQuery } from "@/hooks/useDashboardSummary";
import {
  useAllTryouts,
  useAttemptHistory,
  useCreateOrResumeAttempt,
  usePackages,
  useTryouts,
  useUserPayments,
} from "@/hooks/useTryoutQueries";
import { isAvailable } from "@/lib/availability";
import { hasPaymentAccess } from "@/lib/packageAccess";
import type { Tryout } from "@/lib/types";

const RECENT_RESULTS = 3;
const secondaryAction = "inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand/5 px-3 text-sm font-semibold text-brand hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const headerAction = "inline-flex min-h-11 items-center gap-1 rounded-md text-xs font-semibold text-brand-secondary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";
const surface = "rounded-2xl bg-white p-4 sm:p-5";
const sectionHeading = "flex items-center gap-2 font-semibold text-slate-900";
const sectionIcon = "size-4 shrink-0";
const sectionUnderline = "-bottom-1.5 h-1.5";

export default function TryoutPageClient({ rankingPreview }: { rankingPreview: ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? undefined;
  const packagesQuery = usePackages();
  const tryoutsQuery = useTryouts();
  const allTryoutsQuery = useAllTryouts();
  const paymentsQuery = useUserPayments(email);
  const historyQuery = useAttemptHistory(email);
  const rankingQuery = useDashboardSummaryQuery();
  const createOrResume = useCreateOrResumeAttempt();
  const [showAllResults, setShowAllResults] = useState(false);

  const packages = packagesQuery.data ?? [];
  const tryoutBanks = tryoutsQuery.data ?? {};
  const payments = paymentsQuery.data ?? [];
  const attempts = historyQuery.data ?? [];
  const queries = [packagesQuery, tryoutsQuery, allTryoutsQuery, paymentsQuery, historyQuery];
  const isLoading = status === "loading" || queries.some((query) => query.isLoading);
  const hasError = queries.some((query) => query.isError);
  const now = new Date();

  const activePayments = payments.filter((payment) => hasPaymentAccess(payment, now));
  const ownedPackages = packages.filter((pkg) => activePayments.some((payment) => payment.packageId === pkg.id));
  const accessibleTryouts = new Map<number, { tryout: Tryout; packageName?: string }>();
  for (const tryout of allTryoutsQuery.data ?? []) {
    if (tryout.isTrial) accessibleTryouts.set(tryout.id, { tryout });
  }
  for (const pkg of ownedPackages) {
    for (const tryout of tryoutBanks[pkg.id] ?? []) {
      if (!accessibleTryouts.has(tryout.id)) {
        accessibleTryouts.set(tryout.id, { tryout, packageName: pkg.name });
      }
    }
  }

  const latestAttempts = new Map<number, (typeof attempts)[number]>();
  const bestScores = new Map<number, number>();
  const results = attempts.flatMap((attempt) => {
    const entry = accessibleTryouts.get(attempt.tryoutId);
    if (attempt.deletedAt || !entry) return [];
    if (!latestAttempts.has(attempt.tryoutId)) latestAttempts.set(attempt.tryoutId, attempt);
    if (!attempt.finishedAt) return [];
    const best = bestScores.get(attempt.tryoutId);
    bestScores.set(attempt.tryoutId, best === undefined ? attempt.totalScore : Math.max(best, attempt.totalScore));
    return [{ ...entry, attempt, finishedAt: attempt.finishedAt }];
  }).sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt));

  const accessible = [...accessibleTryouts.values()];
  const resumable = accessible.flatMap((entry) => {
    const attempt = latestAttempts.get(entry.tryout.id);
    if (!attempt || attempt.finishedAt) return [];
    const { tryout } = entry;
    const questionCount = tryout._questionCount ?? tryout.questions.length;
    const answeredCount = attempt.answers?.filter(({ selectedOption, questionIndex }) =>
      selectedOption >= 0 && questionIndex >= 0 && questionIndex < questionCount
    ).length ?? 0;
    return attempt.timeLeftSeconds != null || answeredCount > 0 ? [{ ...entry, attempt, answeredCount }] : [];
  }).sort((a, b) => Date.parse(b.attempt.updatedAt ?? b.attempt.createdAt) - Date.parse(a.attempt.updatedAt ?? a.attempt.createdAt));
  const resumableIds = new Set(resumable.map(({ tryout }) => tryout.id));
  const open = accessible.filter(({ tryout }) => !resumableIds.has(tryout.id) && isAvailable(tryout, now))
    .sort((a, b) => Number(b.tryout.isTrial) - Number(a.tryout.isTrial) || a.tryout.sortOrder - b.tryout.sortOrder || a.tryout.id - b.tryout.id);
  const visibleResults = showAllResults ? results : results.slice(0, RECENT_RESULTS);
  const rank = rankingQuery.data?.rank;

  function renderTryout(tryout: Tryout, packageName?: string, answeredCount?: number) {
    const questionCount = tryout._questionCount ?? tryout.questions.length;
    const score = bestScores.get(tryout.id);
    const action = answeredCount !== undefined ? "Lanjutkan" : score !== undefined ? "Ulangi" : "Mulai";
    const actionColor = answeredCount !== undefined
      ? "bg-amber-300 text-amber-950 hover:bg-amber-400 focus-visible:outline-amber-700"
      : "bg-brand text-white hover:bg-brand-dark focus-visible:outline-brand";
    const isCurrent = createOrResume.variables === tryout.id;
    const isOpening = isCurrent && createOrResume.isPending;
    const progress = questionCount > 0 ? (answeredCount ?? 0) / questionCount * 100 : 0;

    return (
      <li key={tryout.id} className={`${surface} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/5 text-brand">
            <ClipboardList aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="wrap-break-word font-semibold text-slate-900">{tryout.name}</h3>
            <p className="mt-1 text-xs text-slate-600">
              {[tryout.isTrial ? "Gratis" : packageName, `${questionCount} soal`, `${tryout.durationMin} menit`].filter(Boolean).join(" · ")}
            </p>
            {answeredCount !== undefined && (
              <>
                <p className="mt-2 text-xs font-medium text-slate-700">{answeredCount} dari {questionCount} soal terjawab</p>
                <div aria-hidden="true" className="mt-2 h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-brand/10">
                  <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${progress}%` }} />
                </div>
              </>
            )}
            {answeredCount === undefined && score !== undefined && (
              <p className="mt-2 text-xs font-semibold text-brand">Skor terbaik {score}</p>
            )}
            {isCurrent && createOrResume.isError && (
              <p role="alert" className="mt-2 text-xs text-red-700">Tryout belum bisa dibuka. Coba lagi atau muat ulang halaman.</p>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={createOrResume.isPending}
          aria-label={`${action} ${tryout.name}`}
          onClick={() => createOrResume.mutate(tryout.id, {
            onSuccess: ({ attempt }) => router.push(`/tryout/${attempt.id}`),
          })}
          className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 self-end rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 sm:self-auto ${actionColor}`}
        >
          {isOpening ? "Membuka..." : action}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </li>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pt-3 sm:pt-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Tryout SKD</h1>

      {isLoading ? (
        <div role="status" className="space-y-3">
          <span className="sr-only">Memuat data tryout...</span>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : hasError ? (
        <div role="alert" className={`${surface} flex flex-wrap items-center gap-3`}>
          <p className="text-sm text-red-700">Data tryout belum berhasil dimuat.</p>
          <button type="button" className={secondaryAction} onClick={() => {
            for (const query of queries) if (query.isError) void query.refetch();
          }}>Coba Lagi</button>
        </div>
      ) : (
        <div className="grid items-start gap-x-6 gap-y-9 sm:gap-y-12 xl:grid-cols-[minmax(0,2.25fr)_minmax(16rem,1fr)]">
          <div className="min-w-0 space-y-9 sm:space-y-12">
            {payments.some((payment) => payment.status === "pending") && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Pembayaran menunggu verifikasi admin. Akses paket dimulai setelah diverifikasi.
              </p>
            )}
            {resumable.length > 0 && (
              <section aria-labelledby="resume-title" className="space-y-3">
                <h2 id="resume-title" className={sectionHeading}>
                  <CirclePlay aria-hidden="true" className={`${sectionIcon} text-amber-700`} />
                  <Highlight lineClassName={`${sectionUnderline} text-amber-400`}>Lanjutkan Tryout</Highlight>
                </h2>
                <ul className="space-y-2">
                  {resumable.map(({ tryout, packageName, answeredCount }) => renderTryout(tryout, packageName, answeredCount))}
                </ul>
              </section>
            )}

            <section aria-labelledby="open-title" className="space-y-3">
              <h2 id="open-title" className={sectionHeading}>
                <ClipboardList aria-hidden="true" className={`${sectionIcon} text-brand-secondary`} />
                <Highlight lineClassName={`${sectionUnderline} text-blue-400`}>Daftar Tryout</Highlight>
              </h2>
              {open.length > 0 ? (
                <ul className="space-y-2">{open.map(({ tryout, packageName }) => renderTryout(tryout, packageName))}</ul>
              ) : (
                <p className={`${surface} text-sm text-slate-600`}>
                  {resumable.length ? "Belum ada tryout lain yang bisa dimulai." : "Belum ada tryout yang bisa dimulai."}
                </p>
              )}
            </section>

            <section aria-labelledby="results-title" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-4">
                <h2 id="results-title" className={sectionHeading}>
                  <History aria-hidden="true" className={`${sectionIcon} text-teal-700`} />
                  <Highlight lineClassName={`${sectionUnderline} text-teal-400`}>Hasil Terakhir</Highlight>
                </h2>
                {results.length > RECENT_RESULTS && (
                  <button
                    type="button"
                    aria-expanded={showAllResults}
                    aria-controls="tryout-results"
                    onClick={() => setShowAllResults(!showAllResults)}
                    className={`${headerAction} cursor-pointer`}
                  >
                    {showAllResults ? "Tampilkan Lebih Sedikit" : "Lihat Semua Riwayat"}
                    {!showAllResults && <ArrowUpRight aria-hidden="true" className="size-3.5" />}
                  </button>
                )}
              </div>
              {results.length === 0 ? (
                <p className={`${surface} text-sm text-slate-600`}>Belum ada hasil tryout yang bisa dibuka.</p>
              ) : (
                <ul id="tryout-results" className="space-y-2">
                  {visibleResults.map(({ attempt, tryout, packageName, finishedAt }) => (
                      <li key={attempt.id}>
                        <FinishedAttemptCard
                          attemptId={attempt.id}
                          tryoutName={tryout.name}
                          packageName={packageName ?? "Trial SKD"}
                          finishedAt={finishedAt}
                          totalScore={attempt.totalScore}
                          twkScore={attempt.twkScore}
                          tiuScore={attempt.tiuScore}
                          tkpScore={attempt.tkpScore}
                          onView={(id) => router.push(`/tryout/${id}`)}
                        />
                      </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside aria-labelledby="ranking-title" className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <h2 id="ranking-title" className={sectionHeading}>
                <ListOrdered aria-hidden="true" className={`${sectionIcon} text-violet-700`} />
                <Highlight lineClassName={`${sectionUnderline} text-violet-400`}>Ranking SKD</Highlight>
              </h2>
              <Link
                href="/ranking"
                aria-label="Lihat ranking SKD lengkap"
                className={headerAction}
              >
                Lihat Lengkap <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
            <div className={surface}>
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Trophy aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-600">Peringkat Kamu</p>
                  {rank != null ? (
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">#{rank.toLocaleString("id-ID")}</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">
                      {rankingQuery.isLoading ? "Memuat peringkat..." : rankingQuery.isError ? "Peringkat belum berhasil dimuat." : "Selesaikan tryout untuk mendapat peringkat."}
                    </p>
                  )}
                </div>
              </div>
              {rankingPreview}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
