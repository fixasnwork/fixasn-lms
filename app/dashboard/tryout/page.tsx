'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Tryout, Package } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { Button, Card, Modal } from '@/components/ui';
import {
  usePackages,
  useBanks,
  useTryouts,
  useUserPayments,
  useUploadProof,
  useCreatePayment,
  useCreateOrResumeAttempt,
  useAttemptHistory,
} from '@/hooks/useTryoutQueries';

/* ── Helpers ─────────────────────────────────────────────────────── */
/** Build a reverse map: tryoutId → array of packageIds that include it. */
function buildTryoutToPackages(packageBanks: Record<string, Tryout[]>): Record<number, number[]> {
  const map: Record<number, number[]> = {};
  for (const [pkgIdStr, tryouts] of Object.entries(packageBanks)) {
    const pkgId = parseInt(pkgIdStr, 10);
    for (const t of tryouts) {
      if (!map[t.id]) map[t.id] = [];
      if (!map[t.id].includes(pkgId)) map[t.id].push(pkgId);
    }
  }
  return map;
}

export default function TryoutPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // ── TanStack Query hooks ──
  const { data: packages = [], isFetching: isFetchingPackages } = usePackages();
  const { data: banks = [] } = useBanks();
  const { data: tryoutBanks = {}, isFetching: isFetchingTryouts } = useTryouts();
  const userEmail = session?.user?.email ?? undefined;
  const { data: userPayments = [], isFetching: isFetchingPayments } = useUserPayments(userEmail);
  const { data: attemptHistory = [], isFetching: isFetchingHistory } = useAttemptHistory(userEmail);
  const uploadProof = useUploadProof();
  const createPayment = useCreatePayment();
  const createOrResumeAttempt = useCreateOrResumeAttempt();

  // ── Derived: owned package IDs (pending or verified = access granted) ──
  const ownedPkgIds = userPayments
    .filter((p) => p.status === 'pending' || p.status === 'verified')
    .map((p) => p.packageId);

  // ── Derived: all unique tryouts + tryout→packages mapping ──
  const tryoutToPackages = buildTryoutToPackages(tryoutBanks);

  const allTryouts: Tryout[] = (() => {
    const seen = new Set<number>();
    const result: Tryout[] = [];
    for (const tryouts of Object.values(tryoutBanks)) {
      for (const t of tryouts) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          result.push(t);
        }
      }
    }
    return result;
  })();

  // Separate trial from regular tryouts
  const trialTryout = allTryouts.find((t) => t.isTrial);
  const regularTryouts = allTryouts.filter((t) => !t.isTrial);

  const isLoading = isFetchingTryouts || isFetchingPayments || isFetchingPackages;

  const isTryoutUnlocked = (tryoutId: number): boolean => {
    const pkgIds = tryoutToPackages[tryoutId] || [];
    return pkgIds.some((pid) => ownedPkgIds.includes(pid));
  };

  // ── Start / resume attempt ──
  const handleStartTryout = async (tryoutId: number) => {
    try {
      const result = await createOrResumeAttempt.mutateAsync(tryoutId);
      router.push(`/dashboard/tryout/${result.attempt.id}`);
    } catch (err) {
      // If access denied, show payment modal instead
      if (err instanceof Error && err.message.includes('Access denied')) {
        const pkgIds = tryoutToPackages[tryoutId] || [];
        setPaymentModal({ step: 'select-package', tryoutId, packageIds: pkgIds });
      }
    }
  };

  // ── Payment modal state ──
  type PaymentModalState =
    | null
    | { step: 'select-package'; tryoutId: number; packageIds: number[] }
    | { step: 'payment'; tryoutId: number; selectedPkg: Package }
    | { step: 'success'; pkg: Package };
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(null);

  // ── Payment proof state ──
  const [proofFile, setProofFile] = useState<{ name: string; url: string } | null>(null);
  const [proofFileRaw, setProofFileRaw] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['jpg', 'jpeg', 'png'];
    if (!allowedExts.includes(ext)) {
      setUploadError('Hanya file .jpg dan .png yang diperbolehkan');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const allowedMimes = ['image/jpeg', 'image/png'];
    if (!allowedMimes.includes(file.type)) {
      setUploadError('Hanya file gambar JPG dan PNG yang diperbolehkan');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setProofFileRaw(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofFile({ name: file.name, url: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    if (!paymentModal || paymentModal.step !== 'payment' || !proofFileRaw) return;

    setUploadError(null);

    try {
      const { url: proofUrl } = await uploadProof.mutateAsync(proofFileRaw);

      await createPayment.mutateAsync({
        packageId: paymentModal.selectedPkg.id,
        proofUrl,
      });

      setPaymentModal({
        step: 'success',
        pkg: paymentModal.selectedPkg,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  };

  const isSubmitting = uploadProof.isPending || createPayment.isPending;

  const closeModal = () => {
    setPaymentModal(null);
    setProofFile(null);
    setProofFileRaw(null);
    setUploadError(null);
  };

  const handlePackageSelect = (pkg: Package) => {
    if (paymentModal && 'tryoutId' in paymentModal) {
      setPaymentModal({
        step: 'payment',
        tryoutId: paymentModal.tryoutId,
        selectedPkg: pkg,
      });
    }
  };

  // ── Render ──
  return (
    <div>
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">📝 Tryout SKD</h2>
      <p className="text-gray-400 text-sm mb-5">
        110 soal · 100 menit · TWK + TIU + TKP
      </p>

      {/* ── Trial Card ── */}
      {trialTryout && (
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
              {(trialTryout._questionCount ?? trialTryout.questions.length)} soal · {trialTryout.durationMin || 15} menit · TWK · TIU · TKP
            </div>
            <Button
              variant="gold"
              className="w-full"
              onClick={() => handleStartTryout(trialTryout.id)}
              disabled={createOrResumeAttempt.isPending}
            >
              {createOrResumeAttempt.isPending ? 'Memuat...' : 'Coba Sekarang'}
            </Button>
          </Card>
        </div>
      )}

      {/* ── Loading indicator ── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Memuat data tryout...
        </div>
      )}

      {/* ── Regular tryouts ── */}
      {!isLoading && regularTryouts.length > 0 && (
        <div>
          <h3 className="font-extrabold text-base text-[#1B3A6B] mb-3">Tryout Tersedia</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
            {regularTryouts.map((t) => {
              const unlocked = isTryoutUnlocked(t.id);
              const pkgIds = tryoutToPackages[t.id] || [];
              const pkgNames = pkgIds
                .map((pid) => packages.find((p) => p.id === pid)?.name)
                .filter(Boolean)
                .join(', ');

              return (
                <Card
                  key={t.id}
                  hover
                  className={`p-4 relative transition-all ${
                    unlocked
                      ? 'border-2 border-blue-500 bg-blue-50 hover:border-blue-600 hover:shadow-md cursor-pointer'
                      : 'border border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:shadow-md'
                  }`}
                  onClick={() => unlocked && handleStartTryout(t.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={`font-extrabold text-base ${unlocked ? 'text-[#1B3A6B]' : 'text-gray-500'}`}>
                      {t.name}
                    </div>
                    <div className="text-lg">{unlocked ? '🔓' : '🔒'}</div>
                  </div>
                  <div className={`text-xs mb-1.5 ${unlocked ? 'text-gray-500' : 'text-gray-400'}`}>
                    {(t._questionCount ?? t.questions.length)} soal · 100 menit
                  </div>
                  {pkgNames && (
                    <div className={`text-xs mb-3 ${unlocked ? 'text-blue-600' : 'text-gray-400'}`}>
                      {unlocked ? '✅' : '📦'} {pkgNames}
                    </div>
                  )}
                  {!unlocked && (
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentModal({ step: 'select-package', tryoutId: t.id, packageIds: pkgIds });
                      }}
                    >
                      Buka Paket →
                    </Button>
                  )}
                  {unlocked && (
                    <div className="text-xs text-blue-600 font-semibold mt-2">
                      Klik untuk mulai →
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No tryouts yet ── */}
      {!isLoading && regularTryouts.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Belum ada tryout tersedia.
        </div>
      )}

      {/* ── Tryout History (from API) ── */}
      {!isFetchingHistory && attemptHistory.length > 0 && (
        <div className="mt-2">
          <h3 className="font-extrabold text-base text-[#1B3A6B] mb-3">Riwayat Tryout</h3>
          <div className="flex flex-col gap-2.5">
            {attemptHistory.map((h) => {
              const tryoutName = allTryouts.find((t) => t.id === h.tryoutId)?.name || `Tryout #${h.tryoutId}`;
              return (
                <Card
                  key={h.id}
                  hover
                  className="flex items-center justify-between flex-wrap gap-3 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => router.push(`/dashboard/tryout/${h.id}`)}
                >
                  <div>
                    <div className="font-bold text-sm text-[#1B3A6B] mb-0.5">
                      {tryoutName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(h.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-black text-2xl text-[#1B3A6B]">
                      {h.totalScore}{' '}
                      <span className="text-xs font-medium text-gray-400">poin</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/tryout/${h.id}`);
                      }}
                    >
                      {h.totalScore > 0 ? 'Lihat Pembahasan' : 'Lanjutkan'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Payment Modal: Select Package ── */}
      {paymentModal && paymentModal.step === 'select-package' && (
        <Modal open title="Pilih Paket" onClose={closeModal} width="max-w-lg">
          <p className="text-sm text-gray-500 mb-4">
            Tryout ini termasuk dalam paket berikut. Pilih salah satu untuk melanjutkan:
          </p>
          <div className="flex flex-col gap-2.5">
            {paymentModal.packageIds.map((pkgId) => {
              const pkg = packages.find((p) => p.id === pkgId);
              if (!pkg) return null;
              const alreadyOwned = ownedPkgIds.includes(pkgId);
              return (
                <button
                  key={pkgId}
                  onClick={() => handlePackageSelect(pkg)}
                  disabled={alreadyOwned}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all w-full ${
                    alreadyOwned
                      ? 'border-green-300 bg-green-50 cursor-default'
                      : 'border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-gray-800">
                      {pkg.name}
                      {alreadyOwned && (
                        <span className="ml-2 text-xs text-green-600 font-semibold">
                          ✅ Sudah dimiliki
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{pkg.description}</div>
                  </div>
                  <div className="font-black text-lg text-[#1B3A6B]">
                    Rp {pkg.price.toLocaleString('id-ID')}
                  </div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ── Payment Modal: Upload Proof ── */}
      {paymentModal && paymentModal.step === 'payment' && (
        <Modal open title="Pembayaran" onClose={closeModal} width="max-w-lg">
          {/* Package info */}
          <div className="bg-blue-50 rounded-xl p-3.5 mb-4 flex justify-between items-center">
            <div>
              <p className="font-extrabold text-base text-[#1B3A6B] mb-0.5">
                {paymentModal.selectedPkg.name}
              </p>
              <p className="text-sm text-gray-500 m-0">{paymentModal.selectedPkg.description}</p>
            </div>
            <div className="font-black text-2xl text-[#1B3A6B]">
              Rp {paymentModal.selectedPkg.price.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Bank accounts */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
            <p className="font-bold text-amber-800 text-sm mb-2.5">
              📋 Transfer ke salah satu rekening:
            </p>
            {banks.map((b) => (
              <div
                key={b.id}
                className="flex justify-between items-center mb-1.5 px-3 py-2 bg-white rounded-lg border border-amber-200"
              >
                <div>
                  <span className="font-bold text-sm text-gray-800">
                    Bank {b.bankName}
                  </span>
                  <div className="text-xs text-gray-400">{b.accountHolder}</div>
                </div>
                <span className="font-mono font-black text-sm text-[#1B3A6B] tracking-wide">
                  {b.accountNumber}
                </span>
              </div>
            ))}
          </div>

          {/* Upload proof */}
          <p className="font-bold text-sm text-gray-700 mb-2">
            📸 Upload Bukti Transfer <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Hanya file .jpg dan .png yang diperbolehkan (maks. 5MB)
          </p>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-sm text-red-700">
              ❌ {uploadError}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={handleProofFileChange}
            className="hidden"
          />

          {proofFile ? (
            <div className="border-2 border-green-400 rounded-xl overflow-hidden mb-0 relative h-52">
              <Image
                src={proofFile.url}
                alt="Bukti transfer preview"
                fill
                unoptimized
                sizes="100vw"
                className="object-cover"
              />
              <div className="flex justify-between items-center bg-green-50 px-4 py-2.5">
                <span className="text-sm font-bold text-green-700">
                  ✅ {proofFile.name}
                </span>
                <button
                  onClick={() => {
                    setProofFile(null);
                    setProofFileRaw(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs text-gray-500 bg-none border-none cursor-pointer underline"
                >
                  Ganti
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="text-3xl mb-2">📷</div>
              <div className="font-bold text-sm text-gray-600">
                Klik untuk pilih bukti transfer
              </div>
              <div className="text-xs text-gray-400 mt-1">
                JPG atau PNG · Maksimal 5MB
              </div>
            </button>
          )}

          <Button
            variant="primary"
            className="w-full mt-4"
            disabled={!proofFile || isSubmitting}
            onClick={handleSubmitPayment}
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Bukti Transfer'}
          </Button>
        </Modal>
      )}

      {/* ── Payment Modal: Success ── */}
      {paymentModal && paymentModal.step === 'success' && (
        <Modal open title="Pembayaran Berhasil!" onClose={closeModal} width="max-w-lg">
          <div className="text-center py-2">
            <div className="text-6xl mb-3">🎉</div>
            <h3 className="font-black text-xl text-[#1B3A6B] mb-2">
              Akses Langsung Terbuka! 🎉
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 mb-4 text-left">
              <p className="font-bold text-green-700 text-sm mb-0.5">
                ✅ Bukti pembayaran terkirim (menunggu verifikasi admin)
              </p>
              <p className="font-black text-lg text-green-800 m-0">
                {paymentModal.pkg.name}
              </p>
            </div>
            <Button variant="primary" className="w-full mb-2.5" onClick={closeModal}>
              Lihat Tryout →
            </Button>
            <Button variant="ghost" className="w-full" onClick={closeModal}>
              Nanti saja
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
