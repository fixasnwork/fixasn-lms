"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight, PackageOpen, RotateCcw } from "lucide-react";
import { PackageCard } from "@/components/packages/PackageCard";
import { Skeleton } from "@/components/shadcn/skeleton";
import { usePackages, useUserPayments } from "@/hooks/useTryoutQueries";
import { isAvailable } from "@/lib/availability";
import { hasPaymentAccess } from "@/lib/packageAccess";

export default function DashboardPackageRecommendations() {
  const { data: session } = useSession();
  const catalogQuery = usePackages();
  const paymentsQuery = useUserPayments(session?.user?.email ?? undefined);
  const isError = catalogQuery.isError || paymentsQuery.isError;
  const isPending = !isError && (catalogQuery.isPending || paymentsQuery.isPending);
  const isFetching = catalogQuery.isFetching || paymentsQuery.isFetching;
  const availablePackages = (catalogQuery.data ?? []).filter((pkg) =>
    isAvailable(pkg) && ((pkg.tryoutCount ?? 0) > 0 || !pkg.includesVideoPembelajaran),
  );
  const ownedOrPendingIds = new Set(
    (paymentsQuery.data ?? [])
      .filter((payment) => payment.status === "pending" || hasPaymentAccess(payment))
      .map((payment) => payment.packageId),
  );
  // Wait for ownership data before showing any package recommendations.
  const recommendations = isPending || isError ? [] : availablePackages
    .filter((pkg) => pkg.isTrial || !ownedOrPendingIds.has(pkg.id))
    .sort((a, b) => Number(b.isTrial) - Number(a.isTrial))
    .slice(0, 3);

  const retry = () => {
    void catalogQuery.refetch();
    void paymentsQuery.refetch();
  };

  return (
    <section aria-labelledby="recommended-packages-title" className="@container min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="recommended-packages-title" className="font-semibold text-slate-900">Rekomendasi Paket Tryout</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Pilihan paket untuk menemani persiapan SKD-mu.</p></div>
        <Link href="/buy" className="inline-flex min-h-9 items-center gap-1 rounded-lg text-xs font-semibold text-brand hover:text-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Lihat Semua <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
      </div>

      {isError && (
        <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p>{paymentsQuery.isError ? "Status pembelian belum berhasil dimuat. Coba lagi untuk melihat rekomendasi paket." : "Paket belum berhasil dimuat."}</p>
          <button type="button" disabled={isFetching} onClick={retry} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"><RotateCcw aria-hidden="true" className="size-4" />{isFetching ? "Memuat..." : "Coba Lagi"}</button>
        </div>
      )}

      {isPending ? (
        <div role="status" className="mt-5 grid gap-4 @min-[560px]:grid-cols-3">
          <span className="sr-only">Memuat rekomendasi paket</span>
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl bg-card p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-5 h-6 w-3/4" />
              <Skeleton className="mt-3 h-12 w-full" />
              <div className="mt-5 space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /></div>
              <Skeleton className="mt-8 h-8 w-2/3" />
              <Skeleton className="mt-4 h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className="mt-5 grid gap-4 @min-[560px]:grid-cols-3">
          {recommendations.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} actionHref={pkg.isTrial ? "/tryout" : `/buy#paket-${pkg.id}`} actionLabel={pkg.isTrial ? "Coba Gratis" : "Lihat Paket"} />
          ))}
        </div>
      ) : !isError && (
        <div className="flex flex-col items-center py-12 text-center">
          <PackageOpen aria-hidden="true" className="mb-4 size-9 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">{availablePackages.length ? "Tidak ada rekomendasi paket baru" : "Belum ada paket tryout tersedia"}</h3>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">{availablePackages.length ? "Paket yang tersedia sudah aktif atau sedang menunggu verifikasi. Lanjutkan latihanmu di halaman Tryout SKD." : "Paket yang tersedia akan muncul di sini. Kamu tetap bisa melihat latihanmu di halaman Tryout SKD."}</p>
          <Link href="/tryout" className="mt-5 rounded-lg py-2 text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Lihat Tryout</Link>
        </div>
      )}
    </section>
  );
}
