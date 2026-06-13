"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Package } from "@/lib/types";
import { Card, Badge, Button } from "@/components/ui";
import { isPackageAvailable } from "@/lib/availability";
import { usePackages, useUserPayments } from "@/hooks/useTryoutQueries";

export default function BuyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: packages = [], isFetching: isFetchingPackages } = usePackages();
  const { data: userPayments = [], isFetching: isFetchingPayments } =
    useUserPayments(session?.user?.email ?? undefined);

  const ownedPkgIds = userPayments
    .filter(
      (payment) =>
        payment.status === "pending" || payment.status === "verified",
    )
    .map((payment) => payment.packageId);

  const handleBuy = (pkg: Package) => {
    if (!isPackageAvailable(pkg) || ownedPkgIds.includes(pkg.id)) return;
    router.push(`/payment?pkg=${pkg.id}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-black text-2xl text-brand mb-1">
          🛒 Beli Paket
        </h2>
        <p className="text-gray-400 text-sm">
          Pilih paket yang sesuai kebutuhanmu
        </p>
      </div>

      {/* Tryout packages */}
      <div className="mb-8">
        <h3 className="font-extrabold text-base text-brand mb-4 flex items-center gap-2">
          📝 Paket Tryout SKD
        </h3>
        {(isFetchingPackages || isFetchingPayments) && (
          <p className="text-sm text-gray-400 mb-4">Memuat paket...</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages
            .filter((p) => isPackageAvailable(p))
            .map((pkg) => {
              const owned = ownedPkgIds.includes(pkg.id);
              return (
                <Card
                  key={pkg.id}
                  className={`relative overflow-hidden border-2 ${
                    owned ? "border-green-200" : "border-gray-100"
                  }`}
                >
                  {owned && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-extrabold z-10 whitespace-nowrap shadow-sm">
                      ✅ Dimiliki
                    </div>
                  )}

                  <div className="pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-secondary flex items-center justify-center text-lg">
                        📝
                      </div>
                      <div className="font-black text-base text-brand">
                        {pkg.name}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {pkg.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge color="blue">📝 Tryout SKD</Badge>
                      <Badge color="yellow">⏱ 100 menit/sesi</Badge>
                      <Badge color="purple">110 Soal/sesi</Badge>
                    </div>

                    {owned ? (
                      <Button variant="success" className="w-full" disabled>
                        ✅ Dimiliki
                      </Button>
                    ) : (
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <div className="font-black text-2xl text-brand">
                            Rp {pkg.price.toLocaleString("id-ID")}
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleBuy(pkg)}
                        >
                          Beli →
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
