// ─────────────────────────────────────────────
// ZUSTAND STORE - APP STATE
// ─────────────────────────────────────────────
import { create } from 'zustand';
import type { Package, BankAccount, Question, TryoutSet, LogoConfig, Tryout } from '@/lib/types';
import { DEFAULT_PACKAGES, DEFAULT_BANK_ACCOUNTS, DEFAULT_TRYOUT_SETS } from '@/data/packages';
import { DEFAULT_PACKAGE_BANKS, QUESTIONS } from '@/data/questions';

interface AppState {
  // Data
  packages: Package[];
  banks: BankAccount[];
  questions: Question[];
  durationMin: number;
  tryoutSets: TryoutSet[];
  packageBanks: Record<string, Tryout[]>;
  trialSet: TryoutSet;
  logoConfig: LogoConfig;

  // Actions
  setPackages: (packages: Package[]) => void;
  setBanks: (banks: BankAccount[]) => void;
  setQuestions: (questions: Question[]) => void;
  setDurationMin: (duration: number) => void;
  setTryoutSets: (sets: TryoutSet[]) => void;
  setPackageBanks: (banks: Record<string, Tryout[]>) => void;
  setTrialSet: (set: TryoutSet | ((prev: TryoutSet) => TryoutSet)) => void;
  setLogoConfig: (val: LogoConfig | ((prev: LogoConfig) => LogoConfig)) => void;

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
};

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  packages: DEFAULT_PACKAGES.map(p => ({ ...p })),
  banks: DEFAULT_BANK_ACCOUNTS.map(b => ({ ...b })),
  questions: QUESTIONS,
  durationMin: 100,
  tryoutSets: DEFAULT_TRYOUT_SETS.map(s => ({ ...s })),
  packageBanks: JSON.parse(JSON.stringify(DEFAULT_PACKAGE_BANKS)),
  trialSet: {
    id: "trial",
    name: "Trial",
    durationMin: 15,
    questions: QUESTIONS.slice(0, 10),
  },
  logoConfig: defaultLogoConfig,

  // Actions
  setPackages: (packages) => set({ packages }),
  setBanks: (banks) => set({ banks }),
  setQuestions: (questions) => set({ questions }),
  setDurationMin: (duration) => set({ durationMin: duration }),
  setTryoutSets: (sets) => set({ tryoutSets: sets }),
  setPackageBanks: (banks) => set({ packageBanks: banks }),
  setTrialSet: (val: TryoutSet | ((prev: TryoutSet) => TryoutSet)) => {
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

  resetToDefaults: () => set({
    packages: DEFAULT_PACKAGES.map(p => ({ ...p })),
    banks: DEFAULT_BANK_ACCOUNTS.map(b => ({ ...b })),
    tryoutSets: DEFAULT_TRYOUT_SETS.map(s => ({ ...s })),
    packageBanks: JSON.parse(JSON.stringify(DEFAULT_PACKAGE_BANKS)),
    logoConfig: defaultLogoConfig,
  }),
}));
