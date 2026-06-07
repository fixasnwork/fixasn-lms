'use client';

import { StatCard } from '@/components/ui';
import { isPackageAvailable } from '@/lib/availability';
import type { Payment, Package } from '@/lib/types';

interface Props {
  payments: Payment[];
  packages: Package[];
}

export default function AdminDashboardClient({ payments, packages }: Props) {
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const blockedCount = payments.filter((p) => p.status === 'blocked').length;
  const uniqueUsers = new Set(payments.map((p) => p.userId)).size;
  const totalPeserta = uniqueUsers > 0 ? uniqueUsers : packages.length || 0;

  const recentPayments = [...payments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div>
      <h2 className="font-black text-xl sm:text-2xl text-[#1B3A6B] mb-4 sm:mb-5.5">
        📊 Dashboard Admin
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5.5">
        <StatCard icon="👥" label="Total Peserta" value={totalPeserta} color="#2563EB" sub={`${uniqueUsers} pembayar unik`} />
        <StatCard icon="💰" label="Pembayaran Pending" value={pendingCount} color="#D97706" />
        <StatCard icon="🚫" label="Diblokir" value={blockedCount} color="#DC2626" />
        <StatCard icon="📦" label="Paket Tersedia" value={packages.filter((p) => isPackageAvailable(p)).length} color="#16A34A" />
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-gray-100">
        <h3 className="font-extrabold text-base text-[#1B3A6B] mb-3.5">
          💳 Pembayaran Terbaru
        </h3>
        {recentPayments.map((p) => {
          const statusColor =
            p.status === 'verified'
              ? 'bg-green-50 text-green-700'
              : p.status === 'blocked'
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700';
          const statusBadge =
            p.status === 'verified' ? '✓ OK' : p.status === 'blocked' ? '🚫' : '⏳';
          return (
            <div
              key={p.id}
              className="flex justify-between items-center gap-2 py-2.5 border-b border-gray-100 last:border-0"
            >
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-800 break-all">{p.userId}</div>
                <div className="text-xs text-gray-400 break-all">{p.packageId}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}`}
                >
                  {statusBadge}
                </span>
              </div>
            </div>
          );
        })}
        {recentPayments.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">Belum ada pembayaran</p>
        )}
      </div>
    </div>
  );
}
