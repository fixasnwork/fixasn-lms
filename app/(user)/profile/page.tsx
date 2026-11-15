'use client';
import { hasPaymentAccess } from '@/lib/packageAccess';

import { useState, useRef, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signOut, useSession } from 'next-auth/react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui';

import {
  usePackages,
  useTryouts,
  useUserPayments,
  useAttemptHistory,
} from '@/hooks/useTryoutQueries';

export default function ProfilePage() {
  const { user, role, logout } = useAuthStore();
  const { data: session, update: refreshSession } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(user?.name || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Active packages data ──────────
  const sessionEmail = session?.user?.email ?? user?.email;
  const { data: packages = [], isFetching: isFetchingPackages } = usePackages();
  const { data: tryoutBanks = {} } = useTryouts();
  const { data: userPayments = [], isFetching: isFetchingPayments } =
    useUserPayments(sessionEmail);
  const { data: attemptHistory = [] } = useAttemptHistory(sessionEmail);

  const isLoadingActivePackages = isFetchingPackages || isFetchingPayments;

  // Recalculate on refresh so crossing the expiry instant updates ownership.
  const ownedPkgIds = new Set(userPayments.filter((payment) => hasPaymentAccess(payment)).map((payment) => payment.packageId));

  // Best totalScore per tryoutId (across all of user's attempts)
  const bestScoresByTryout = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of attemptHistory) {
      if (!a.finishedAt) continue;
      const cur = map.get(a.tryoutId) ?? 0;
      if (a.totalScore > cur) map.set(a.tryoutId, a.totalScore);
    }
    return map;
  }, [attemptHistory]);

  // Finished tryoutIds per packageId (for progress)
  const finishedTryoutIdsByPkg = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const a of attemptHistory) {
      if (!a.finishedAt) continue;
      for (const pkgIdStr of Object.keys(tryoutBanks)) {
        const pkgId = Number(pkgIdStr);
        const list = tryoutBanks[pkgIdStr] ?? [];
        if (list.some((t) => t.id === a.tryoutId)) {
          let set = map.get(pkgId);
          if (!set) {
            set = new Set();
            map.set(pkgId, set);
          }
          set.add(a.tryoutId);
        }
      }
    }
    return map;
  }, [attemptHistory, tryoutBanks]);

  const activePackages = packages.filter((pkg) => ownedPkgIds.has(pkg.id));

  const hasAvatarUrl = !!(user?.avatar && user.avatar.startsWith('http'));
  const userInitial = user?.name?.[0]?.toUpperCase() || 'U';

  // Subscribe to wall-clock time via useSyncExternalStore (React 19 pattern).
  // Returns 0 during SSR, real timestamp on client. Updates every minute.
  const now = useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 60_000);
      return () => clearInterval(id);
    },
    () => Date.now(),
    () => 0,
  );

  // ── helpers ────────────────────────────────
  const resetError = () => setError('');

  const handleLogout = () => {
    logout();
    signOut({ callbackUrl: '/' });
  };

  const startEditing = () => {
    setDraftName(user?.name || '');
    setIsEditing(true);
    resetError();
  };

  const cancelEditing = () => {
    setIsEditing(false);
    resetError();
  };

  // ── save name ──────────────────────────────
  const saveProfile = async () => {
    if (!user || !role) return;
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError('Nama tidak boleh kosong');
      return;
    }
    if (trimmed === user.name) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan');
      }

      const { user: updated } = await res.json();
      // use getState() to get the latest user, then merge
      const latestUser = useAuthStore.getState().user;
      if (latestUser) {
        useAuthStore.getState().setUser(
          {
            ...latestUser,
            name: updated.name,
            avatar: updated.avatar,
            updatedAt: updated.updatedAt,
          },
          role,
        );
      }
      setIsEditing(false);
      router.refresh(); // ensure server components refetch fresh data
      refreshSession(); // update JWT token so next page load has correct data
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  // ── upload avatar ──────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !role) return;

    // client-side validation
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Hanya file .jpg dan .png yang diizinkan');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // 1) Upload to Supabase storage
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal mengupload avatar');
      }

      const { url } = await uploadRes.json();

      // 2) Update user profile with new avatar URL
      const profileRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      });

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan avatar');
      }

      const { user: updated } = await profileRes.json();
      const latestUser = useAuthStore.getState().user;
      if (latestUser) {
        useAuthStore.getState().setUser(
          {
            ...latestUser,
            name: updated.name,
            avatar: updated.avatar,
            updatedAt: updated.updatedAt,
          },
          role,
        );
      }
      router.refresh();
      refreshSession();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal mengupload avatar');
    } finally {
      setUploading(false);
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── remove avatar ──────────────────────────
  const handleRemoveAvatar = async () => {
    if (!user || !role || !hasAvatarUrl) return;

    setUploading(true);
    setError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menghapus avatar');
      }

      const { user: updated } = await res.json();
      const latestUser = useAuthStore.getState().user;
      if (latestUser) {
        useAuthStore.getState().setUser(
          {
            ...latestUser,
            name: updated.name,
            avatar: updated.avatar,
            updatedAt: updated.updatedAt,
          },
          role,
        );
      }
      router.refresh();
      refreshSession();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="font-black text-2xl text-brand mb-5">👤 Profil Saya</h2>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-4.5">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4.5 mb-5">
          <div className="relative group">
            {hasAvatarUrl ? (
              <Image
                src={user!.avatar!}
                alt={user?.name || 'User'}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand to-brand-secondary flex items-center justify-center text-2xl text-white font-extrabold ring-2 ring-gray-100">
                {userInitial}
              </div>
            )}

            {/* Upload overlay (appears on hover) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
              title="Ubah foto profil"
            >
              <span className="text-white text-lg">{uploading ? '⏳' : '📷'}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-lg text-brand m-0 truncate">
              {user?.name || 'Pengguna'}
            </h3>
            <p className="text-gray-400 text-sm m-0 truncate">{user?.email || ''}</p>

            {/* Avatar actions */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer"
              >
                {uploading ? 'Mengupload...' : hasAvatarUrl ? '📷 Ganti Foto' : '📷 Upload Foto'}
              </button>
              {hasAvatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="text-xs font-bold text-red-500 hover:text-red-600 bg-transparent border-none cursor-pointer"
                >
                  🗑️ Hapus
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit / View mode */}
        {isEditing ? (
          <div className="space-y-3">
            {/* Name field */}
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">
                Nama Lengkap
              </label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-blue-400"
                placeholder="Nama Lengkap"
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Email — read-only */}
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Email</label>
              <input
                value={user?.email || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                Email tidak dapat diubah
              </p>
            </div>

            <div className="text-xs text-gray-400">Metode Login: Google OAuth</div>

            <div className="flex gap-2.5 pt-2">
              <Button variant="primary" size="sm" onClick={saveProfile} disabled={saving}>
                {saving ? '⏳ Menyimpan...' : '💾 Simpan'}
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              ['Nama Lengkap', user?.name || '-'],
              ['Email', user?.email || '-'],
              ['Metode Login', 'Google OAuth'],
            ].map(([label, value]) => (
              <div key={label} className="flex py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-400 font-semibold w-36">{label}</span>
                <span className="text-sm text-gray-800 font-bold truncate">{value}</span>
              </div>
            ))}
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={startEditing}>
                ✏️ Edit Profil
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Active packages ────────── */}
      <div className="mt-7">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-black text-2xl text-brand">📦 Paket Aktif</h2>
          <span className="text-[11px] font-bold tracking-[0.06em] text-gray-400">
            {activePackages.length > 0
              ? `${activePackages.length} PAKET`
              : 'KOSONG'}
          </span>
        </div>

        {isLoadingActivePackages ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center text-sm text-gray-400">
            Memuat paket...
          </div>
        ) : activePackages.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-7 text-center">
            <div className="text-3xl mb-2 opacity-70">📦</div>
            <div className="font-extrabold text-sm text-brand mb-1">
              Belum ada paket aktif
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Pilih paket tryout yang sesuai kebutuhanmu dan mulai latihan sekarang.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/buy')}
            >
              Lihat Paket Tryout →
            </Button>
          </div>
        ) : (
          activePackages.map((pkg, idx) => {
            const pkgKey = String(pkg.id);
            const pkgTryouts = tryoutBanks[pkgKey] ?? [];
            const totalSesi = pkg.tryoutCount ?? pkgTryouts.length;
            const finishedIds = finishedTryoutIdsByPkg.get(pkg.id) ?? new Set<number>();
            const selesai = finishedIds.size;
            const progressPct =
              totalSesi > 0 ? Math.min(100, (selesai / totalSesi) * 100) : 0;

            const scores = pkgTryouts
              .map((t) => bestScoresByTryout.get(t.id))
              .filter((s): s is number => s !== undefined);
            const skorAvg =
              scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : null;

            const daysLeft =
              pkg.endDate && now > 0
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(pkg.endDate).getTime() - now) /
                        (1000 * 60 * 60 * 24),
                    ),
                  )
                : null;

            const fmtDate = (iso: string | null) =>
              iso
                ? new Date(iso).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : null;
            const startStr = fmtDate(pkg.startDate);
            const endStr = fmtDate(pkg.endDate);

            const isTrial = pkg.isTrial;
            const stripClass = isTrial
              ? 'bg-gradient-to-r from-amber-500 to-orange-400'
              : 'bg-gradient-to-r from-brand to-brand-secondary';
            const iconBgClass = isTrial
              ? 'bg-gradient-to-br from-amber-500 to-orange-400'
              : 'bg-gradient-to-br from-brand to-brand-secondary';
            const progressBarClass = isTrial
              ? 'bg-amber-500'
              : 'bg-brand-secondary';
            const ctaLabel = selesai > 0 ? 'Lanjutkan Tryout' : 'Mulai Tryout';

            return (
              <div
                key={pkg.id}
                className="relative mb-4 overflow-hidden rounded-2xl border border-gray-100 shadow-md bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_rgba(28,58,107,0.12)] motion-safe:animate-[pa-rise_.55s_cubic-bezier(.2,.7,.2,1)_both]"
                style={{ animationDelay: `${0.08 + idx * 0.1}s` }}
              >
                <div className={`h-[3px] ${stripClass}`} />
                <div className="p-5">
                  {/* head */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl ${iconBgClass} grid place-items-center text-lg flex-shrink-0`}
                    >
                      {isTrial ? '🎯' : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-[15px] text-brand leading-tight truncate">
                        {pkg.name}
                      </div>
                      <div className="text-[11px] font-medium text-gray-400 mt-0.5 truncate">
                        #{pkg.id} · {totalSesi} sesi tryout SKD
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold tracking-wider text-white flex-shrink-0 ${
                        isTrial ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white motion-safe:animate-[pa-pulse_1.8s_ease-in-out_infinite]" />
                      {isTrial ? 'Trial' : 'Aktif'}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-gray-500 mb-3.5">
                    {pkg.description}
                  </p>

                  {/* progress */}
                  <div className="flex justify-between items-center text-[11px] mb-1.5">
                    <span className="text-gray-400 font-semibold">Progress</span>
                    <span className="text-brand font-bold">
                      {selesai} / {totalSesi} selesai
                    </span>
                  </div>
                  <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden mb-3.5">
                    <div
                      className={`h-full rounded-full ${progressBarClass} motion-safe:animate-[pa-fill_1.1s_cubic-bezier(.2,.7,.2,1)_0.45s_forwards]`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* stats */}
                  <div className="grid grid-cols-3 border-y border-gray-100 py-3 mb-3.5">
                    <div className="text-center border-r border-gray-100 px-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        Sesi
                      </div>
                      <div className="font-extrabold text-base text-brand">
                        {totalSesi}
                      </div>
                    </div>
                    <div className="text-center border-r border-gray-100 px-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        Skor Avg
                      </div>
                      <div
                        className={`font-extrabold text-base ${
                          skorAvg !== null ? 'text-brand' : 'text-gray-300'
                        }`}
                      >
                        {skorAvg !== null ? skorAvg : '—'}
                      </div>
                    </div>
                    <div className="text-center px-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        Sisa Hari
                      </div>
                      <div className="font-extrabold text-base text-brand">
                        {daysLeft !== null ? daysLeft : '∞'}
                      </div>
                    </div>
                  </div>

                  {/* validity */}
                  {(startStr || endStr) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium mb-3.5 flex-wrap">
                      <span>📅</span>
                      <span>Berlaku</span>
                      {startStr && (
                        <span className="text-gray-700 font-bold">{startStr}</span>
                      )}
                      {startStr && endStr && (
                        <span className="text-gray-300">→</span>
                      )}
                      {endStr && (
                        <span className="text-gray-700 font-bold">{endStr}</span>
                      )}
                    </div>
                  )}

                  {/* actions */}
                  <div className="flex gap-2 items-center">
                    <Button
                      variant={isTrial ? 'gold' : 'primary'}
                      size="sm"
                      onClick={() => router.push('/tryout')}
                    >
                      {ctaLabel} →
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/tryout')}
                    >
                      Detail
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Logout */}
      <Button variant="danger" onClick={handleLogout}>
        🚪 Keluar dari Akun
      </Button>
    </div>
  );
}
