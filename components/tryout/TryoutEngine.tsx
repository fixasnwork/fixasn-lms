'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Question } from '@/lib/types';
import { getScore, formatTime } from '@/lib/scoring';
import { Logo, Button, Badge, Card } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import PembahasanNavigator from './PembahasanNavigator';

interface TryoutEngineProps {
  questions: Question[];
  durationMin: number;
  setName?: string;
  isTrial?: boolean;
  onFinish?: (answers: Record<number, number>) => void;
  onBack?: () => void;
}

export default function TryoutEngine({
  questions,
  durationMin,
  setName = 'Tryout SKD',
  isTrial = false,
  onFinish,
  onBack,
}: TryoutEngineProps) {
  const logoConfig = useAppStore((s) => s.logoConfig);
  const DURATION = (durationMin || 100) * 60;

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [cur, setCur] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [phase, setPhase] = useState<'ready' | 'running' | 'result'>('ready');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTryout = useCallback(() => {
    setPhase('running');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase('result');
          onFinish?.(answers);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [answers, onFinish]);

  const finish = useCallback(() => {
    clearInterval(timerRef.current!);
    setPhase('result');
    onFinish?.(answers);
  }, [answers, onFinish]);

  // Scoring
  const totals = { TWK: 0, TIU: 0, TKP: 0 };
  questions.forEach((q, i) => {
    totals[q.cat] += getScore(q, answers[i]);
  });
  const totalScore = totals.TWK + totals.TIU + totals.TKP;

  const retry = () => {
    setAnswers({});
    setCur(0);
    setTimeLeft(DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('ready');
  };

  // ── PHASE: READY ──
  if (phase === 'ready') {
    const durMenit = Math.round(DURATION / 60);
    const tips = [
      { icon: '📝', label: 'Sediakan kertas coretan' },
      { icon: '🔇', label: 'Cari tempat yang tenang' },
      { icon: '🤝', label: 'Kerjakan dengan jujur' },
      { icon: '📶', label: 'Pastikan koneksi stabil' },
      { icon: '🔋', label: 'Baterai cukup' },
      { icon: '🚫', label: 'Jangan keluar / pindah tab' },
    ];

    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <Card className="max-w-xl w-full p-10 text-center">
          {/* Header */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-3xl mx-auto mb-5">
            📋
          </div>
          <h2 className="font-black text-2xl text-[#1B3A6B] mb-1.5">{setName}</h2>
          <p className="text-gray-500 text-sm mb-3">
            {isTrial ? 'Trial · 10 soal · 15 menit' : `110 soal · ${durMenit} menit · TWK + TIU + TKP`}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 inline-block">
            <span className="font-bold text-amber-800 text-sm">
              ⏱ Ujian berlangsung selama{' '}
              <strong className="text-amber-900">{durMenit} menit</strong>{' '}
              — pastikan kamu siap!
            </span>
          </div>

          {/* Tips grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {tips.map((t, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-13 h-13 rounded-full bg-[#1B3A6B] flex items-center justify-center text-2xl">
                  {t.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  {t.label}
                </span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onBack}>
              Batalkan
            </Button>
            <Button variant="primary" className="flex-[2]" onClick={startTryout}>
              Mulai Tryout
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── PHASE: RESULT ──
  if (phase === 'result') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] p-6">
        <div className="max-w-4xl mx-auto">
          {/* Navigation buttons */}
          <div className="flex gap-3 mb-5">
            <Button variant="outline" onClick={onBack}>
              ← Kembali ke Dashboard
            </Button>
            <Button variant="primary" onClick={retry}>
              🔄 Ulangi Tryout
            </Button>
          </div>

          {/* Score card */}
          <Card className="bg-gradient-to-br from-[#0C1E45] to-[#2563EB] text-white text-center p-8 mb-6">
            <div className="text-6xl mb-3">{totalScore >= 298 ? '🎉' : '💪'}</div>
            <h2 className="text-2xl font-black mb-1">Hasil {setName}</h2>
            <div className="text-7xl font-black text-yellow-400 leading-none my-3">{totalScore}</div>
            <div className="text-white/70 text-sm mt-1">
              Total Skor · Nilai Ambang Batas SKD: 298 (TWK≥65, TIU≥80, TKP≥166)
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { cat: 'TWK', col: '#60A5FA', pass: 65 },
                { cat: 'TIU', col: '#A78BFA', pass: 80 },
                { cat: 'TKP', col: '#FCD34D', pass: 166 },
              ].map(({ cat, col, pass }) => (
                <div key={cat} className="bg-white/10 rounded-xl p-4">
                  <div className="font-bold text-sm mb-1">{cat}</div>
                  <div className="text-3xl font-black" style={{ color: col }}>
                    {totals[cat as keyof typeof totals]}
                  </div>
                  <div className="text-white/60 text-xs mt-1">
                    Ambang: {pass} &nbsp; {totals[cat as keyof typeof totals] >= pass ? '✅' : '❌'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pembahasan */}
          <PembahasanNavigator
            questions={questions}
            answers={answers}
            name={setName}
            onBack={onBack}
            onRetry={retry}
          />
        </div>
      </div>
    );
  }

  // ── PHASE: RUNNING ──
  const q = questions[cur];
  const catColor = q.cat === 'TWK' ? '#2563EB' : q.cat === 'TIU' ? '#7C3AED' : '#D97706';
  const answered = Object.keys(answers).length;
  const twkDone = questions.filter((_, i) => i < 30 && answers[i] !== undefined).length;
  const tiuDone = questions.filter((_, i) => i >= 30 && i < 65 && answers[i] !== undefined).length;
  const tkpDone = questions.filter((_, i) => i >= 65 && answers[i] !== undefined).length;

  const sections = [
    { label: 'TWK', start: 0, end: isTrial ? 3 : 30, color: '#2563EB', bg: '#DBEAFE' },
    { label: 'TIU', start: isTrial ? 3 : 30, end: isTrial ? 7 : 65, color: '#7C3AED', bg: '#EDE9FE' },
    { label: 'TKP', start: isTrial ? 7 : 65, end: questions.length, color: '#D97706', bg: '#FEF3C7' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Trial Banner */}
      {isTrial && (
        <div className="bg-gradient-to-r from-amber-600 to-yellow-400 text-white px-6 py-2 text-center font-bold text-sm flex items-center justify-center gap-3">
          <span>
            🎯 MODE TRIAL — 10 Soal Gratis (3 TWK + 4 TIU + 3 TKP · 15 menit)
          </span>
          <span className="bg-white/25 rounded-full px-3 py-0.5 text-xs">
            Beli paket untuk akses 110 soal penuh
          </span>
        </div>
      )}

      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Logo size="sm" cfg={logoConfig} />
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-3 text-xs text-gray-400 font-semibold">
            <span>
              TWK: {twkDone}/{isTrial ? 3 : 30}
            </span>
            <span>
              TIU: {tiuDone}/{isTrial ? 4 : 35}
            </span>
            <span>
              TKP: {tkpDone}/{isTrial ? 3 : 45}
            </span>
          </div>
          <div
            className={`px-4 py-1.5 rounded-full font-black text-lg min-w-[80px] text-center ${
              timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
            }`}
          >
            ⏱ {formatTime(timeLeft)}
          </div>
          <Button variant="danger" size="sm" onClick={finish}>
            Selesai
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5">
        {/* Question */}
        <div>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge color={q.cat === 'TWK' ? 'blue' : q.cat === 'TIU' ? 'purple' : 'yellow'}>
                {q.cat}
              </Badge>
              <span className="text-sm text-gray-400 font-semibold">
                Soal {cur + 1} dari {questions.length}
              </span>
              {q.cat === 'TKP' && (
                <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                  Pilih yang paling mencerminkan dirimu
                </span>
              )}
            </div>

            <p className="font-bold text-base text-gray-800 mb-3 leading-relaxed">{q.q}</p>
            {q.qImg && (
              <img
                src={q.qImg}
                alt="soal"
                className="max-w-full max-h-48 rounded-lg mb-4 border border-gray-200 object-contain bg-white"
              />
            )}

            <div className="flex flex-col gap-2.5">
              {q.opts.map((opt, j) => {
                const optImg = q.optImgs?.[j];
                const isSelected = answers[cur] === j;
                return (
                  <button
                    key={j}
                    onClick={() => setAnswers({ ...answers, [cur]: j })}
                    className={`p-3.5 border-2 rounded-xl text-left cursor-pointer font-medium text-sm transition-all flex items-center gap-3 ${
                      isSelected
                        ? q.cat === 'TWK'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : q.cat === 'TIU'
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {String.fromCharCode(65 + j)}
                    </span>
                    <div className="flex-1">
                      {opt && <span className="leading-relaxed">{opt}</span>}
                      {optImg && (
                        <img
                          src={optImg}
                          alt={`Opsi ${String.fromCharCode(65 + j)}`}
                          className="block max-w-full max-h-24 rounded-lg mt-1 object-contain"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between mt-5">
              <Button
                variant="ghost"
                onClick={() => setCur(Math.max(0, cur - 1))}
                disabled={cur === 0}
              >
                ← Sebelumnya
              </Button>
              <Button
                variant={answers[cur] !== undefined ? 'primary' : 'ghost'}
                onClick={() => setCur(Math.min(questions.length - 1, cur + 1))}
                disabled={cur === questions.length - 1}
              >
                Selanjutnya →
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar right — question ruler */}
        <div className="hidden lg:block">
          <div className="sticky top-[72px] flex flex-col gap-3">
            <Card className="p-3">
              <p className="font-extrabold text-xs text-[#1B3A6B] mb-2">
                📊 {answered}/{questions.length} dijawab
              </p>
              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-[#1B3A6B] to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(answered / questions.length) * 100}%` }}
                />
              </div>

              {/* Question numbers per section */}
              <div
                className="max-h-[calc(100vh-220px)] overflow-y-auto"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}
              >
                {sections.map((sec) => {
                  const done = Object.keys(answers).filter(
                    (k) => Number(k) >= sec.start && Number(k) < sec.end
                  ).length;
                  return (
                    <div key={sec.label} className="mb-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs" style={{ color: sec.color }}>
                          {sec.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {done}/{sec.end - sec.start}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {Array.from({ length: sec.end - sec.start }, (_, idx) => {
                          const gi = sec.start + idx;
                          const isActive = gi === cur;
                          const isDone = answers[gi] !== undefined;
                          return (
                            <button
                              key={gi}
                              onClick={() => setCur(gi)}
                              className={`
                                w-full aspect-square rounded-md border-none cursor-pointer font-semibold text-xs transition-all
                                ${isActive ? 'ring-2 ring-offset-1' : ''}
                              `}
                              style={{
                                background: isActive
                                  ? sec.color
                                  : isDone
                                    ? sec.bg
                                    : '#F1F5F9',
                                color: isActive ? '#fff' : isDone ? sec.color : '#9CA3AF',
                                outline: isActive ? `2px solid ${sec.color}` : 'none',
                                outlineOffset: 1,
                              }}
                            >
                              {gi + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1">
                {[
                  { color: '#2563EB', label: 'Soal aktif' },
                  { color: '#DBEAFE', label: 'Sudah dijawab' },
                  { color: '#F1F5F9', label: 'Belum dijawab' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex gap-1.5 items-center text-xs text-gray-500"
                  >
                    <div
                      className="w-3 h-3 rounded border border-gray-200 flex-shrink-0"
                      style={{ background: item.color }}
                    />
                    {item.label}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}