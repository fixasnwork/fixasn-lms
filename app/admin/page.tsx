'use client';

import { StatCard } from '@/components/ui';

export default function AdminDashboard() {
  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-5.5">
        📊 Dashboard Admin
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5.5">
        <StatCard icon="👥" label="Total Peserta" value="15.234" color="#2563EB" sub="↑ 234 bulan ini" />
        <StatCard icon="💰" label="Pendapatan Bulan Ini" value="Rp 12,4M" color="#16A34A" sub="↑ 18%" />
        <StatCard icon="⏳" label="Pembayaran Pending" value={3} color="#D97706" />
        <StatCard icon="🚫" label="User Diblokir" value={0} color="#DC2626" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Payments */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <h3 className="font-extrabold text-base text-[#1B3A6B] mb-3.5">
            💳 Pembayaran Terbaru
          </h3>
          {[
            { name: 'Budi Santoso', pkg: 'Paket Starter', amount: 45000, status: 'pending' },
            { name: 'Siti Rahayu', pkg: 'Paket Intensif', amount: 90000, status: 'verified' },
            { name: 'Ahmad Fauzi', pkg: 'Paket Komplit', amount: 145000, status: 'pending' },
          ].map((p, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0"
            >
              <div>
                <div className="font-bold text-sm text-gray-800">{p.name}</div>
                <div className="text-xs text-gray-400">{p.pkg}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1B3A6B]">
                  Rp {p.amount.toLocaleString('id-ID')}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'verified'
                      ? 'bg-green-50 text-green-700'
                      : p.status === 'blocked'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {p.status === 'verified' ? '✓ OK' : p.status === 'blocked' ? '🚫' : '⏳'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Package Popularity */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <h3 className="font-extrabold text-base text-[#1B3A6B] mb-3.5">
            📦 Popularitas Paket
          </h3>
          {[
            ['Paket Starter (3 sesi)', 65, '🟦'],
            ['Paket Intensif (7 sesi)', 82, '🟩'],
            ['Paket Komplit (10 sesi)', 48, '🟨'],
            ['Video Belajar', 31, '🟪'],
          ].map(([name, pct, icon]) => (
            <div key={name} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">
                  {icon} {name}
                </span>
                <span className="text-xs font-black text-[#1B3A6B]">{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1B3A6B] to-[#2563EB] rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
