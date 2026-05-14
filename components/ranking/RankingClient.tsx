'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components/ui';
import type { RankingEntry } from '@/lib/ranking';

// ── types ────────────────────────────────────
interface Props {
  all: RankingEntry[];
  weekly: RankingEntry[];
  monthly: RankingEntry[];
}

// ── helpers ──────────────────────────────────
function truncatePackages(packages: string, maxLen = 30): string {
  if (packages.length <= maxLen) return packages;
  return packages.slice(0, maxLen - 3) + '...';
}

function getScoreBarWidth(score: number, maxScore: number): string {
  if (maxScore === 0) return '0%';
  return `${Math.min((score / maxScore) * 100, 100)}%`;
}

// ── component ────────────────────────────────
export default function RankingClient({ all, weekly, monthly }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'all' | 'weekly' | 'monthly'>('all');

  const data = tab === 'weekly' ? weekly : tab === 'monthly' ? monthly : all;
  const maxScore = data.length > 0 ? data[0].totalScore : 350;

  // ── empty state ────────────────────────────
  if (data.length === 0) {
    return (
      <div>
        <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">🏅 Ranking Nasional</h2>
        <p className="text-gray-400 text-sm mb-5">
          Bersaing dan pantau posisimu di ranking nasional
        </p>

        <TabBar tab={tab} setTab={setTab} />

        <Card className="p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="font-black text-lg text-[#1B3A6B] mb-2">Belum ada ranking</h3>
          <p className="text-gray-400 text-sm mb-6">
            Belum ada yang mengerjakan tryout di periode ini. Jadilah yang pertama!
          </p>
          <Button variant="gold" onClick={() => router.push('/dashboard/tryout')}>
            🚀 Mulai Tryout Sekarang
          </Button>
        </Card>
      </div>
    );
  }

  // ── data available ─────────────────────────
  const top3 = data.slice(0, 3);
  const rest = data; // all entries shown in table

  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">🏅 Ranking Nasional</h2>
      <p className="text-gray-400 text-sm mb-5">
        Bersaing dan pantau posisimu di ranking nasional
      </p>

      <Podium top3={top3} maxScore={maxScore} />

      <TabBar tab={tab} setTab={setTab} />

      {/* Ranking table — shows all entries (rank 1+) */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col gap-0">
          {rest.map((entry, i) => (
            <RankingRow key={entry.userId} entry={entry} rank={i + 1} maxScore={maxScore} />
          ))}
        </div>
      </Card>

      {/* CTA */}
      <div className="mt-6 text-center">
        <Card className="bg-gradient-to-br from-[#0C1E45] to-[#2563EB] text-white p-6">
          <div className="text-3xl mb-2">💪</div>
          <h3 className="font-black text-lg mb-1">Ingin masuk Top 3?</h3>
          <p className="text-white/70 text-sm mb-3">
            Rutin tryout dan naikkan skormu sekarang!
          </p>
          <Button variant="gold" onClick={() => router.push('/dashboard/tryout')}>
            🚀 Mulai Tryout Sekarang
          </Button>
        </Card>
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────
function TabBar({
  tab,
  setTab,
}: {
  tab: 'all' | 'weekly' | 'monthly';
  setTab: (t: 'all' | 'weekly' | 'monthly') => void;
}) {
  return (
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
  );
}

// ── Podium ────────────────────────────────────
function Podium({ top3, maxScore }: { top3: RankingEntry[]; maxScore: number }) {
  // 1 entry only — centered gold
  if (top3.length === 1) {
    return (
      <div className="flex justify-center items-end gap-3 mb-6 px-4">
        <div className="flex flex-col items-center flex-1 -mt-3">
          <AvatarBlock
            initials={top3[0].initials}
            avatar={top3[0].avatar}
            size="lg"
            ringColor="ring-amber-200 shadow-lg shadow-amber-200/50"
            gradient="from-amber-500 to-yellow-400"
          />
          <div className="text-3xl mb-1">🥇</div>
          <div className="font-extrabold text-base text-[#1B3A6B] text-center">
            {top3[0].name.split(' ')[0]}
          </div>
          <div className="font-black text-2xl text-amber-600">{top3[0].totalScore}</div>
          <ScoreBar score={top3[0].totalScore} maxScore={maxScore} color="from-amber-500 to-yellow-400" bg="bg-amber-100" />
        </div>
      </div>
    );
  }

  // 2 entries — 1st center, 2nd left
  if (top3.length === 2) {
    return (
      <div className="flex justify-center items-end gap-3 mb-6 px-4">
        {/* 2nd place */}
        <div className="flex flex-col items-center flex-1">
          <AvatarBlock
            initials={top3[1].initials}
            avatar={top3[1].avatar}
            size="md"
            ringColor="ring-gray-200"
            gradient="from-gray-400 to-gray-300"
          />
          <div className="text-2xl mb-1">🥈</div>
          <div className="font-extrabold text-sm text-gray-800 text-center">
            {top3[1].name.split(' ')[0]}
          </div>
          <div className="font-black text-base text-gray-600">{top3[1].totalScore}</div>
          <ScoreBar score={top3[1].totalScore} maxScore={maxScore} color="from-gray-400 to-gray-300" bg="bg-gray-200" />
        </div>

        {/* 1st place */}
        <div className="flex flex-col items-center flex-1 -mt-3">
          <AvatarBlock
            initials={top3[0].initials}
            avatar={top3[0].avatar}
            size="lg"
            ringColor="ring-amber-200 shadow-lg shadow-amber-200/50"
            gradient="from-amber-500 to-yellow-400"
          />
          <div className="text-3xl mb-1">🥇</div>
          <div className="font-extrabold text-base text-[#1B3A6B] text-center">
            {top3[0].name.split(' ')[0]}
          </div>
          <div className="font-black text-2xl text-amber-600">{top3[0].totalScore}</div>
          <ScoreBar score={top3[0].totalScore} maxScore={maxScore} color="from-amber-500 to-yellow-400" bg="bg-amber-100" />
        </div>
      </div>
    );
  }

  // 3+ entries — full podium: 2nd | 1st | 3rd
  return (
    <div className="flex justify-center items-end gap-3 mb-6 px-4">
      {/* 2nd place */}
      <div className="flex flex-col items-center flex-1">
        <AvatarBlock
          initials={top3[1].initials}
          avatar={top3[1].avatar}
          size="md"
          ringColor="ring-gray-200"
          gradient="from-gray-400 to-gray-300"
        />
        <div className="text-2xl mb-1">🥈</div>
        <div className="font-extrabold text-sm text-gray-800 text-center">
          {top3[1].name.split(' ')[0]}
        </div>
        <div className="font-black text-base text-gray-600">{top3[1].totalScore}</div>
        <ScoreBar score={top3[1].totalScore} maxScore={maxScore} color="from-gray-400 to-gray-300" bg="bg-gray-200" />
      </div>

      {/* 1st place */}
      <div className="flex flex-col items-center flex-1 -mt-3">
        <AvatarBlock
          initials={top3[0].initials}
          avatar={top3[0].avatar}
          size="lg"
          ringColor="ring-amber-200 shadow-lg shadow-amber-200/50"
          gradient="from-amber-500 to-yellow-400"
        />
        <div className="text-3xl mb-1">🥇</div>
        <div className="font-extrabold text-base text-[#1B3A6B] text-center">
          {top3[0].name.split(' ')[0]}
        </div>
        <div className="font-black text-2xl text-amber-600">{top3[0].totalScore}</div>
        <ScoreBar score={top3[0].totalScore} maxScore={maxScore} color="from-amber-500 to-yellow-400" bg="bg-amber-100" />
      </div>

      {/* 3rd place */}
      <div className="flex flex-col items-center flex-1">
        <AvatarBlock
          initials={top3[2].initials}
          avatar={top3[2].avatar}
          size="md"
          ringColor="ring-amber-100"
          gradient="from-amber-700 to-yellow-600"
        />
        <div className="text-2xl mb-1">🥉</div>
        <div className="font-extrabold text-sm text-gray-800 text-center">
          {top3[2].name.split(' ')[0]}
        </div>
        <div className="font-black text-base text-gray-600">{top3[2].totalScore}</div>
        <ScoreBar score={top3[2].totalScore} maxScore={maxScore} color="from-amber-700 to-yellow-600" bg="bg-amber-200" />
      </div>
    </div>
  );
}

// ── Avatar block ──────────────────────────────
function AvatarBlock({
  initials,
  avatar,
  size,
  ringColor,
  gradient,
}: {
  initials: string;
  avatar: string | null;
  size: 'md' | 'lg';
  ringColor: string;
  gradient: string;
}) {
  const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-xl';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className={`${sizeClass} rounded-full object-cover ring-4 ${ringColor}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white ring-4 ${ringColor}`}
    >
      {initials}
    </div>
  );
}

// ── Score bar ─────────────────────────────────
function ScoreBar({
  score,
  maxScore,
  color,
  bg,
}: {
  score: number;
  maxScore: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`w-full ${bg} rounded-full h-1.5 mt-1`}>
      <div
        className={`bg-gradient-to-r ${color} h-full rounded-full`}
        style={{ width: getScoreBarWidth(score, maxScore) }}
      />
    </div>
  );
}

// ── Table row ─────────────────────────────────
function RankingRow({
  entry,
  rank,
  maxScore,
}: {
  entry: RankingEntry;
  rank: number;
  maxScore: number;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      {/* rank number */}
      <div className="w-8 text-center font-black text-gray-400 text-sm">{rank}</div>

      {/* avatar */}
      {entry.avatar ? (
        <img
          src={entry.avatar}
          alt=""
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1B3A6B,#2563EB)' }}
        >
          {entry.initials}
        </div>
      )}

      {/* name + meta */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-gray-800 truncate">{entry.name}</div>
        <div className="text-xs text-gray-400">
          {entry.tryoutCount} tryout
          {entry.packages ? ` · ${truncatePackages(entry.packages)}` : ''}
        </div>
      </div>

      {/* score */}
      <div className="flex flex-col items-end flex-shrink-0">
        <div className="font-black text-base text-[#1B3A6B]">{entry.totalScore}</div>
        <div className="text-[10px] text-gray-400">poin</div>
      </div>
    </div>
  );
}
