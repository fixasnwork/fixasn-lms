'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: '🏠', label: 'Dashboard' },
  { id: 'tryout', icon: '📝', label: 'Tryout SKD' },
  { id: 'buy', icon: '🛒', label: 'Beli Paket' },
  { id: 'video', icon: '🎬', label: 'Video Belajar' },
  { id: 'ranking', icon: '🏅', label: 'Ranking' },
  { id: 'profile', icon: '👤', label: 'Profil' },
];

export default function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const currentPage = pathname?.split('/').pop() || 'home';

  const handleNav = (id: string) => {
    router.push(`/dashboard/${id === 'home' ? '' : id}`);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const userAvatar = user?.avatar || user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[228px] bg-white border-r border-gray-100 fixed h-screen top-0 shadow-md z-50">
        {/* User Info */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
            {userAvatar}
          </div>
          <div className="overflow-hidden">
            <div className="font-bold text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
              {user?.name || 'Pengguna'}
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
              {user?.email || ''}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                flex items-center gap-2.5 w-full p-2.5 rounded-xl border-none cursor-pointer
                font-['Montserrat',sans-serif] font-semibold text-sm text-left mb-0.75
                transition-all duration-150
                ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-transparent text-gray-500 hover:bg-gray-50'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3.5 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full p-2.25 rounded-xl border-none cursor-pointer font-['Montserrat',sans-serif] font-semibold text-sm text-red-600 bg-red-50"
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
        <div className="flex justify-around items-center py-1.5 pb-[env(safe-area-inset-bottom,6px)]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                flex flex-col items-center gap-0.5 bg-none border-none cursor-pointer p-1.5
                font-['Montserrat',sans-serif]
                ${currentPage === item.id ? 'text-blue-600' : 'text-gray-400'}
              `}
            >
              <span className="text-5">{item.icon}</span>
              <span className={`text-2.25 ${currentPage === item.id ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
