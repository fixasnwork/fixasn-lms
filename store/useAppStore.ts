// ─────────────────────────────────────────────
// ZUSTAND STORE - APP STATE
// Backend-synced via Supabase API routes
// ─────────────────────────────────────────────
import { create } from 'zustand';
import type { Package, BankAccount, Question, LogoConfig, Tryout, Payment } from '@/lib/types';
import { inputsToQuestions } from '@/lib/questionTransform';
import { DEFAULT_PACKAGES, DEFAULT_BANK_ACCOUNTS } from '@/data/packages';
import { QUESTIONS, QUESTIONS_B } from '@/data/questions';

// Convert static defaults to full objects with synthetic numeric IDs
// (real IDs come from DB after fetch)
const DEFAULT_PACKAGES_WITH_IDS: Package[] = DEFAULT_PACKAGES.map((p, i) => ({
  ...p,
  id: -(i + 1), // synthetic negative ID until DB sync
}));

const DEFAULT_BANKS_WITH_IDS: BankAccount[] = DEFAULT_BANK_ACCOUNTS.map((b, i) => ({
  ...b,
  id: -(i + 1), // synthetic negative ID until DB sync
}));

interface AppState {
  // Data
  packages: Package[];
  banks: BankAccount[];
  questions: Question[];
  durationMin: number;
  packageBanks: Record<string, Tryout[]>; // key = stringified package ID
  trialSet: Tryout;
  logoConfig: LogoConfig;
  attemptHistory: Payment[];

  // Local setters (immediate UI update)
  setPackages: (packages: Package[]) => void;
  setBanks: (banks: BankAccount[]) => void;
  setQuestions: (questions: Question[]) => void;
  setDurationMin: (duration: number) => void;
  setPackageBanks: (banks: Record<string, Tryout[]>) => void;
  setTrialSet: (set: Tryout | ((prev: Tryout) => Tryout)) => void;
  setLogoConfig: (val: LogoConfig | ((prev: LogoConfig) => LogoConfig)) => void;

  // Backend sync actions
  fetchPackages: () => Promise<void>;
  fetchBanks: () => Promise<void>;
  fetchQuestions: (set?: string) => Promise<void>;
  syncPackages: () => Promise<boolean>;
  syncBanks: () => Promise<boolean>;
  syncQuestion: (question: Question) => Promise<Question | null>;
  saveQuestion: (question: Partial<Question>) => Promise<Question | null>;
  deleteQuestion: (id: number) => Promise<boolean>;
  fetchLogoConfig: () => Promise<void>;
  syncLogoConfig: () => Promise<boolean>;

  // Tryout & attempt actions
  fetchTryouts: () => Promise<void>;
  fetchAttemptHistory: (userId: string) => Promise<void>;
  saveAttempt: (payload: {
    userId: string;
    userName: string;
    tryoutId: number;
    twkScore: number;
    tiuScore: number;
    tkpScore: number;
    totalScore: number;
    answers: Record<number, number>;
  }) => Promise<boolean>;
  getAttemptHistory: (userId: string) => Record<string, number[]>;

  // Reset to defaults
  resetToDefaults: () => void;
}

const defaultLogoConfig: LogoConfig = {
  namaApp: "FIX ASN",
  tagline: "Sukses Lolos CPNS",
  warnaNama: "#1B3A6B",
  warnaTag: "#9A7000",
  warnaKiri: "#F5C518",
  warnaKanan: "#1B3A6B",
  warnaInner: "#1B3A6B",
  customImg: null,
  heroImg: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=700&q=85",
  heroCaption: "Ribuan ASN sudah lulus",
  heroSubCaption: "Bergabung dan wujudkan impianmu jadi ASN!",
  heroTitle1: "Lolos CPNS",
  heroTitle2: "Bukan Sekadar",
  heroTitle3: "Impian!",
  heroDesc: "Tryout SKD paling mirip ujian asli. 110 soal, timer 100 menit, sistem skoring TWK+TIU+TKP. Ribuan ASN sudah membuktikan.",
  skdTitle: "Materi Tryout SKD",
  skdSubtitle: "Persis seperti ujian CPNS aslinya — 110 soal, 100 menit",
  paketTitle: "Pilih Paket Belajarmu",
  paketSubtitle: "Harga terjangkau, kualitas setara bimbel premium",
  ctaTitle: "Siap Wujudkan Impianmu jadi ASN?",
  ctaSubtitle: "Bergabung sekarang, mulai tryout hari ini juga!",
  stat1Val: "15.000+",
  stat1Label: "Peserta Aktif",
  stat2Val: "98%",
  stat2Label: "Tingkat Kelulusan",
  stat3Val: "110",
  stat3Label: "Soal per Tryout",
  promoBannerText: "Platform Tryout CPNS Terpercaya #1",
  contactWA: "+62 898-7608-379",
  contactEmail: "info@fixasn.id",
  testimonial1Name: "Rizki A.",
  testimonial1Role: "Kemenkes RI",
  testimonial1Text: "Soal-soal tryoutnya mirip banget sama ujian asli. Skor TWK saya naik dari 85 jadi 130 setelah rutin tryout di sini!",
  testimonial2Name: "Maya S.",
  testimonial2Role: "Kemendikbud RI",
  testimonial2Text: "Video materinya sangat terstruktur. Modul PDF-nya membantu banget untuk belajar offline. Worth it banget!",
  testimonial3Name: "Doni P.",
  testimonial3Role: "BPS Jawa Timur",
  testimonial3Text: "Fitur ranking bikin saya terpacu. Tahu posisi nasional sendiri sangat memotivasi untuk terus berlatih!",
  themePrimary: "#1B3A6B",
  themeSecondary: "#2563EB",
  themeDark: "#0C1E45",
};

// Convert static QuestionInput data to Question[] for the store
const DEFAULT_QUESTIONS = inputsToQuestions([...QUESTIONS, ...QUESTIONS_B]);
const TRIAL_QUESTIONS = inputsToQuestions(
  [...QUESTIONS.filter((q) => q.category === 'TWK').slice(0, 3),
   ...QUESTIONS.filter((q) => q.category === 'TIU').slice(0, 4),
   ...QUESTIONS.filter((q) => q.category === 'TKP').slice(0, 3)]
);

// Use epoch placeholder for default dates — avoids hydration mismatch.
// Real dates come from DB on fetch.
const EPOCH = '1970-01-01T00:00:00.000Z';

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  packages: DEFAULT_PACKAGES_WITH_IDS,
  banks: DEFAULT_BANKS_WITH_IDS,
  questions: DEFAULT_QUESTIONS,
  durationMin: 100,
  packageBanks: {},
  trialSet: {
    id: 0, // synthetic ID (0 = trial, DB autoincrement starts at 1)
    name: "Trial",
    isTrial: true,
    sortOrder: 0,
    durationMin: 15,
    questions: TRIAL_QUESTIONS,
    startDate: null,
    endDate: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
  logoConfig: defaultLogoConfig,
  attemptHistory: [],

  // ── Local Setters ──────────────────────────────
  setPackages: (packages) => set({ packages }),
  setBanks: (banks) => set({ banks }),
  setQuestions: (questions) => set({ questions }),
  setDurationMin: (duration) => set({ durationMin: duration }),
  setPackageBanks: (banks) => set({ packageBanks: banks }),
  setTrialSet: (val: Tryout | ((prev: Tryout) => Tryout)) => {
    if (typeof val === 'function') {
      set((state) => ({ trialSet: val(state.trialSet) }));
    } else {
      set({ trialSet: val });
    }
  },
  setLogoConfig: (val: LogoConfig | ((prev: LogoConfig) => LogoConfig)) => {
    if (typeof val === 'function') {
      set((state) => ({ logoConfig: val(state.logoConfig) }));
    } else {
      set({ logoConfig: val });
    }
  },

  // ── Backend Fetch Actions ──────────────────────
  fetchPackages: async () => {
    try {
      const res = await fetch('/api/packages');
      const data = await res.json();
      if (data.packages) set({ packages: data.packages });
    } catch (e) {
      console.warn('Failed to fetch packages from API, using local data:', e);
    }
  },

  fetchBanks: async () => {
    try {
      const res = await fetch('/api/banks');
      const data = await res.json();
      if (data.banks) set({ banks: data.banks });
    } catch (e) {
      console.warn('Failed to fetch banks from API, using local data:', e);
    }
  },

  fetchQuestions: async (setFilter?: string) => {
    try {
      const url = setFilter ? `/api/questions?set=${setFilter}` : '/api/questions';
      const res = await fetch(url);
      const data = await res.json();
      if (data.questions) set({ questions: data.questions });
    } catch (e) {
      console.warn('Failed to fetch questions from API, using local data:', e);
    }
  },

  fetchLogoConfig: async () => {
    try {
      const res = await fetch('/api/logo-config');
      const data = await res.json();
      if (data.config) {
        // Merge DB config over defaults so empty DB doesn't wipe hero text/images
        const merged = { ...defaultLogoConfig, ...data.config };
        set({ logoConfig: merged });
        
        // Inject brand colors as CSS variables for runtime theming
        if (merged.themePrimary) {
          document.documentElement.style.setProperty('--brand-primary', merged.themePrimary);
        }
        if (merged.themeSecondary) {
          document.documentElement.style.setProperty('--brand-secondary', merged.themeSecondary);
        }
        if (merged.themeDark) {
          document.documentElement.style.setProperty('--brand-dark', merged.themeDark);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch logo config from API, using local data:', e);
    }
  },

  // ── Backend Sync Actions ───────────────────────
  syncPackages: async () => {
    try {
      const res = await fetch('/api/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: get().packages }),
      });
      const data = await res.json();
      return data.success === true;
    } catch (e) {
      console.error('Failed to sync packages:', e);
      return false;
    }
  },

  syncBanks: async () => {
    try {
      const res = await fetch('/api/banks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banks: get().banks }),
      });
      const data = await res.json();
      return data.success === true;
    } catch (e) {
      console.error('Failed to sync banks:', e);
      return false;
    }
  },

  saveQuestion: async (q: Partial<Question>) => {
    try {
      const method = q.id ? 'PUT' : 'POST';
      const res = await fetch('/api/questions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q),
      });
      const data = await res.json();
      if (data.success && data.question) {
        // Update local state
        const questions = get().questions;
        if (q.id) {
          set({ questions: questions.map((x) => (x.id === q.id ? data.question : x)) });
        } else {
          set({ questions: [...questions, data.question] });
        }
        return data.question;
      }
      return null;
    } catch (e) {
      console.error('Failed to save question:', e);
      return null;
    }
  },

  syncQuestion: async (question: Question) => {
    try {
      const res = await fetch('/api/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question),
      });
      const data = await res.json();
      if (data.success && data.question) {
        set({ questions: get().questions.map((x) => (x.id === question.id ? data.question : x)) });
        return data.question;
      }
      return null;
    } catch (e) {
      console.error('Failed to sync question:', e);
      return null;
    }
  },

  deleteQuestion: async (id: number) => {
    try {
      const res = await fetch(`/api/questions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        set({ questions: get().questions.filter((q) => q.id !== id) });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to delete question:', e);
      return false;
    }
  },

  syncLogoConfig: async () => {
    try {
      const res = await fetch('/api/logo-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(get().logoConfig),
      });
      const data = await res.json();
      return data.success === true;
    } catch (e) {
      console.error('Failed to sync logo config:', e);
      return false;
    }
  },

  // ── Tryout & Attempt Actions ──────────────────
  fetchTryouts: async () => {
    try {
      const res = await fetch('/api/tryouts');
      const data = await res.json();
      if (data.tryouts) set({ packageBanks: data.tryouts });
    } catch (e) {
      console.warn('Failed to fetch tryouts from API, using local data:', e);
    }
  },

  fetchAttemptHistory: async (userId: string) => {
    try {
      const res = await fetch(`/api/tryout-attempts?userId=${userId}`);
      const data = await res.json();
      if (data.attempts) set({ attemptHistory: data.attempts });
    } catch (e) {
      console.warn('Failed to fetch attempt history from API:', e);
    }
  },

  saveAttempt: async (payload) => {
    try {
      const res = await fetch('/api/tryout-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.attempt) {
        set({ attemptHistory: [data.attempt, ...get().attemptHistory] });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Failed to save attempt:', e);
      return false;
    }
  },

  // Derives completed tryout IDs per package from attempt history.
  // Used for progress bar rendering on dashboard.
  getAttemptHistory: (_userId: string) => {
    void _userId;
    // attemptHistory is now Payment[] — return empty until we migrate to TryoutAttempt
    const result: Record<string, number[]> = {};
    return result;
  },

  resetToDefaults: () =>
    set({
      packages: DEFAULT_PACKAGES_WITH_IDS,
      banks: DEFAULT_BANKS_WITH_IDS,
      packageBanks: {},
      logoConfig: defaultLogoConfig,
      attemptHistory: [],
    }),
}));
