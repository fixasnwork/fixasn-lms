// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

export type QuestionCategory = "TWK" | "TIU" | "TKP";

export interface Question {
  id: number;
  cat: QuestionCategory;
  q: string;
  opts: string[];
  ans?: number; // correct answer index (TWK/TIU)
  tkpVals?: number[]; // TKP scoring values [A=5,B=4,C=3,D=2,E=1]
  qImg?: string;
  optImgs?: string[];
  explanation?: string;
  explanationImg?: string;
}

export interface Tryout {
  id: string;
  name: string;
  questions: Question[];
}

export interface TryoutSet {
  id: string;
  name: string;
  label?: string;
  questions: Question[];
  durationMin?: number;
}

export interface Package {
  id: string;
  name: string;
  tryouts: number;
  price: number;
  desc: string;
  popular: boolean;
  video: boolean;
  comingSoon: boolean;
}

export interface BankAccount {
  id: string;
  bank: string;
  norek: string;
  atas: string;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
  purchasedPackageIds?: string[];
}

export type UserRole = "user" | "admin" | null;

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  email: string;
  pkg: string;
  amount: number;
  status: "pending" | "verified" | "blocked";
  date: string;
  proofUrl: string;
}

export interface LogoConfig {
  namaApp: string;
  tagline: string;
  warnaNama: string;
  warnaTag: string;
  warnaKiri: string;
  warnaKanan: string;
  warnaInner: string;
  customImg: string | null;
  heroImg: string;
  heroCaption: string;
  heroSubCaption: string;
  heroTitle1: string;
  heroTitle2: string;
  heroTitle3: string;
  heroDesc: string;
  skdTitle: string;
  skdSubtitle: string;
  paketTitle: string;
  paketSubtitle: string;
  ctaTitle: string;
  ctaSubtitle?: string;
  stat1Val: string;
  stat1Label: string;
  stat2Val: string;
  stat2Label: string;
  stat3Val: string;
  stat3Label: string;
}

export interface SoalForm {
  cat: QuestionCategory;
  q: string;
  qImg: string;
  opts: string[];
  optImgs: string[];
  ans: number;
  tkpVals: number[];
  explanation: string;
  explanationImg: string;
}

export interface TryoutHistoryEntry {
  name: string;
  date: string;
  questions: Question[];
  answers: Record<number, number>;
}

export interface ScoringResult {
  TWK: number;
  TIU: number;
  TKP: number;
  total: number;
}

export interface ReviewMode {
  questions: Question[];
  answers: Record<number, number>;
  name: string;
}
