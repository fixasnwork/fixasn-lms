'use client';

import { StatCard } from '@/components/ui';
import type { Payment } from '@/lib/types';
import { getPayments } from '@/lib/paymentStorage';
import { useAppStore } from '@/store/useAppStore';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const { packages } = useAppStore();
  const [allPayments, setAllPayments] = useState<Payment[]>([]);

  useEffect(() => {
    setAllPayments(getPayments());
  }, []);

  const pendingCount = allPayments.filter((p) => p.status === 'pending').length;
  const blockedCount = allPayments.filter((p) => p.status === 'blocked').length;

  // Count unique users who have made payments
  const uniqueUsers = new Set(allPayments.map((p) => p.userId)).size;
  const totalPeserta = uniqueUsers > 0 ? uniqueUsers : packages.length || 0;

  // Recent payments for display
  const recentPayments = [...allPayments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-5.5">
        📊 Dashboard Admin
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5.5">
        <StatCard icon="👥" label="Total Peserta" value={totalPeserta} color="#2563EB" sub={`${uniqueUsers} pembayar unik`} />
        <StatCard icon="💰" label="Pembayaran Pending" value={pendingCount} color="#D97706" />
        <StatCard icon="🚫" label="Diblokir" value={blockedCount} color="#DC2626" />
        <StatCard icon="📦" label="Paket Aktif" value={packages.filter((p) => p.isActive).length} color="#16A34A" />
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
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
              className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0"
            >
              <div>
                <div className="font-bold text-sm text-gray-800">{p.userId}</div>
                <div className="text-xs text-gray-400">{p.packageId}</div>
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
