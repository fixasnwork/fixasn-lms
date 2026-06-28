'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuthStore } from '@/store/useAuthStore';
import { Logo } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  count?: number;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const logoConfig = useAppStore((state) => state.logoConfig);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Mock pending count for demo
  const pendingCount = 3;

  const navItems: NavItem[] = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'soal', icon: '📝', label: 'Bank Soal' },
    { id: 'payments', icon: '💳', label: 'Verifikasi Bayar', count: pendingCount },
    { id: 'settings', icon: '⚙️', label: 'Pengaturan' },
    { id: 'video', icon: '🎬', label: 'Video Belajar' },
    { id: 'landing', icon: '🌐', label: 'Landing Page' },
  ];
  const primaryMobileItems = navItems.slice(0, 3);
  const moreMobileItems = navItems.slice(3);

  const currentPage = pathname?.split('/').pop() || 'dashboard';

  const handleNav = (id: string) => {
    setIsMoreOpen(false);
    router.push(`/admin/${id}`);
  };

  const handleLogout = () => {
    setIsMoreOpen(false);
    logout();
    signOut({ callbackUrl: '/' });
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-gradient-to-b from-brand-dark to-brand fixed h-screen top-0 z-50">
        {/* Logo */}
        <div className="p-4.5 border-b border-white/10">
          <Logo size="sm" cfg={logoConfig} className="mb-2.5" />
          <div className="mt-2.5 bg-yellow-400/15 border border-yellow-400/30 rounded-md px-2.5 py-1 inline-flex items-center gap-1.25">
            <span className="text-2.5">🔑</span>
            <span className="text-2.75 text-yellow-400 font-extrabold">ADMIN PANEL</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                flex items-center gap-2.5 w-full p-2.75 rounded-xl border-none cursor-pointer
                font-['Montserrat',sans-serif] font-semibold text-sm text-left mb-0.75
                transition-all duration-150
                ${
                  currentPage === item.id
                    ? 'bg-white/15 text-white'
                    : 'bg-transparent text-white/50 hover:bg-white/5'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className="ml-auto bg-red-600 text-white rounded-md px-1.75 text-xs font-extrabold">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3.5 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full p-2.25 rounded-xl border-none cursor-pointer font-['Montserrat',sans-serif] font-semibold text-sm text-white/50 bg-white/7.5"
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      {isMoreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsMoreOpen(false)}
          />
          <div
            data-testid="admin-more-menu"
            className="md:hidden fixed left-0 right-0 z-40 bg-white rounded-t-2xl border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,0.1)] p-4 pb-[calc(env(safe-area-inset-bottom,28px)+28px)] max-h-[calc(100vh-120px)] overflow-y-auto"
            style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Menu Lainnya</p>
            <div className="flex flex-col gap-2">
              {moreMobileItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer text-left ${
                    currentPage === item.id ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-semibold text-sm">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="ml-auto bg-red-600 text-white rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center text-[10px] font-extrabold">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer bg-red-50 text-red-600 text-left"
              >
                <span className="text-xl">🚪</span>
                <span className="font-semibold text-sm">Keluar</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
        <div className="flex justify-around items-center py-1.5 pb-[env(safe-area-inset-bottom,6px)]">
          {primaryMobileItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                flex flex-col items-center gap-0.5 bg-none border-none cursor-pointer p-1.5 w-20
                font-['Montserrat',sans-serif] relative
                ${currentPage === item.id ? 'text-brand' : 'text-gray-400'}
              `}
            >
              <span className="text-4.5">{item.icon}</span>
              <span className={`text-2.25 ${currentPage === item.id ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute top-0.5 right-1 bg-red-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-2.25 font-extrabold">
                  {item.count}
                </span>
              )}
            </button>
          ))}
          <button
            data-testid="admin-more-toggle"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            className={`
              flex flex-col items-center gap-0.5 bg-none border-none cursor-pointer p-1.5 w-20
              font-['Montserrat',sans-serif] relative
              ${isMoreOpen ? 'text-brand' : 'text-gray-400'}
            `}
          >
            <span className="text-4.5">☰</span>
            <span className={`text-2.25 ${isMoreOpen ? 'font-bold' : 'font-medium'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
