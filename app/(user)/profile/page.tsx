'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signOut, useSession } from 'next-auth/react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui';

export default function ProfilePage() {
  const { user, role, logout } = useAuthStore();
  const { update: refreshSession } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(user?.name || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasAvatarUrl = !!(user?.avatar && user.avatar.startsWith('http'));
  const userInitial = user?.name?.[0]?.toUpperCase() || 'U';

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
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-5">👤 Profil Saya</h2>

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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-2xl text-white font-extrabold ring-2 ring-gray-100">
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
            <h3 className="font-black text-lg text-[#1B3A6B] m-0 truncate">
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

      {/* Logout */}
      <Button variant="danger" onClick={handleLogout}>
        🚪 Keluar dari Akun
      </Button>
    </div>
  );
}
