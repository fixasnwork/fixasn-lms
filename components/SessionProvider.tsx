'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { hydrateFromSession } from '@/store/useAuthStore';

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

  useEffect(() => {
    if (status !== 'loading' && !hasHydrated.current) {
      hasHydrated.current = true;
      hydrateFromSession(session);
    }
  }, [session, status]);

  return <>{children}</>;
}
