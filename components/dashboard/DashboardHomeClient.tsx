'use client';

import { useRouter } from 'next/navigation';
import { StatCard, Button, Card } from '@/components/ui';
import type { Package } from '@/lib/types';
import { isPackageAvailable } from '@/lib/availability';

interface Props {
  userName: string;
  packages: Package[];
  purchasedPkgIds: number[];
}

export default function DashboardHomeClient({ userName, packages, purchasedPkgIds }: Props) {
  const router = useRouter();

  const unlockedVideo = false;
  const ownedPkgs = packages.filter((p) => purchasedPkgIds.includes(p.id));
  const totalTryouts = ownedPkgs.length;
  const remainingTryouts = totalTryouts;
  const usedTryouts = 0;
  const isOwned = (pkgId: number) => purchasedPkgIds.includes(pkgId);

  return (
    <div>
      {/* Welcome */}
      <div className="mb-5.5">
        <h2 className="font-black text-2xl text-brand mb-0.5">
          Selamat Datang, {userName.split(' ')[0]}! 👋
        </h2>
        <p className="text-gray-400 m-0 text-sm">
          Ayo semangat belajar hari ini!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5.5">
        <StatCard icon="📝" label="Sisa Tryout" value={remainingTryouts} color="#2563EB" />
        <StatCard icon="✅" label="Tryout Selesai" value={usedTryouts} color="#16A34A" />
        <StatCard icon="🏅" label="Peringkat" value="#42" color="#B45309" />
        <StatCard
          icon="🎬"
          label="Akses Video"
          value={unlockedVideo ? 'Aktif' : 'Belum'}
          color={unlockedVideo ? '#16A34A' : '#9CA3AF'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-extrabold text-base text-brand mb-4">
            📈 Progress Per Materi
          </h3>
          {[
            ['TWK - Wawasan Kebangsaan', 78, '#2563EB'],
            ['TIU - Intelegensia Umum', 65, '#7C3AED'],
            ['TKP - Karakteristik Pribadi', 82, '#D97706'],
          ].map(([cat, pct, col]) => (
            <div key={cat as string} className="mb-3.5">
              <div className="flex justify-between mb-1.25">
                <span className="text-sm font-semibold text-gray-700">{cat as string}</span>
                <span className="text-sm font-black" style={{ color: col as string }}>
                  {pct as number}%
                </span>
              </div>
              <div className="h-1.75 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-1000"
                  style={{ width: `${pct}%`, backgroundColor: col as string }}
                />
              </div>
            </div>
          ))}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="font-extrabold text-sm text-brand mb-3.5">
            ⚡ Aksi Cepat
          </h3>
          <div className="flex flex-col gap-2.5">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push('/tryout')}
              disabled={remainingTryouts <= 0 && purchasedPkgIds.length === 0}
            >
              📝 Mulai Tryout
            </Button>
            <Button
              variant="gold"
              className="w-full"
              onClick={() => router.push('/video')}
            >
              🎬 Video Belajar
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/ranking')}
            >
              🏅 Lihat Ranking
            </Button>
          </div>
        </Card>
      </div>

      {/* Packages Teaser */}
      <div className="mt-8">
        <h3 className="font-black text-lg text-brand mb-4">
          📦 Paket Tersedia
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {packages.filter((p) => isPackageAvailable(p)).map((pkg) => {
            const owned = isOwned(pkg.id);
            return (
              <Card
                key={pkg.id}
                hover
                className={`p-4.5 cursor-pointer transition-colors ${
                  owned
                    ? 'border-2 border-solid border-green-300 bg-green-50'
                    : 'border-2 border-dashed border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className={`font-extrabold text-base ${
                      owned ? 'text-green-700' : 'text-gray-400'
                    }`}
                  >
                    {pkg.name}
                  </div>
                  <div className="text-4.5">{owned ? '✅' : '🔒'}</div>
                </div>
                <div className={`text-xs mb-1.5 ${owned ? 'text-green-600' : 'text-gray-400'}`}>
                  Tryout SKD · 110 soal/paket
                </div>
                <div
                  className={`font-black text-lg mb-3 ${
                    owned ? 'text-green-700' : 'text-gray-400'
                  }`}
                >
                  {owned ? 'SUDAH DIMILIKI' : `Rp ${pkg.price.toLocaleString('id-ID')}`}
                </div>
                <Button
                  variant={owned ? 'success' : 'outline'}
                  className={`w-full ${owned ? '' : 'border-gray-300 text-gray-400'}`}
                  onClick={() => router.push(owned ? '/tryout' : '/buy')}
                >
                  {owned ? 'Mulai Tryout' : 'Beli Sekarang'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
