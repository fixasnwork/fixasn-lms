"use client";

import { useSession } from "next-auth/react";
import { PackagesSection } from "@/components/landing/PackagesSection";
import { PackageCard } from "@/components/packages/PackageCard";
import { usePackages, useUserPayments } from "@/hooks/useTryoutQueries";
import { hasPaymentAccess } from "@/lib/packageAccess";
import type { Package } from "@/lib/types";

export default function BuyPage() {
  const { data: session, status } = useSession();
  const packagesQuery = usePackages();
  const paymentsQuery = useUserPayments(session?.user?.email ?? undefined);
  const payments = paymentsQuery.data ?? [];
  const activeIds = new Set(payments.filter((payment) => hasPaymentAccess(payment)).map((payment) => payment.packageId));
  const pendingIds = new Set(payments.filter((payment) => payment.status === "pending").map((payment) => payment.packageId));

  const renderPackage = (pkg: Package) => {
    if (pkg.isTrial) {
      return <PackageCard pkg={pkg} actionHref="/tryout" />;
    }
    if (activeIds.has(pkg.id)) {
      const videoOnly = pkg.includesVideoPembelajaran && (pkg.tryoutCount ?? 0) === 0;
      return <PackageCard pkg={pkg} actionLabel="Buka" actionTone="success" actionHref={videoOnly ? "/video" : "/tryout"} />;
    }
    if (pendingIds.has(pkg.id)) {
      return <PackageCard pkg={pkg} actionLabel="Menunggu verifikasi" actionDisabled />;
    }
    return <PackageCard pkg={pkg} actionHref={`/payment?pkg=${pkg.id}`} />;
  };

  return (
    <PackagesSection
      variant="dashboard"
      packages={packagesQuery.data ?? []}
      isLoading={status === "loading" || packagesQuery.isPending || paymentsQuery.isPending}
      isError={packagesQuery.isError || paymentsQuery.isError}
      logoConfig={{ paketTitle: "Beli Paket", paketSubtitle: "Pilih paket yang sesuai kebutuhanmu dan lanjutkan belajar dari paket yang sudah aktif." }}
      renderPackage={renderPackage}
    />
  );
}
