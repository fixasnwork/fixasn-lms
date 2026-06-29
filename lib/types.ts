// ─────────────────────────────────────────────
// TYPE DEFINITIONS — Schema v2 (camelCase IDs)
// ID convention:
//   Master/reference tables → number
//   Transactional tables    → string (UUID v7)
//   Junction tables         → number
// ─────────────────────────────────────────────

// ── Categories ────────────────────────────────
export type QuestionCategory = "TWK" | "TIU" | "TKP";
export type VideoCategory = "TWK" | "TIU" | "TKP";

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
  /**
   * When true, an active (non-rejected, non-expired) UserPurchase on this
   * package grants the user access to the /video catalog. See
   * openspec/changes/video-pembelajaran/specs/video-pembelajaran/spec.md.
   */
  includesVideoPembelajaran: boolean;
  tryoutCount?: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Videos (Video Pembelajaran) ───────────────

/**
 * Full Video shape as seen by the admin API. Includes `pdfUrl`, which
 * is the storage path of the original uploaded PDF and is private —
 * never sent to non-admin callers.
 */
export interface Video {
  id: number;
  title: string;
  description: string | null;
  youtubeId: string;
  category: VideoCategory;
  durationSec: number | null;
  sortOrder: number;
  isPublished: boolean;
  /** Storage path of the original uploaded PDF (private; admin-only). */
  pdfUrl: string | null;
  /** Count of pages successfully rasterized to PNG at upload time. */
  pdfPageCount: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Video shape as seen by user-facing endpoints. Deliberately omits
 * `pdfUrl` so the original PDF's storage path is never returned to a
 * non-admin caller. The `pdfPageCount` is kept because the user page
 * needs it to render the "📄 Modul" button.
 */
export type PublicVideo = Omit<Video, "pdfUrl">;

/**
 * Per-user playback state for a single video. `null` when no
 * `VideoProgress` row exists for the (userId, videoId) pair.
 */
export interface VideoProgressSummary {
  lastSecond: number;
  watchedSeconds: number;
  completedAt: string | null;
}

/** User-facing video with the requesting user's progress attached. */
export interface VideoWithProgress extends PublicVideo {
  /** Per-user playback state. `null` for admins and for users with no progress row. */
  progress: VideoProgressSummary | null;
}

/** Admin-facing video with the requesting user's progress attached. */
export interface AdminVideoWithProgress extends Video {
  /** Per-user playback state. `null` for admins and for users with no progress row. */
  progress: VideoProgressSummary | null;
}

export interface VideoListResponse {
  /**
   * For non-admin callers every entry is a `VideoWithProgress` (no
   * `pdfUrl`). For admin callers every entry is an
   * `AdminVideoWithProgress` (includes `pdfUrl`). The union is the
   * smallest type that satisfies both branches without forcing the
   * admin response to leak `pdfUrl` to the user side or vice versa.
   */
  videos: (VideoWithProgress | AdminVideoWithProgress)[];
  /**
   * `true` if the caller should see the catalog. For `admin` role this is
   * always true. For `user` role it is true iff a non-rejected, non-expired
   * `UserPurchase` exists against a package with
   * `Package.includesVideoPembelajaran = true`.
   */
  hasAccess: boolean;
  /**
   * Why access was denied. `null` when `hasAccess` is true. Every deny
   * scenario in the spec (no purchase, rejected purchase, expired purchase)
   * collapses to `no_video_package` because the contract is the same:
   * the caller has no qualifying purchase.
   */
  accessReason: "no_video_package" | null;
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
  // Matches the DB column (free-form String @db.Text) + the runtime
  // deny list at app/api/videos/route.ts:32 which excludes rejected &
  // expired in addition to the three primary states.
  status: "pending" | "verified" | "blocked" | "rejected" | "expired";
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
  finishedAt: string | null;
  /**
   * Remaining timer seconds at the last flush.
   * `null` = fresh attempt or legacy row with no saved timer (treat as full duration).
   * `number` = the engine should seed its countdown from this value on resume.
   */
  timeLeftSeconds?: number | null;
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

// ── Dashboard Summary (per-user aggregates) ────
/**
 * Per-category accumulated scores for the user, computed from
 * `TryoutAttempt.twkScore/tiuScore/tkpScore` across finished attempts.
 */
export interface DashboardCategoryScores {
  twk: number;
  tiu: number;
  tkp: number;
}

/**
 * Aggregated snapshot returned by `GET /api/users/me/dashboard` and
 * consumed by the user dashboard client.
 *
 * - `remainingTryouts` = Σ(purchased package.tryoutCount) − count(DISTINCT finished tryoutId), floored at 0
 * - `completedTryouts` = count of TryoutAttempt rows with finishedAt IS NOT NULL
 * - `rank`            = all-time position (sum of max totalScore per tryoutId); null when the user has no attempts
 * - `totalScore`      = same sum rule as the rank, mirrors the leaderboard score
 * - `tryoutCount`     = count of distinct tryouts the user has at least one attempt for
 * - `categoryScores`  = sum of twk/tiu/tkp across finished attempts (NOT the leaderboard's max-per-tryout rule;
 *                       these are the running category totals the progress bar should display)
 */
export interface DashboardSummary {
  remainingTryouts: number;
  completedTryouts: number;
  rank: number | null;
  totalScore: number;
  tryoutCount: number;
  categoryScores: DashboardCategoryScores;
}
