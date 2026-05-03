'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, role, setUser, logout } = useAuthStore();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(user?.name || '');
  const [draftEmail, setDraftEmail] = useState(user?.email || '');

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const startEditing = () => {
    setDraftName(user?.name || '');
    setDraftEmail(user?.email || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveProfile = () => {
    if (!user || !role) return;
    setUser({ ...user, name: draftName, email: draftEmail }, role);
    setIsEditing(false);
  };

  return (
    <div className="max-w-lg">
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-5">👤 Profil Saya</h2>
      
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-4.5">
        <div className="flex items-center gap-4.5 mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-2xl text-white font-extrabold">
            {user?.avatar || (user?.name?.[0]?.toUpperCase() || 'U')}
          </div>
          <div>
            <h3 className="font-black text-lg text-[#1B3A6B] m-0">{user?.name || 'Pengguna'}</h3>
            <p className="text-gray-400 text-sm m-0">{user?.email || ''}</p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Nama Lengkap</label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
                placeholder="Nama Lengkap"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Email</label>
              <input
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="email@example.com"
              />
            </div>
            <div className="text-xs text-gray-400">
              Metode Login: Google OAuth
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button variant="primary" size="sm" onClick={saveProfile}>
                💾 Simpan
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing}>
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
                <span className="text-sm text-gray-800 font-bold">{value}</span>
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

      <Button variant="danger" onClick={handleLogout}>
        Keluar dari Akun
      </Button>
    </div>
  );
}
