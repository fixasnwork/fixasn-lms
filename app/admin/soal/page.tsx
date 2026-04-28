'use client';

import { useState } from 'react';
import type { Question, QuestionCategory, Tryout } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { Button, Card, Modal } from '@/components/ui';
import SoalTable from '@/components/admin/SoalTable';
import ImageUpload from '@/components/admin/ImageUpload';

interface SoalFormState {
  cat: QuestionCategory;
  q: string;
  qImg: string;
  opts: string[];
  optImgs: string[];
  ans: number;
  tkpVals: number[];
  explanation: string;
  explanationImg: string;
}

export default function SoalPage() {
  const {
    packages,
    trialSet,
    durationMin,
    packageBanks,
    setDurationMin,
    setTrialSet,
    setPackageBanks,
  } = useAppStore();

  const [activePkgTab, setActivePkgTab] = useState<string>('trial');
  const [activeTryoutTab, setActiveTryoutTab] = useState<string | null>(null);
  const [adminDuration, setAdminDuration] = useState(durationMin);
  const [adminPkgBanks, setAdminPkgBanks] = useState<Record<string, Tryout[]>>(() =>
    JSON.parse(JSON.stringify(packageBanks))
  );

  const [showAddSoal, setShowAddSoal] = useState(false);
  const [editSoal, setEditSoal] = useState<number | null>(null);
  const [soalForm, setSoalForm] = useState<SoalFormState>({
    cat: 'TWK',
    q: '',
    qImg: '',
    opts: ['', '', '', '', ''],
    optImgs: ['', '', '', '', ''],
    ans: 0,
    tkpVals: [5, 4, 3, 2, 1],
    explanation: '',
    explanationImg: '',
  });

  const [soalSavedMsg, setSoalSavedMsg] = useState('');

  // Get current questions based on active tab
  const getCurrentQuestions = (): Question[] => {
    if (activePkgTab === 'trial') {
      return trialSet?.questions || [];
    }
    const bank = adminPkgBanks[activePkgTab] || [];
    const currentTab =
      activeTryoutTab && bank.find((t) => t.id === activeTryoutTab)
        ? activeTryoutTab
        : bank[0]?.id;
    const currentTryout = bank.find((t) => t.id === currentTab);
    return currentTryout?.questions || [];
  };

  const saveQ = (updated: Question[]) => {
    if (activePkgTab === 'trial') {
      setTrialSet((t) => ({ ...t, questions: updated }));
    } else {
      const bank = adminPkgBanks[activePkgTab] || [];
      const currentTab =
        activeTryoutTab && bank.find((t) => t.id === activeTryoutTab)
          ? activeTryoutTab
          : bank[0]?.id;
      const newBanks = {
        ...adminPkgBanks,
        [activePkgTab]: bank.map((t) =>
          t.id === currentTab ? { ...t, questions: updated } : t
        ),
      };
      setAdminPkgBanks(newBanks);
      setPackageBanks(newBanks);
    }
  };

  const openAddSoal = () => {
    setSoalForm({
      cat: 'TWK',
      q: '',
      qImg: '',
      opts: ['', '', '', '', ''],
      optImgs: ['', '', '', '', ''],
      ans: 0,
      tkpVals: [5, 4, 3, 2, 1],
      explanation: '',
      explanationImg: '',
    });
    setEditSoal(null);
    setShowAddSoal(true);
  };

  const openEditSoal = (q: Question) => {
    setSoalForm({
      cat: q.cat,
      q: q.q,
      qImg: q.qImg || '',
      opts: [...q.opts],
      optImgs: q.optImgs ? [...q.optImgs] : ['', '', '', '', ''],
      ans: q.ans ?? 0,
      tkpVals: q.tkpVals ? [...q.tkpVals] : [5, 4, 3, 2, 1],
      explanation: q.explanation || '',
      explanationImg: q.explanationImg || '',
    });
    setEditSoal(q.id);
    setShowAddSoal(true);
  };

  const saveSoal = () => {
    if (!soalForm.q.trim() && !soalForm.qImg) {
      alert('Pertanyaan tidak boleh kosong!');
      return;
    }
    const filledOpts = soalForm.opts.filter((o, j) => {
      const hasText = typeof o === 'string' && o.trim().length > 0;
      const hasImg =
        soalForm.optImgs && soalForm.optImgs[j] && soalForm.optImgs[j].length > 0;
      return hasText || hasImg;
    });
    if (filledOpts.length < 2) {
      alert('Isi minimal 2 pilihan jawaban (A dan B)!');
      return;
    }
    const currentQ = getCurrentQuestions();
    const newId =
      editSoal ||
      (currentQ.length > 0
        ? Math.max(...currentQ.map((q) => Number(q.id) || 0)) + 1
        : 1);
    const soalBaru = { ...soalForm, id: newId };
    let updated: Question[];
    if (editSoal) {
      updated = currentQ.map((q) => (q.id === editSoal ? soalBaru : q));
    } else {
      updated = [...currentQ, soalBaru];
    }
    saveQ(updated);
    setShowAddSoal(false);
    setEditSoal(null);
    setSoalSavedMsg(editSoal ? '✅ Soal diperbarui!' : '✅ Soal ditambahkan!');
    setTimeout(() => setSoalSavedMsg(''), 2500);
  };

  const deleteSoal = (id: number) => {
    const updated = getCurrentQuestions().filter((q) => q.id !== id);
    saveQ(updated);
  };

  const saveDuration = () => {
    setDurationMin(adminDuration);
    setSoalSavedMsg(`✅ Durasi diset ke ${adminDuration} menit!`);
    setTimeout(() => setSoalSavedMsg(''), 2500);
  };

  // Determine current tryout tab and info
  const currentBank =
    activePkgTab && activePkgTab !== 'trial'
      ? adminPkgBanks[activePkgTab] || []
      : [];
  const currentTab =
    activeTryoutTab && currentBank.find((t) => t.id === activeTryoutTab)
      ? activeTryoutTab
      : currentBank[0]?.id;
  const currentTryout = currentBank.find((t) => t.id === currentTab);
  const currentQ = currentTryout?.questions || [];
  const activePkg = packages.find((p) => p.id === activePkgTab);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">📝 Bank Soal</h2>
          <p className="text-gray-400 text-sm m-0">
            Kelola soal per paket tryout secara terpisah
          </p>
        </div>
        <div className="flex gap-2.5 items-center">
          <span className="font-bold text-sm text-gray-500">⏱ Durasi:</span>
          <input
            type="number"
            value={adminDuration}
            min={10}
            max={300}
            onChange={(e) => setAdminDuration(Number(e.target.value))}
            className="w-12 px-1.5 py-1 border border-gray-200 rounded-lg font-bold text-sm text-center"
          />
          <span className="text-sm text-gray-500">menit</span>
          <Button variant="primary" size="sm" onClick={saveDuration}>
            Simpan
          </Button>
        </div>
      </div>

      {soalSavedMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 font-bold text-green-700 text-sm">
          {soalSavedMsg}
        </div>
      )}

      {/* Package selector cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {/* Trial */}
        <div
          onClick={() => {
            setActivePkgTab('trial');
            setActiveTryoutTab(null);
          }}
          className={`rounded-xl p-4 cursor-pointer select-none transition-all ${
            activePkgTab === 'trial'
              ? 'border-2 border-amber-500 bg-amber-50'
              : 'border border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-sm text-amber-600">🎯 Trial Gratis</span>
            {activePkgTab === 'trial' && (
              <span className="bg-amber-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-md">
                AKTIF
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {trialSet?.questions?.length || 0} soal · {trialSet?.durationMin || 15}{' '}
            menit
          </div>
        </div>

        {/* Paid packages */}
        {packages
          .filter((p) => !p.video)
          .map((pkg) => {
            const bank = adminPkgBanks[pkg.id] || [];
            const totalSoal = bank.reduce((s, t) => s + (t.questions?.length || 0), 0);
            const isActive = activePkgTab === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => {
                  setActivePkgTab(pkg.id);
                  setActiveTryoutTab(bank[0]?.id || null);
                }}
                className={`rounded-xl p-4 cursor-pointer select-none transition-all ${
                  isActive
                    ? 'border-2 border-blue-500 bg-blue-50'
                    : 'border border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-[#1B3A6B]">{pkg.name}</span>
                  {isActive && (
                    <span className="bg-blue-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-md">
                      AKTIF
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {bank.length} tryout · {totalSoal} soal total
                </div>
              </div>
            );
          })}
      </div>

      {/* Editor */}
      <Card className="p-0 overflow-hidden">
        {/* TRIAL */}
        {activePkgTab === 'trial' && (
          <div>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1B3A6B]">Trial Gratis</span>
                <span className="text-sm text-gray-400 ml-2">
                  {trialSet?.questions?.length || 0} soal · durasi
                </span>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={trialSet?.durationMin || 15}
                  onChange={(e) =>
                    setTrialSet((t) => ({ ...t, durationMin: Number(e.target.value) }))
                  }
                  className="w-11 px-1.5 py-0.5 border border-gray-200 rounded-md font-bold text-xs text-center"
                />
                <span className="text-xs text-gray-400">menit</span>
              </div>
              <Button variant="gold" size="sm" onClick={openAddSoal}>
                + Tambah Soal
              </Button>
            </div>
            <div className="p-4">
              <SoalTable
                questions={trialSet?.questions || []}
                onEdit={(q) => openEditSoal(q)}
                onDelete={(id) =>
                  setTrialSet((t) => ({
                    ...t,
                    questions: t.questions.filter((q) => q.id !== id),
                  }))
                }
              />
            </div>
          </div>
        )}

        {/* PAID PACKAGES */}
        {activePkgTab && activePkgTab !== 'trial' && (
          <div>
            {/* Tryout tabs */}
            <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50">
              {currentBank.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTryoutTab(t.id)}
                  className={`px-4 py-2.5 border-b-2 flex-shrink-0 font-bold text-sm transition-all ${
                    currentTab === t.id
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {t.name}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-extrabold ${
                      currentTab === t.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {t.questions?.length || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-[#1B3A6B]">
                {activePkg?.name} — {currentTryout?.name}
                <span className="font-normal text-gray-400 text-sm ml-2">
                  ({currentQ.length} soal · TWK:{currentQ.filter((q) => q.cat === 'TWK').length}{' '}
                  TIU:{currentQ.filter((q) => q.cat === 'TIU').length} TKP:
                  {currentQ.filter((q) => q.cat === 'TKP').length})
                </span>
              </span>
              <Button variant="primary" size="sm" onClick={openAddSoal}>
                + Tambah Soal
              </Button>
            </div>

            {/* Table */}
            <div className="p-4">
              <SoalTable
                questions={currentQ}
                onEdit={(q) => openEditSoal(q)}
                onDelete={(id) => saveQ(currentQ.filter((q) => q.id !== id))}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {showAddSoal && (
        <Modal
          open
          title={editSoal ? '✏️ Edit Soal' : '➕ Tambah Soal'}
          onClose={() => {
            setShowAddSoal(false);
            setEditSoal(null);
          }}
          width={620}
        >
          <div className="flex flex-col gap-4">
            {/* Category */}
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">
                Kategori
              </label>
              <div className="flex gap-2">
                {(['TWK', 'TIU', 'TKP'] as QuestionCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSoalForm((f) => ({ ...f, cat }))}
                    className={`px-4 py-2 border-2 rounded-lg cursor-pointer font-bold text-sm transition-all ${
                      soalForm.cat === cat
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Question text */}
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">
                Pertanyaan
              </label>
              <textarea
                rows={3}
                value={soalForm.q}
                onChange={(e) => setSoalForm((f) => ({ ...f, q: e.target.value }))}
                placeholder="Ketik pertanyaan di sini..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-y"
              />
            </div>

            {/* Question image */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <label className="text-sm font-bold text-gray-700 block mb-2">
                🖼️ Gambar Soal{' '}
                <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <ImageUpload
                value={soalForm.qImg || ''}
                onChange={(v) => setSoalForm((f) => ({ ...f, qImg: v }))}
              />
            </div>

            {/* Options */}
            {['A', 'B', 'C', 'D', 'E'].map((opt, j) => (
              <div
                key={opt}
                className={`border-2 rounded-xl p-3 ${
                  soalForm.cat !== 'TKP' && soalForm.ans === j
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">
                    Pilihan {opt}
                    {soalForm.cat !== 'TKP' && soalForm.ans === j && (
                      <span className="text-green-600 ml-1.5">✓ Kunci</span>
                    )}
                  </label>
                  {soalForm.cat === 'TKP' ? (
                    <span className="text-sm text-violet-600 font-semibold">
                      Nilai:{' '}
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={soalForm.tkpVals[j]}
                        onChange={(e) => {
                          const v = [...soalForm.tkpVals];
                          v[j] = Number(e.target.value);
                          setSoalForm((f) => ({ ...f, tkpVals: v }));
                        }}
                        className="w-10 px-1 py-0.5 border border-gray-200 rounded text-xs text-center"
                      />
                    </span>
                  ) : (
                    soalForm.ans !== j && (
                      <button
                        type="button"
                        onClick={() => setSoalForm((f) => ({ ...f, ans: j }))}
                        className="text-xs text-gray-500 bg-white border border-gray-200 rounded-md px-2 py-1 cursor-pointer"
                      >
                        Jadikan Kunci
                      </button>
                    )
                  )}
                </div>
                <input
                  value={soalForm.opts[j] || ''}
                  onChange={(e) => {
                    const o = [...soalForm.opts];
                    o[j] = e.target.value;
                    setSoalForm((f) => ({ ...f, opts: o }));
                  }}
                  placeholder={`Teks pilihan ${opt}`}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm mb-1.5"
                />
                <ImageUpload
                  value={soalForm.optImgs?.[j] || ''}
                  onChange={(v) => {
                    const imgs = [...(soalForm.optImgs || ['', '', '', '', ''])];
                    imgs[j] = v;
                    setSoalForm((f) => ({ ...f, optImgs: imgs }));
                  }}
                />
              </div>
            ))}

            {/* Explanation */}
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">
                Pembahasan{' '}
                <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <textarea
                rows={2}
                value={soalForm.explanation || ''}
                onChange={(e) =>
                  setSoalForm((f) => ({ ...f, explanation: e.target.value }))
                }
                placeholder="Penjelasan jawaban..."
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm resize-y mb-2"
              />
              <ImageUpload
                value={soalForm.explanationImg || ''}
                onChange={(v) => setSoalForm((f) => ({ ...f, explanationImg: v }))}
              />
            </div>

            <Button
              variant="primary"
              onClick={saveSoal}
            >
              💾 Simpan Soal
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}