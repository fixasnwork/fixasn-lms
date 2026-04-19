// ─────────────────────────────────────────────
// ZUSTAND STORE - AUTH STATE
// ─────────────────────────────────────────────
import { create } from 'zustand';
import type { User, UserRole } from '@/lib/types';

interface AuthState {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;

  // Actions
  login: (user: User, role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,

  login: (user, role) => set({ user, role, isAuthenticated: true }),
  logout: () => set({ user: null, role: null, isAuthenticated: false }),
}));
