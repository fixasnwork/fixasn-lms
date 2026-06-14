// ─────────────────────────────────────────────
// TYPE DEFINITIONS — Schema v2 (camelCase IDs)
// ID convention:
//   Master/reference tables → number
//   Transactional tables    → string (UUID v7)
//   Junction tables         → number
// ─────────────────────────────────────────────

// ── Categories ────────────────────────────────
export type QuestionCategory = "TWK" | "TIU" | "TKP";

// ── Questions & Options ───────────────────────
export interface Question {
  id: number;
  category: QuestionCategory;
  question: string;
  correctAnswer: number | null;
  questionImage: string | null;
  explanation: string | null;
  explanationImage: string | null;
  options: QuestionOption[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: number;
  questionId: number;
  optionIndex: number;
  optionText: string | null;
  optionImage: string | null;
  tkpValue: number | null;
}

export interface SoalForm {
  category: QuestionCategory;
  question: string;
  questionImage: string;
  options: string[];
  optionImages: string[];
  correctAnswer: number;
  tkpValues: number[];
  explanation: string;
  explanationImage: string;
}

/** Simplified question shape for static data files (options as string arrays). */
export interface QuestionInput {
  id: number;
  category: QuestionCategory;
  question: string;
  correctAnswer?: number | null;
  questionImage?: string;
  options: string[];
  optionImages?: string[];
  tkpValues?: number[];
  explanation?: string;
  explanationImage?: string;
}

// ── Tryouts & M2M ─────────────────────────────
export interface Tryout {
  id: number;
  name: string;
  isTrial: boolean;
  sortOrder: number;
  durationMin: number;
  questions: Question[];
  /** Question count when questions array is empty (light query mode) */
  _questionCount?: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TryoutQuestion {
  id: number;
  tryoutId: number;
  questionId: number;
  sortOrder: number;
}

export interface PackageTryout {
  id: number;
  packageId: number;
  tryoutId: number;
}

// ── Packages ──────────────────────────────────
export interface Package {
  id: number;
  name: string;
  description: string;
  price: number;
  isTrial: boolean;
  tryoutCount?: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Bank Accounts ─────────────────────────────
export interface BankAccount {
  id: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Users & Roles ─────────────────────────────
export type UserRole = "user" | "admin" | null;

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ── Permissions ───────────────────────────────
export interface Permission {
  id: number;
  name: string;
  description: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: number;
  role: UserRole;
  permissionId: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermission {
  id: number;
  userId: string;
  permissionId: number;
  isGranted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Payments ──────────────────────────────────
export interface Payment {
  id: string;       // UUID v7
  userId: string;   // references user.email
  packageId: number;
  status: "pending" | "verified" | "blocked";
  proofUrl: string | null;
  blockReason: string | null;
  createdAt: string;
  updatedAt: string;
  userIsBlocked?: boolean;
  userBlockedReason?: string | null;
}

// ── User Purchases ────────────────────────────
export interface UserPurchase {
  id: string;       // UUID v7
  userId: string;   // references user.email
  packageId: number;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Tryout Attempts & Answers ─────────────────
export interface TryoutAttempt {
  id: string;       // UUID v7
  userId: string;   // references user.email
  userName: string;
  tryoutId: number;
  twkScore: number;
  tiuScore: number;
  tkpScore: number;
  totalScore: number;
  answers: AttemptAnswer[];
  createdAt: string;
  updatedAt: string;
}

export interface AttemptAnswer {
  id: string;       // UUID v7
  attemptId: string; // UUID v7 → TryoutAttempt.id
  questionIndex: number;
  selectedOption: number;
  raguRagu: boolean;
}

/**
 * Wire payload for flag-only updates.
 * Map of questionIndex → flagged.
 * Absent keys are treated as no-op on the server (do not clear implicitly).
 */
export type RaguRaguFlags = Record<number, boolean>;

// ── Logo Config (key-value entries) ───────────
export interface LogoConfigEntry {
  id: number;
  configKey: string;
  configValue: string | null;
  createdAt: string;
  updatedAt: string;
}

// Assembled config object (built from entries)
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
  ctaSubtitle: string;
  stat1Val: string;
  stat1Label: string;
  stat2Val: string;
  stat2Label: string;
  stat3Val: string;
  stat3Label: string;
  promoBannerText: string;
  contactWA: string;
  contactEmail: string;
  testimonial1Name: string;
  testimonial1Role: string;
  testimonial1Text: string;
  testimonial2Name: string;
  testimonial2Role: string;
  testimonial2Text: string;
  testimonial3Name: string;
  testimonial3Role: string;
  testimonial3Text: string;
  themePrimary: string;
  themeSecondary: string;
  themeDark: string;
}

// ── Review Mode (for tryout review UI) ────────
export interface ReviewMode {
  questions: Question[];
  answers: Record<number, number>;
  name: string;
}

// ── Package Popularity (admin/staff dashboard) ──
export interface PackagePopularityItem {
  packageId: number;
  packageName: string;
  purchaseCount: number;
  purchaseShare: number; // whole percent, 0-100
}

// ── Scoring ───────────────────────────────────
export interface ScoringResult {
  TWK: number;
  TIU: number;
  TKP: number;
  total: number;
}
