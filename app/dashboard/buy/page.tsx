'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Package } from '@/lib/types';
import { Card, Badge, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function BuyPage() {
  const router = useRouter();
  const { packages } = useAppStore();
  const { user } = useAuthStore();
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);

  const handleBuy = (pkg: Package) => {
    if (!pkg.isActive) return;
    router.push(`/dashboard/payment?pkg=${pkg.id}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">🛒 Beli Paket</h2>
        <p className="text-gray-400 text-sm">
          Pilih paket yang sesuai kebutuhanmu
        </p>
      </div>

      {/* Tryout packages */}
      <div className="mb-8">
        <h3 className="font-extrabold text-base text-[#1B3A6B] mb-4 flex items-center gap-2">
          📝 Paket Tryout SKD
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages
            .filter((p) => p.isActive && !p.isTrial)
            .map((pkg) => {
              const owned = false; // TODO: derive from payments
              return (
                <Card
                  key={pkg.id}
                  className="relative overflow-hidden border border-gray-100"
                >
                  {owned && (
                    <div className="absolute -top-2.5 left-4 bg-green-500 text-white px-3 py-0.5 rounded-full text-xs font-extrabold z-10">
                      ✅ DIMILIKI
                    </div>
                  )}

                  <div className="pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-lg">
                        📝
                      </div>
                      <div className="font-black text-base text-[#1B3A6B]">{pkg.name}</div>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{pkg.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge color="blue">📝 Tryout SKD</Badge>
                      <Badge color="yellow">⏱ 100 menit/sesi</Badge>
                      <Badge color="purple">110 Soal/sesi</Badge>
                    </div>

                    {owned ? (
                      <Button
                        variant="success"
                        className="w-full"
                        onClick={() => router.push('/dashboard/tryout')}
                      >
                        🚀 Mulai Tryout
                      </Button>
                    ) : (
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <div className="font-black text-2xl text-[#1B3A6B]">
                            Rp {pkg.price.toLocaleString('id-ID')}
                          </div>
                          <div className="text-xs text-gray-400">sekali bayar, akses selamanya</div>
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