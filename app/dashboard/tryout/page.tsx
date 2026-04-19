'use client';

import { useState, useCallback } from 'react';
import type { Question, Package } from '@/lib/types';
import { getScore } from '@/lib/scoring';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import TryoutEngine from '@/components/tryout/TryoutEngine';
import { Button, Badge, Card, Modal } from '@/components/ui';
import { WA_LINK } from '@/data/constants';

export default function TryoutPage() {
  const { user } = useAuthStore();
  const {
    packages,
    questions,
    durationMin,
    tryoutSets,
    packageBanks,
    trialSet,
    logoConfig,
  } = useAppStore();

  // Seed trial questions if not set
  const seededTrial = trialSet.questions.length > 0 ? trialSet : { ...trialSet, questions };
  const trialQuestions: Question[] = seededTrial.questions.slice(0, 10).length === 10
    ? seededTrial.questions
    : [
        ...questions.filter((q) => q.cat === 'TWK').slice(0, 3),
        ...questions.filter((q) => q.cat === 'TIU').slice(0, 4),
        ...questions.filter((q) => q.cat === 'TKP').slice(0, 3),
      ];
  const trialDurasi = seededTrial.durationMin || 15;

  // State
  const [tryoutActive, setTryoutActive] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [activePkgId, setActivePkgId] = useState<string | null>(null);
  const [activeTryoutId, setActiveTryoutId] = useState<string | null>(null);
  const [completedTryouts, setCompletedTryouts] = useState<Record<string, string[]>>({});
  const [unlockedVideo, setUnlockedVideo] = useState(false);
  const [showPayModal, setShowPayModal] = useState<Package | null>(null);
  const [proofFile, setProofFile] = useState<{ name: string; url: string } | null>(null);
  const [payStep, setPayStep] = useState<'form' | 'success'>('form');
  const [reviewMode, setReviewMode] = useState<{
    questions: Question[];
    answers: Record<number, number>;
    name: string;
  } | null>(null);
  const [tryoutHistory, setTryoutHistory] = useState<
    Array<{
      name: string;
      date: string;
      questions: Question[];
      answers: Record<number, number>;
    }>
  >([]);

  // Derived
  const ownedPkgIds: string[] = [];
  const banks = packageBanks[activePkgId || ''] || [];
  const done = completedTryouts[activePkgId || ''] || [];

  const getActiveTryoutQuestions = useCallback((): Question[] => {
    if (!activePkgId || !activeTryoutId) return trialQuestions;
    const bank = packageBanks[activePkgId] || [];
    const t = bank.find((tr) => tr.id === activeTryoutId);
    return t?.questions?.length ? t.questions : trialQuestions;
  }, [activePkgId, activeTryoutId, trialQuestions, packageBanks]);

  const activeQuestions = isTrial ? trialQuestions : getActiveTryoutQuestions();

  const getActiveName = () => {
    if (!activePkgId || !activeTryoutId) return 'Tryout SKD';
    const bank = packageBanks[activePkgId] || [];
    const t = bank.find((tr) => tr.id === activeTryoutId);
    const pkg = packages.find((p) => p.id === activePkgId);
    return `${pkg?.name || ''} – ${t?.name || 'Tryout'}`;
  };

  const handleFinish = (answers: Record<number, number>) => {
    if (!isTrial && activePkgId && activeTryoutId) {
      setCompletedTryouts((prev) => ({
        ...prev,
        [activePkgId]: [...(prev[activePkgId] || []), activeTryoutId],
      }));
    }
    setTryoutHistory((prev) => [
      {
        name: isTrial ? 'Trial Gratis' : getActiveName(),
        date: new Date().toLocaleDateString('id-ID'),
        questions: activeQuestions,
        answers,
      },
      ...prev,
    ]);
    setIsTrial(false);
    setTryoutActive(false);
  };

  const handleBack = () => {
    setIsTrial(false);
    setTryoutActive(false);
  };

  // ── TRYOUT ACTIVE ──
  if (tryoutActive) {
    return (
      <TryoutEngine
        questions={activeQuestions}
        durationMin={isTrial ? trialDurasi : durationMin}
        setName={isTrial ? 'Trial Gratis' : getActiveName()}
        isTrial={isTrial}
        onFinish={handleFinish}
        onBack={handleBack}
      />
    );
  }

  // ── REVIEW MODE ──
  if (reviewMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3.5 mb-5">
            <Button variant="outline" onClick={() => setReviewMode(null)}>
              ← Kembali
            </Button>
            <h2 className="font-black text-xl text-[#1B3A6B] m-0">
              Pembahasan — {reviewMode.name}
            </h2>
          </div>
          {/* Pembahasan navigator inline */}
          <ReviewModeView
            review={reviewMode}
            onBack={() => setReviewMode(null)}
            onRetry={() => {
              setReviewMode(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Sample proof images for demo
  const sampleProofs = [
    {
      name: 'bukti_bca.jpg',
      url: 'https://placehold.co/400x220/dbeafe/1d4ed8?text=Bukti+Transfer+BCA',
    },
    {
      name: 'bukti_mandiri.jpg',
      url: 'https://placehold.co/400x220/dcfce7/15803d?text=Bukti+Transfer+Mandiri',
    },
    {
      name: 'bukti_bni.jpg',
      url: 'https://placehold.co/400x220/fef9c3/854d0e?text=Bukti+Transfer+BNI',
    },
  ];

  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">📝 Tryout SKD</h2>
      <p className="text-gray-400 text-sm mb-5">
        110 soal · 100 menit · TWK + TIU + TKP
      </p>

      {/* Trial Card — always shown */}
      <div className="mb-4">
        <Card
          className="border-2 border-yellow-400 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 relative max-w-md"
          style={{ borderColor: '#F5C518' }}
        >
          <div className="absolute -top-2.5 left-4 bg-gradient-to-br from-amber-600 to-yellow-400 text-white px-3 py-0.5 rounded-full text-xs font-extrabold">
            GRATIS
          </div>
          <div className="font-extrabold text-lg text-[#1B3A6B] mb-1.5 mt-1">Trial SKD</div>
          <div className="text-amber-800 text-sm mb-4">
            {trialQuestions.length} soal · {trialDurasi} menit · TWK · TIU · TKP
          </div>
          <Button
            variant="gold"
            className="w-full"
            onClick={() => {
              setIsTrial(true);
              setTryoutActive(true);
            }}
          >
            Coba Sekarang
          </Button>
        </Card>
      </div>

      {/* Locked packages — always shown if not owned */}
      {packages.filter((p) => !p.video && !p.comingSoon && !ownedPkgIds.includes(p.id))
        .length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
          {packages
            .filter((p) => !p.video && !p.comingSoon && !ownedPkgIds.includes(p.id))
            .map((pkg) => (
              <Card
                key={pkg.id}
                hover
                className="border border-dashed border-gray-300 bg-gray-50 p-4 cursor-pointer"
                onClick={() => setShowPayModal(pkg)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-extrabold text-base text-gray-400">{pkg.name}</div>
                  <div className="text-lg">🔒</div>
                </div>
                <div className="text-xs text-gray-400 mb-1.5">
                  {pkg.tryouts} paket tryout · 110 soal/paket
                </div>
                <div className="font-black text-xl text-gray-400 mb-3">
                  Rp {pkg.price.toLocaleString('id-ID')}
                </div>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-400"
                  onClick={() => setShowPayModal(pkg)}
                >
                  Beli Sekarang
                </Button>
              </Card>
            ))}
        </div>
      )}

      {/* Owned packages */}
      {ownedPkgIds.length > 0 && (
        <div className="mb-4">
          <h3 className="font-extrabold text-base text-[#1B3A6B] mb-3">
            Paket Tryout Kamu
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {packages
              .filter((p) => !p.video && !p.comingSoon && ownedPkgIds.includes(p.id))
              .map((pkg) => {
                const bank = packageBanks[pkg.id] || [];
                const completed = completedTryouts[pkg.id] || [];
                return (
                  <Card
                    key={pkg.id}
                    className="border-2 border-blue-500 bg-blue-50 p-4 relative"
                  >
                    <div className="absolute -top-2.5 left-4 bg-blue-500 text-white px-3 py-0.5 rounded-full text-xs font-extrabold">
                      DIMILIKI
                    </div>
                    <div className="font-extrabold text-base text-[#1B3A6B] mb-1 mt-1">
                      {pkg.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {completed.length}/{bank.length} tryout selesai
                    </div>
                    <div className="h-1 bg-blue-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{
                          width: `${bank.length > 0 ? (completed.length / bank.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {bank.map((t) => {
                        const isDone = completed.includes(t.id);
                        const isActiveT = activeTryoutId === t.id && activePkgId === pkg.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              setActivePkgId(pkg.id);
                              setActiveTryoutId(t.id);
                            }}
                            className={`
                              flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all
                              ${
                                isActiveT
                                  ? 'border-blue-500 bg-blue-100 font-bold text-blue-700'
                                  : isDone
                                    ? 'border-green-300 bg-green-50 font-medium text-green-700'
                                    : 'border-gray-200 bg-white font-medium text-gray-700'
                              }
                            `}
                          >
                            <span>{t.name}</span>
                            <span className="text-base">
                              {isDone ? '✅' : isActiveT ? '▶' : '○'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {activeTryoutId && activePkgId === pkg.id && (
                      <Button
                        variant="primary"
                        className="w-full mt-2.5"
                        onClick={() => setTryoutActive(true)}
                      >
                        Mulai {bank.find((t) => t.id === activeTryoutId)?.name}
                      </Button>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Tryout History */}
      {tryoutHistory.length > 0 && (
        <div className="mt-2">
          <h3 className="font-extrabold text-base text-[#1B3A6B] mb-3">Riwayat Tryout</h3>
          <div className="flex flex-col gap-2.5">
            {tryoutHistory.map((h, i) => {
              const total = h.questions.reduce((s, q) => {
                const ansIdx = h.answers[h.questions.indexOf(q)];
                if (typeof ansIdx === 'undefined') return s;
                return s + getScore(q, ansIdx);
              }, 0);
              return (
                <Card
                  key={i}
                  className="flex items-center justify-between flex-wrap gap-3 p-4"
                >
                  <div>
                    <div className="font-bold text-sm text-[#1B3A6B] mb-0.5">
                      {h.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {h.date} · {h.questions.length} soal
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-black text-2xl text-[#1B3A6B]">
                      {total}{' '}
                      <span className="text-xs font-medium text-gray-400">poin</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewMode(h)}
                    >
                      Lihat Pembahasan
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <Modal
          open
          title="Pembayaran"
          onClose={() => {
            setShowPayModal(null);
            setPayStep('form');
            setProofFile(null);
          }}
          width="max-w-lg"
        >
          {payStep === 'success' ? (
            <div className="text-center py-2">
              <div className="text-6xl mb-3">🎉</div>
              <h3 className="font-black text-xl text-[#1B3A6B] mb-2">
                Pembayaran Berhasil! 🎉
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 mb-4 text-left">
                <p className="font-bold text-green-700 text-sm mb-0.5">
                  ✅ Akses langsung terbuka:
                </p>
                <p className="font-black text-lg text-green-800 m-0">
                  {showPayModal.name}
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full mb-2.5"
                onClick={() => {
                  if (showPayModal.video) {
                    setUnlockedVideo(true);
                    setShowPayModal(null);
                    setPayStep('form');
                    setProofFile(null);
                  } else {
                    setShowPayModal(null);
                    setPayStep('form');
                    setProofFile(null);
                  }
                }}
              >
                {showPayModal.video
                  ? 'Mulai Tonton Video →'
                  : 'Lihat Paket Tryout →'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowPayModal(null);
                  setPayStep('form');
                  setProofFile(null);
                }}
              >
                Nanti saja, ke Dashboard
              </Button>
            </div>
          ) : (
            <div>
              {/* Package info */}
              <div className="bg-blue-50 rounded-xl p-3.5 mb-4 flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-base text-[#1B3A6B] mb-0.5">
                    {showPayModal.name}
                  </p>
                  <p className="text-sm text-gray-500 m-0">{showPayModal.desc}</p>
                </div>
                <div className="font-black text-2xl text-[#1B3A6B]">
                  Rp {showPayModal.price.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Bank accounts */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
                <p className="font-bold text-amber-800 text-sm mb-2.5">
                  📋 Transfer ke salah satu rekening:
                </p>
                {useAppStore.getState().banks.map((b) => (
                  <div
                    key={b.id}
                    className="flex justify-between items-center mb-1.5 px-3 py-2 bg-white rounded-lg border border-amber-200"
                  >
                    <div>
                      <span className="font-bold text-sm text-gray-800">
                        Bank {b.bank}
                      </span>
                      <div className="text-xs text-gray-400">{b.atas}</div>
                    </div>
                    <span className="font-mono font-black text-sm text-[#1B3A6B] tracking-wide">
                      {b.norek}
                    </span>
                  </div>
                ))}
                <div className="mt-2.5 pt-2 border-t border-amber-200">
                  <a
                    href={WA_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-green-600 text-sm font-bold no-underline"
                  >
                    💬 Konfirmasi via WA +62 898-7608-379 →
                  </a>
                </div>
              </div>

              {/* Upload proof */}
              <p className="font-bold text-sm text-gray-700 mb-2">
                📸 Upload Bukti Transfer <span className="text-red-500">*</span>
              </p>

              {proofFile ? (
                <div className="border-2 border-green-400 rounded-xl overflow-hidden mb-0">
                  <img
                    src={proofFile.url}
                    alt="preview"
                    className="w-full max-h-52 object-cover"
                  />
                  <div className="flex justify-between items-center bg-green-50 px-4 py-2.5">
                    <span className="text-sm font-bold text-green-700">
                      ✅ {proofFile.name}
                    </span>
                    <button
                      onClick={() => setProofFile(null)}
                      className="text-xs text-gray-500 bg-none border-none cursor-pointer underline"
                    >
                      Ganti
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 mb-3">
                    <p className="text-xs text-sky-700 m-0 leading-relaxed">
                      <strong>Demo:</strong> Pilih contoh bukti transfer di
                      bawah. Di aplikasi nyata, kamu bisa upload foto langsung
                      dari galeri HP atau laptop.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {sampleProofs.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setProofFile(s)}
                        className="flex items-center gap-3.5 px-3.5 py-3 border border-gray-200 rounded-xl bg-white cursor-pointer text-left transition-all hover:border-blue-500 hover:bg-blue-50 w-full"
                      >
                        <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          <img
                            src={s.url}
                            alt={s.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-800">
                            {s.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            Klik untuk pilih sebagai bukti
                          </div>
                        </div>
                        <span className="ml-auto text-lg text-gray-400">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                className="w-full mt-4"
                disabled={!proofFile}
                onClick={() => setPayStep('success')}
              >
                Kirim Bukti Transfer
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── REVIEW MODE VIEW (inline) ──
function ReviewModeView({
  review,
  onBack,
  onRetry,
}: {
  review: { questions: Question[]; answers: Record<number, number>; name: string };
  onBack: () => void;
  onRetry: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const q = review.questions[idx];
  const userAns = review.answers[idx];
  const score = getScore(q, userAns);
  const isCorrect = q.cat !== 'TKP' ? userAns === q.ans : null;
  const statusColor =
    q.cat === 'TKP' ? '#7C3AED' : isCorrect ? '#16A34A' : '#DC2626';
  const statusLabel =
    q.cat === 'TKP' ? 'Karakteristik Pribadi' : isCorrect ? 'Benar' : 'Salah';

  return (
    <div>
      {/* Top nav */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Kembali
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400">Soal</span>
          <div className="flex gap-1 flex-wrap max-w-md">
            {review.questions.map((_, i) => {
              const a = review.answers[i];
              const q2 = review.questions[i];
              let bg = '#F1F5F9';
              let col = '#9CA3AF';
              if (a !== undefined) {
                if (q2.cat === 'TKP') {
                  bg = '#F5F3FF';
                  col = '#7C3AED';
                } else if (a === q2.ans) {
                  bg = '#F0FDF4';
                  col = '#16A34A';
                } else {
                  bg = '#FEF2F2';
                  col = '#DC2626';
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-7 h-7 rounded border-none cursor-pointer text-xs font-semibold transition-all ${
                    i === idx ? 'ring-2 ring-offset-1 ring-[#1B3A6B]' : ''
                  }`}
                  style={{
                    background: i === idx ? '#1B3A6B' : bg,
                    color: i === idx ? '#fff' : col,
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
        <Button variant="primary" onClick={onRetry}>
          🔄 Ulangi Tryout
        </Button>
      </div>

      {/* Question card */}
      <Card className="border-l-4 mb-4" style={{ borderLeftColor: statusColor }}>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Badge color={q.cat === 'TWK' ? 'blue' : q.cat === 'TIU' ? 'purple' : 'yellow'}>
            {q.cat}
          </Badge>
          <span className="text-sm text-gray-500 font-semibold">
            Soal {idx + 1} dari {review.questions.length}
          </span>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              color: statusColor,
              background: `${statusColor}15`,
            }}
          >
            {statusLabel}
          </span>
          <span className="text-xs font-bold text-gray-500 ml-auto">
            Nilai kamu:{' '}
            <span className="font-black text-[#1B3A6B]">{score}</span> poin
          </span>
        </div>

        <p className="font-bold text-base text-gray-800 mb-3 leading-relaxed">
          {q.q}
        </p>
        {q.qImg && (
          <img
            src={q.qImg}
            alt="soal"
            className="max-w-full max-h-56 rounded-lg mb-4 border border-gray-200 object-contain bg-white"
          />
        )}

        {/* Options */}
        <div className="flex flex-col gap-2 mb-5">
          {q.opts.map((opt, j) => {
            const isUser = userAns === j;
            const isJawaban = q.cat !== 'TKP' && q.ans === j;
            let bg = '#F9FAFB';
            let col = '#6B7280';
            let fw = 400;
            let border = '1px solid #F1F5F9';
            if (isJawaban) {
              bg = '#F0FDF4';
              col = '#15803D';
              fw = 700;
              border = '1.5px solid #86EFAC';
            } else if (isUser && q.cat !== 'TKP') {
              bg = '#FEF2F2';
              col = '#DC2626';
              fw = 600;
              border = '1.5px solid #FECACA';
            } else if (isUser && q.cat === 'TKP') {
              bg = '#F5F3FF';
              col = '#7C3AED';
              fw = 700;
              border = '1.5px solid #C4B5FD';
            }

            const dotColor = isJawaban
              ? '#16A34A'
              : isUser && q.cat !== 'TKP'
                ? '#DC2626'
                : isUser
                  ? '#7C3AED'
                  : '#E5E7EB';

            return (
              <div
                key={j}
                className="p-3 rounded-xl text-sm flex items-center gap-3"
                style={{
                  background: bg,
                  color: col,
                  fontWeight: fw,
                  border,
                }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs flex-shrink-0 text-white"
                  style={{ background: dotColor }}
                >
                  {String.fromCharCode(65 + j)}
                </span>
                <div className="flex-1">{opt && <span>{opt}</span>}</div>
                {isUser && (
                  <span className="text-xs font-bold opacity-70 flex-shrink-0">
                    ← Pilihan kamu
                  </span>
                )}
                {isJawaban && !isUser && (
                  <span className="text-xs font-bold text-green-600 flex-shrink-0">
                    ✓ Jawaban benar
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        {q.explanation ? (
          <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
            <p className="font-bold text-xs text-blue-700 mb-1">Pembahasan:</p>
            <div className="text-sm text-blue-800 leading-relaxed">
              {q.explanation}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200">
            <p className="text-xs text-gray-400 m-0">
              Pembahasan belum tersedia untuk soal ini.
            </p>
          </div>
        )}
      </Card>

      {/* Bottom nav */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          ← Soal Sebelumnya
        </Button>
        <span className="text-xs font-semibold text-gray-400">
          {idx + 1} / {review.questions.length}
        </span>
        <Button
          variant="primary"
          onClick={() => setIdx((i) => Math.min(review.questions.length - 1, i + 1))}
          disabled={idx === review.questions.length - 1}
        >
          Soal Berikutnya →
        </Button>
      </div>
    </div>
  );
}