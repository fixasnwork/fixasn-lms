"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Card } from "@/components/ui";
import FinishedAttemptCard from "@/components/tryout/FinishedAttemptCard";
import { isPackageAvailable, isAvailable } from "@/lib/availability";
import {
  usePackages,
  useTryouts,
  useUserPayments,
  useCreateOrResumeAttempt,
  useAttemptHistory,
} from "@/hooks/useTryoutQueries";

export default function TryoutPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // ── TanStack Query hooks ──
  const { data: packages = [], isFetching: isFetchingPackages } = usePackages();
  const { data: tryoutBanks = {}, isFetching: isFetchingTryouts } =
    useTryouts();
  const userEmail = session?.user?.email ?? undefined;
  const { data: userPayments = [], isFetching: isFetchingPayments } =
    useUserPayments(userEmail);
  const { data: attemptHistory = [] } = useAttemptHistory(userEmail);
  const createOrResumeAttempt = useCreateOrResumeAttempt();

  // ── Selected tryout per package (for "Mulai" button) ──
  const [selectedTryouts, setSelectedTryouts] = useState<
    Record<number, number>
  >({});

  // ── Derived: all unique tryouts ──
  const allTryouts = (() => {
    const seen = new Set<number>();
    const result: import("@/lib/types").Tryout[] = [];
    for (const tryouts of Object.values(tryoutBanks)) {
      for (const t of tryouts) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          result.push(t);
        }
      }
    }
    return result;
  })();

  // Filter tryouts by availability
  const availableTryouts = allTryouts.filter((t) => isAvailable(t));

  // Separate trial from regular tryouts
  const trialTryout = availableTryouts.find((t) => t.isTrial);

  const isLoading =
    isFetchingTryouts || isFetchingPayments || isFetchingPackages;

  // ── Task 1.1: bestScores Map (group by tryoutId, take max totalScore) ──
  const bestScores = new Map<number, number>();
  for (const attempt of attemptHistory) {
    const current = bestScores.get(attempt.tryoutId) || 0;
    if (attempt.totalScore > current) {
      bestScores.set(attempt.tryoutId, attempt.totalScore);
    }
  }

  // ── Task 1.2: ownedPkgIds (pending or verified = access granted) ──
  const ownedPkgIds = userPayments
    .filter((p) => p.status === "pending" || p.status === "verified")
    .map((p) => p.packageId);

  // ── Task 1.3: availablePackages (date-available, not owned) ──
  const availablePackages = packages.filter(
    (p) => isPackageAvailable(p) && !ownedPkgIds.includes(p.id),
  );

  // ── Task 1.4: ownedPackages (date-available, owned) ──
  const ownedPackages = packages.filter(
    (p) => isPackageAvailable(p) && ownedPkgIds.includes(p.id),
  );

  // ── Start / resume attempt ──
  const handleStartTryout = async (tryoutId: number) => {
    const result = await createOrResumeAttempt.mutateAsync(tryoutId);
    router.push(`/tryout/${result.attempt.id}`);
  };

  // ── Render ──
  return (
    <div className="mx-auto w-full">
      <h2 className="font-black text-2xl text-brand mb-1 text-center">
        📝 Tryout SKD
      </h2>
      <p className="text-gray-400 text-sm mb-6 text-center">
        110 soal · 100 menit · TWK + TIU + TKP
      </p>

      {/* ── Loading indicator ── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Memuat data tryout...
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── Trial Card (always on top) ── */}
          {trialTryout && (
            <div className="mb-7">
              <Card
                className="border-2 border-yellow-400 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 sm:p-8 relative w-full max-w-[690px] text-center shadow-[0_14px_30px_rgba(245,197,24,0.08)]"
                style={{ borderColor: "#F5C518" }}
              >
                <div className="absolute -top-3 left-6 bg-gradient-to-br from-amber-600 to-yellow-400 text-white px-4 py-1 rounded-full text-xs font-extrabold">
                  GRATIS
                </div>
                <div className="font-extrabold text-xl text-brand mb-4 mt-2">
                  Trial SKD
                </div>
                <div className="text-amber-800 text-sm sm:text-base mb-7">
                  {trialTryout._questionCount ?? trialTryout.questions.length}{" "}
                  soal · {trialTryout.durationMin || 15} menit · TWK · TIU · TKP
                </div>
                <Button
                  variant="gold"
                  className="w-full"
                  onClick={() => handleStartTryout(trialTryout.id)}
                  disabled={createOrResumeAttempt.isPending}
                >
                  {createOrResumeAttempt.isPending
                    ? "Memuat..."
                    : "Coba Sekarang"}
                </Button>
              </Card>
            </div>
          )}

          {/* ── Beli Paket Tryout (unpurchased packages) ── */}
          {availablePackages.length > 0 && (
            <div className="mb-8">
              <h3 className="sr-only">Beli Paket Tryout</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-5">
                {availablePackages.map((pkg) => {
                  const pkgTryouts = tryoutBanks[pkg.id] || [];
                  const detailText =
                    pkgTryouts.length > 0
                      ? `${pkgTryouts.length} paket tryout · 110 soal/paket`
                      : pkg.description;

                  return (
                    <Card
                      key={pkg.id}
                      className="relative flex flex-col p-6 sm:p-7 border-dashed! border-[#CAD5E1]! bg-white/35 min-h-[160px] shadow-none!"
                    >
                      <div
                        className="absolute right-6 top-6 text-lg opacity-70"
                        aria-hidden="true"
                      >
                        🔒
                      </div>
                      <div className="font-black text-xl text-[#97A7BE] mb-4 pr-7">
                        {pkg.name}
                      </div>
                      <div className="text-sm text-center text-[#9AA9BD] mb-4">
                        {detailText}
                      </div>
                      <div className="font-black text-center text-2xl text-[#8FA0B8] mb-5">
                        Rp {pkg.price.toLocaleString("id-ID")}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full bg-transparent border-solid border-[#D2DDEA] text-[#94A3B8] shadow-none text-base py-3 mt-auto"
                        onClick={() => router.push("/buy")}
                      >
                        Beli Sekarang
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Paket Tryout Kamu (owned packages) ── */}
          {ownedPackages.length > 0 && (
            <div>
              <h3 className="font-extrabold text-lg text-brand mb-5 text-center">
                Paket Tryout Kamu
              </h3>
              <div className="flex gap-5 overflow-x-auto pt-4 pb-2 -mx-1 px-1">
                {ownedPackages.map((pkg) => {
                  // Get tryouts for this package
                  const pkgTryouts = (tryoutBanks[pkg.id] || []).filter((t) => isAvailable(t));
                  const completedCount = pkgTryouts.filter((t) =>
                    bestScores.has(t.id),
                  ).length;
                  // Selected tryout defaults to first if not explicitly selected
                  const selectedId =
                    selectedTryouts[pkg.id] ?? pkgTryouts[0]?.id;
                  const selectedTryout =
                    pkgTryouts.find((t) => t.id === selectedId) ??
                    pkgTryouts[0];

                  return (
                    <Card
                      key={pkg.id}
                      className="relative p-6 sm:p-8 border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 w-full sm:min-w-[440px] sm:max-w-[560px] shrink-0 text-center shadow-[0_14px_30px_rgba(38,99,235,0.08)] overflow-visible"
                      style={{ borderColor: "#2663EB" }}
                    >
                      <div className="absolute -top-3 left-6 z-10 bg-brand-secondary text-white px-4 py-1 rounded-full text-xs font-extrabold">
                        DIMILIKI
                      </div>
                      {/* Package header */}
                      <div className="mb-4 pt-4 text-center">
                        <div className="font-black text-xl text-brand mb-3">
                          {pkg.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {completedCount}/{pkgTryouts.length} tryout selesai
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-1.5 rounded-full bg-[#BFDBFE] mb-4" />

                      {/* Tryout list */}
                      {pkgTryouts.length === 0 ? (
                        <div className="text-sm text-gray-400 py-4">
                          Tidak ada tryout aktif
                        </div>
                      ) : (
                      <div className="flex flex-col gap-2">
                        {pkgTryouts.map((t) => {
                          const score = bestScores.get(t.id);
                          const hasScore = score !== undefined;

                          const isSelected = t.id === selectedId;

                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() =>
                                setSelectedTryouts((prev) => ({
                                  ...prev,
                                  [pkg.id]: t.id,
                                }))
                              }
                              disabled={createOrResumeAttempt.isPending}
                              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                                isSelected
                                  ? "border-brand-secondary bg-[#DBEAFE] text-brand-secondary"
                                  : "border-gray-200 bg-white text-gray-600 shadow-sm"
                              } ${createOrResumeAttempt.isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-brand-secondary/70"}`}
                            >
                              <div>
                                <div className="font-extrabold text-sm">
                                  {t.name}
                                </div>
                                {hasScore && (
                                  <div
                                    className={`text-xs ${isSelected ? "text-blue-500" : "text-gray-400"}`}
                                  >
                                    {score} poin
                                  </div>
                                )}
                              </div>
                              <span
                                className={`text-lg leading-none ${isSelected ? "text-brand-secondary" : "text-gray-400"}`}
                              >
                                {isSelected ? "▶" : "○"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      )}
                      {selectedTryout && pkgTryouts.length > 0 && (
                        <Button
                          variant="primary"
                          className="mt-4 w-full text-base py-3"
                          onClick={() => handleStartTryout(selectedTryout.id)}
                          disabled={createOrResumeAttempt.isPending}
                        >
                          {createOrResumeAttempt.isPending
                            ? "Memuat..."
                            : `Mulai ${selectedTryout.name}`}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {availablePackages.length === 0 && ownedPackages.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Belum ada paket tryout tersedia.
            </div>
          )}

          {/* ── Daftar Tryout Selesai ── */}
          {(() => {
            // Build a lookup: tryoutId → { packageId, packageName }
            const tryoutToPackage = new Map<
              number,
              { packageId: number; packageName: string }
            >();
            for (const pkg of packages) {
              const pkgTryouts = tryoutBanks[pkg.id];
              if (pkgTryouts) {
                for (const t of pkgTryouts) {
                  tryoutToPackage.set(t.id, {
                    packageId: pkg.id,
                    packageName: pkg.name,
                  });
                }
              }
            }

            // Active, owned package IDs
            const activeOwnedPkgIds = ownedPkgIds.filter((pid) => {
              const pkg = packages.find((p) => p.id === pid);
              return pkg ? isPackageAvailable(pkg) : false;
            });

            // Finished attempts whose tryout is in an active + owned package
            // Trial attempts are included (trial is effectively available).
            const finishedAttempts = attemptHistory
              .filter((a) => {
                if (!a.finishedAt) return false;
                const pkgInfo = tryoutToPackage.get(a.tryoutId);
                if (!pkgInfo) {
                  // No package mapping found — could be a standalone/trial tryout
                  return activeOwnedPkgIds.length > 0 && packages.length > 0;
                }
                return activeOwnedPkgIds.includes(pkgInfo.packageId);
              })
              .sort(
                (a, b) =>
                  new Date(b.finishedAt!).getTime() -
                  new Date(a.finishedAt!).getTime()
              );

            return finishedAttempts.length > 0 ? (
              <div className="mt-8">
                <h3 className="font-extrabold text-lg text-brand mb-4 text-center">
                  Daftar Tryout Selesai
                </h3>
                <div className="flex flex-col gap-3 w-full">
                  {finishedAttempts.map((att) => {
                    const pkgInfo = tryoutToPackage.get(att.tryoutId);
                    const tryoutData = allTryouts.find(
                      (t) => t.id === att.tryoutId
                    );
                    return (
                      <FinishedAttemptCard
                        key={att.id}
                        attemptId={att.id}
                        tryoutName={
                          tryoutData?.name ?? `Tryout #${att.tryoutId}`
                        }
                        packageName={pkgInfo?.packageName ?? "-"}
                        finishedAt={att.finishedAt!}
                        totalScore={att.totalScore}
                        twkScore={att.twkScore}
                        tiuScore={att.tiuScore}
                        tkpScore={att.tkpScore}
                        onView={(id) => router.push(`/tryout/${id}`)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <p className="text-sm font-semibold text-gray-500">
                  Belum ada tryout yang selesai dikerjakan.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Setelah menyelesaikan tryout, kamu bisa melihat
                  pembahasannya di sini.
                </p>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
