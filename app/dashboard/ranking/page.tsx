'use client';

import { useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';

const RANKINGS = [
  { rank: 1, name: 'Rizki Andalas', skor: 345, tryouts: 12, paket: 'Paket Komplit', avatar: 'RA', badge: '🥇' },
  { rank: 2, name: 'Maya Putri', skor: 342, tryouts: 10, paket: 'Paket Intensif', avatar: 'MP', badge: '🥈' },
  { rank: 3, name: 'Doni Prasetyo', skor: 338, tryouts: 9, paket: 'Paket Komplit', avatar: 'DP', badge: '🥉' },
  { rank: 4, name: 'Siti Aminah', skor: 335, tryouts: 11, paket: 'Paket Intensif', avatar: 'SA', badge: '' },
  { rank: 5, name: 'Ahmad Fauzi', skor: 332, tryouts: 8, paket: 'Paket Starter', avatar: 'AF', badge: '' },
  { rank: 6, name: 'Wati Rohmah', skor: 328, tryouts: 9, paket: 'Paket Komplit', avatar: 'WR', badge: '' },
  { rank: 7, name: 'Budi Santoso', skor: 325, tryouts: 7, paket: 'Paket Intensif', avatar: 'BS', badge: '' },
  { rank: 8, name: 'Rina Hartati', skor: 321, tryouts: 8, paket: 'Paket Intensif', avatar: 'RH', badge: '' },
  { rank: 9, name: 'Joko Widodo', skor: 318, tryouts: 6, paket: 'Paket Starter', avatar: 'JW', badge: '' },
  { rank: 10, name: 'Fitriani D.', skor: 315, tryouts: 7, paket: 'Paket Komplit', avatar: 'FD', badge: '' },
];

export default function RankingPage() {
  const [tab, setTab] = useState<'all' | 'weekly' | 'monthly'>('all');

  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">🏅 Ranking Nasional</h2>
      <p className="text-gray-400 text-sm mb-5">
        Bersaing dan pantau posisimu di ranking nasional
      </p>

      {/* Top 3 podium */}
      <div className="flex justify-center items-end gap-3 mb-6 px-4">
        {/* 2nd place */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-300 flex items-center justify-center text-xl font-black text-white mb-2 ring-4 ring-gray-200">
            {RANKINGS[1].avatar}
          </div>
          <div className="text-2xl mb-1">🥈</div>
          <div className="font-extrabold text-sm text-gray-800 text-center">{RANKINGS[1].name.split(' ')[0]}</div>
          <div className="font-black text-base text-gray-600">{RANKINGS[1].skor}</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div className="bg-gradient-to-r from-gray-400 to-gray-300 h-full rounded-full" style={{ width: `${(RANKINGS[1].skor / 350) * 100}%` }} />
          </div>
        </div>

        {/* 1st place */}
        <div className="flex flex-col items-center flex-1 -mt-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center text-2xl font-black text-white mb-2 ring-4 ring-amber-200 shadow-lg shadow-amber-200/50">
            {RANKINGS[0].avatar}
          </div>
          <div className="text-3xl mb-1">🥇</div>
          <div className="font-extrabold text-base text-[#1B3A6B] text-center">{RANKINGS[0].name.split(' ')[0]}</div>
          <div className="font-black text-2xl text-amber-600">{RANKINGS[0].skor}</div>
          <div className="w-full bg-amber-100 rounded-full h-1.5 mt-1">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full" style={{ width: `${(RANKINGS[0].skor / 350) * 100}%` }} />
          </div>
        </div>

        {/* 3rd place */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-700 to-yellow-600 flex items-center justify-center text-xl font-black text-white mb-2 ring-4 ring-amber-100">
            {RANKINGS[2].avatar}
          </div>
          <div className="text-2xl mb-1">🥉</div>
          <div className="font-extrabold text-sm text-gray-800 text-center">{RANKINGS[2].name.split(' ')[0]}</div>
          <div className="font-black text-base text-gray-600">{RANKINGS[2].skor}</div>
          <div className="w-full bg-amber-200 rounded-full h-1.5 mt-1">
            <div className="bg-gradient-to-r from-amber-700 to-yellow-600 h-full rounded-full" style={{ width: `${(RANKINGS[2].skor / 350) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Tab filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'weekly', 'monthly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full font-bold text-xs cursor-pointer border-2 transition-all ${
              tab === t
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 bg-white text-gray-500 hover:border-blue-400'
            }`}
          >
            {t === 'all' ? '🗓️ Semua' : t === 'weekly' ? '📅 Mingguan' : '📆 Bulanan'}
          </button>
        ))}
      </div>

      {/* Ranking table */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col gap-0">
          {RANKINGS.slice(3).map((r, i) => (
            <div
              key={r.rank}
              className={`flex items-center gap-3 px-4 py-3 ${
                i !== RANKINGS.slice(3).length - 1 ? 'border-b border-gray-100' : ''
              } hover:bg-gray-50 transition-colors`}
            >
              <div className="w-8 text-center font-black text-gray-400 text-sm">{r.rank + 3}</div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg,#1B3A6B,#2563EB)',
                }}
              >
                {r.avatar}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-gray-800">{r.name}</div>
                <div className="text-xs text-gray-400">
                  {r.tryouts} tryout · {r.paket}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="font-black text-base text-[#1B3A6B]">{r.skor}</div>
                <div className="text-[10px] text-gray-400">poin</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <div className="mt-6 text-center">
        <Card className="bg-gradient-to-br from-[#0C1E45] to-[#2563EB] text-white p-6">
          <div className="text-3xl mb-2">💪</div>
          <h3 className="font-black text-lg mb-1">Ingin masuk Top 10?</h3>
          <p className="text-white/70 text-sm mb-3">
            Rutin tryout dan naikkan skormu sekarang!
          </p>
          <Button variant="gold" onClick={() => window.location.href = '/dashboard/tryout'}>
            🚀 Mulai Tryout Sekarang
          </Button>
        </Card>
      </div>
    </div>
  );
}