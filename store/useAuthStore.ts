// ─────────────────────────────────────────────
// ZUSTAND STORE - AUTH STATE
// Persisted to localStorage for session survival
// ─────────────────────────────────────────────
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/lib/types';

interface AuthState {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (user: User, role: UserRole) => void;
  logout: () => void;
  setUser: (user: User, role: UserRole) => void;
  setLoading: (loading: boolean) => void;
}

const ADMIN_EMAIL = 'admin@fixasn.id';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: true,

      login: (user, role) => set({ user, role, isAuthenticated: true, isLoading: false }),
      logout: () => set({ user: null, role: null, isAuthenticated: false, isLoading: false }),
      setUser: (user, role) => set({ user, role, isAuthenticated: true, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'fixasn-auth',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false);
        }
      },
    }
  )
);

/**
 * Hydrate auth store from a NextAuth session object.
 * Call this in a client component (e.g., layout) after fetching session.
 */
export function hydrateFromSession(session: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
} | null) {
  if (session?.user?.email) {
    const isAdmin = session.user.email === ADMIN_EMAIL;
    const user: User = {
      id: session.user.email,
      name: session.user.name || 'Pengguna',
      email: session.user.email,
      role: isAdmin ? 'admin' : 'user',
      avatar: session.user.image || session.user.email[0].toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useAuthStore.getState().setUser(user, isAdmin ? 'admin' : 'user');
  } else {
    useAuthStore.getState().setLoading(false);
  }
}
