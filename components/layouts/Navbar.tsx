'use client';

import { useRouter } from 'next/navigation';
import { Logo, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function Navbar() {
  const router = useRouter();
  const logoConfig = useAppStore((state) => state.logoConfig);
  const { isAuthenticated } = useAuthStore();

  const handleLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between h-[68px]">
        <Logo cfg={logoConfig} />
        
        {!isAuthenticated && (
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={handleLogin} size="sm">
              Masuk
            </Button>
            <Button variant="primary" onClick={handleRegister} size="sm">
              Daftar Gratis
            </Button>
          </div>
        )}
        
        {isAuthenticated && (
          <Button variant="primary" onClick={() => router.push('/dashboard')} size="sm">
            Dashboard
          </Button>
        )}
      </div>
    </nav>
  );
}
