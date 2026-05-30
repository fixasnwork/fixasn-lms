'use client';

import { usePathname, useRouter } from 'next/navigation';

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'tryout', icon: '📝', label: 'Tryout' },
  { id: 'buy', icon: '🛒', label: 'Beli' },
  { id: 'video', icon: '🎬', label: 'Video' },
  { id: 'ranking', icon: '🏅', label: 'Ranking' },
  { id: 'profile', icon: '👤', label: 'Profil' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const segment = pathname?.split('/').pop() || '';
  const currentPage = segment === 'dashboard' ? 'home' : segment;

  const handleNav = (id: string) => {
    router.push(id === 'home' ? '/dashboard' : `/${id}`);
  };

  return (
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
  );
}
