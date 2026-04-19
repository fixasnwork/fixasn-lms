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
    if (pkg.comingSoon) return;
    if (pkg.video) {
      router.push('/dashboard/video');
      return;
    }
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
            .filter((p) => !p.video && !p.comingSoon)
            .map((pkg) => {
              const owned = user?.purchasedPackageIds?.includes(pkg.id);
              return (
                <Card
                  key={pkg.id}
                  className={`relative overflow-hidden ${
                    pkg.popular ? 'border-2 border-yellow-400' : 'border border-gray-100'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2.5 left-4 bg-gradient-to-r from-amber-600 to-yellow-400 text-white px-3 py-0.5 rounded-full text-xs font-extrabold z-10">
                      🔥 PALING LARIS
                    </div>
                  )}
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
                    <p className="text-xs text-gray-500 mb-3">{pkg.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge color="blue">📝 {pkg.tryouts} Tryout SKD</Badge>
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
                          variant={pkg.popular ? 'gold' : 'primary'}
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

      {/* Video packages */}
      <div>
        <h3 className="font-extrabold text-base text-[#1B3A6B] mb-4 flex items-center gap-2">
          🎬 Paket Video Belajar
        </h3>
        <div className="flex flex-col gap-3">
          {packages
            .filter((p) => p.video)
            .map((pkg) => (
              <Card
                key={pkg.id}
                className={`${
                  pkg.comingSoon
                    ? 'border-2 border-dashed border-gray-300 bg-gray-50 opacity-75'
                    : 'border-2 border-yellow-400 bg-gradient-to-br from-amber-50 to-yellow-50'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        pkg.comingSoon
                          ? 'bg-gray-200'
                          : 'bg-gradient-to-br from-amber-600 to-yellow-400'
                      }`}
                    >
                      {pkg.comingSoon ? '⏳' : '🎬'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-base text-[#1B3A6B]">{pkg.name}</h4>
                        {pkg.comingSoon && (
                          <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            🕐 Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 m-0">
                        {pkg.comingSoon
                          ? 'Sedang dalam tahap produksi — segera hadir!'
                          : pkg.desc}
                      </p>
                    </div>
                  </div>
                  {!pkg.comingSoon && (
                    <div className="text-right">
                      <div className="font-black text-2xl text-[#1B3A6B]">
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </div>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => handleBuy(pkg)}
                      >
                        Beli Sekarang
                      </Button>
                    </div>
                  )}
                  {pkg.comingSoon && (
                    <span className="bg-gray-200 text-gray-500 font-bold text-sm px-4 py-2 rounded-full">
                      Segera Hadir
                    </span>
                  )}
                </div>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}