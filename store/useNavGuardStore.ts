// ─────────────────────────────────────────────
// ZUSTAND STORE - NAVIGATION GUARD
// Used by the tryout engine to mark a session as "in progress" so the
// sidebar/bottom-nav can intercept clicks and prompt the user before
// leaving. The save callback is held via a ref so consumers always read
// the latest closure without forcing store re-renders on every answer.
// ─────────────────────────────────────────────
import { create } from 'zustand';

export interface NavGuardProgress {
  answered: number;
  total: number;
  /** Pre-formatted timer label, e.g. "12:34". */
  timeLeftLabel: string;
}

interface NavGuardState {
  /** True when an in-progress tryout is mounted and nav should be guarded. */
  isActive: boolean;
  /** Save function provided by the in-progress tryout engine. */
  save: (() => Promise<void>) | null;
  /** Optional progress snapshot for the sidebar/bottom-nav modal. */
  progress: NavGuardProgress | null;
  setActive: (active: boolean) => void;
  setSave: (save: (() => Promise<void>) | null) => void;
  setProgress: (progress: NavGuardProgress | null) => void;
  reset: () => void;
}

export const useNavGuardStore = create<NavGuardState>((set) => ({
  isActive: false,
  save: null,
  progress: null,
  setActive: (isActive) => set({ isActive }),
  setSave: (save) => set({ save }),
  setProgress: (progress) => set({ progress }),
  reset: () => set({ isActive: false, save: null, progress: null }),
}));
