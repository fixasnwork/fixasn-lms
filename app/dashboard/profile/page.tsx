'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="max-w-lg">
      <h2 className="font-black text-2xl text-[#1B3A6B] mb-5">👤 Profil Saya</h2>
      
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-4.5">
        <div className="flex items-center gap-4.5 mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-2xl text-white font-extrabold">
            {user?.avatar || 'U'}
          </div>
          <div>
            <h3 className="font-black text-lg text-[#1B3A6B] m-0">{user?.name || 'Pengguna'}</h3>
            <p className="text-gray-400 text-sm m-0">{user?.email || ''}</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            ['Nama Lengkap', user?.name || '-'],
            ['Email Google', user?.email || '-'],
            ['Metode Login', 'Google OAuth'],
          ].map(([label, value]) => (
            <div key={label} className="flex py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-400 font-semibold w-36">{label}</span>
              <span className="text-sm text-gray-800 font-bold">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="danger" onClick={handleLogout}>
        Keluar dari Akun
      </Button>
    </div>
  );
}
