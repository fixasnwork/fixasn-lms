'use client';

import { useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { hydrateFromSession } from '@/store/useAuthStore';
import { useAuthStore } from '@/store/useAuthStore';

const STALE_SESSION_MESSAGE = 'Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan.';

/**
 * Hydrates the Zustand auth store from NextAuth session.
 * Data fetching (packages, banks, tryouts, etc.) is handled
 * on-demand via TanStack Query hooks in individual pages.
 */
export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const hasHydrated = useRef(false);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (status !== 'loading' && !hasHydrated.current) {
      hasHydrated.current = true;
      if ((session as { isSessionStale?: boolean } | null)?.isSessionStale) {
        logout();
      } else {
        hydrateFromSession(session);
      }
    }
  }, [session, status, logout]);

  useEffect(() => {
    const syncDeviceSecret = async () => {
      if (status !== 'authenticated' || !session?.user) return;

      const role = (session.user as { role?: string }).role;
      if (role === 'admin') return;

      const response = await fetch('/api/auth/device-secret', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.status === 401) {
        logout();
        signOut({
          callbackUrl: `/login?reason=device-replaced&message=${encodeURIComponent(STALE_SESSION_MESSAGE)}`,
        });
      }
    };

    syncDeviceSecret().catch(() => {
      // Keep session flow resilient if sync endpoint temporarily fails.
    });
  }, [session, status, logout]);

  return <>{children}</>;
}
