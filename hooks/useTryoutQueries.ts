import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Payment, Tryout, Package, BankAccount, LogoConfig, Question } from '@/lib/types';

/* ── Tryouts ───────────────────────────────────────────────────── */
export function useTryouts() {
  return useQuery({
    queryKey: ['tryouts'],
    queryFn: async () => {
      const res = await fetch('/api/tryouts');
      if (!res.ok) throw new Error('Failed to fetch tryouts');
      const data = await res.json();
      return data.tryouts as Record<string, import('@/lib/types').Tryout[]>;
    },
  });
}

export function useTryoutsWithQuestions() {
  return useQuery({
    queryKey: ['tryouts', 'questions'],
    queryFn: async () => {
      const res = await fetch('/api/tryouts?include=questions');
      if (!res.ok) throw new Error('Failed to fetch tryouts');
      const data = await res.json();
      return data.tryouts as Record<string, Tryout[]>;
    },
  });
}

export function useTryoutQuestions(tryoutId: number | null) {
  return useQuery<Question[]>({
    queryKey: ['tryout-questions', tryoutId],
    queryFn: async () => {
      const res = await fetch(`/api/tryouts/${tryoutId}/questions`);
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data = await res.json();
      return data.questions as Question[];
    },
    enabled: !!tryoutId,
    staleTime: 5 * 60_000,
  });
}

/* ── Payments ──────────────────────────────────────────────────── */
export function useUserPayments(userId: string | undefined) {
  return useQuery<Payment[]>({
    queryKey: ['payments', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/payments?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      return data.payments as Payment[];
    },
    enabled: !!userId,
  });
}

/* ── Create Payment (mutation) ─────────────────────────────────── */
export interface CreatePaymentInput {
  id?: string;
  packageId: number;
  proofUrl: string;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Gagal membuat pembayaran');
      return res.json() as Promise<{ success: boolean; payment: Payment }>;
    },
    onSuccess: () => {
      // Invalidate payments query so any component using it refetches
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      // video-pembelajaran: a new payment may have just granted video access
      // (Paket Video Belajar). Invalidate the user video catalog so the
      // /video page flips from locked to unlocked on the next visit.
      queryClient.invalidateQueries({ queryKey: ['user-videos'] });
    },
  });
}

/* ── Upload Proof (mutation) ──────────────────────────────────── */
export interface UploadResult {
  success: boolean;
  url: string;
  path: string;
}

export function useUploadProof() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload gagal');
      return data as UploadResult;
    },
  });
}

/* ── Create or Resume Attempt (mutation) ───────────────────────── */
export function useCreateOrResumeAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tryoutId: number) => {
      const res = await fetch('/api/tryout-attempts/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tryoutId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memulai tryout');
      }
      return res.json() as Promise<{
        success: boolean;
        attempt: {
          id: string;
          tryoutId: number;
          isNew: boolean;
          /**
           * Remaining timer seconds at the last flush, or null for fresh /
           * legacy attempts. The runner seeds its countdown from this on
           * resume. Surfaced from `/api/tryout-attempts/resume`.
           */
          timeLeftSeconds: number | null;
        };
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attempt-history'] });
    },
  });
}

/* ── Fetch Single Attempt (with tryout + questions) ────────────── */
export interface AttemptWithTryout {
  attempt: {
    id: string;
    userId: string;
    tryoutId: number;
    twkScore: number;
    tiuScore: number;
    tkpScore: number;
    totalScore: number;
    finishedAt: string | null;
    /**
     * Remaining timer seconds at the last flush, or null for fresh / legacy
     * attempts. The engine seeds its countdown from this on resume.
     */
    timeLeftSeconds?: number | null;
    answers: Record<number, number>;
    raguRagu: Record<number, boolean>;
    createdAt: string;
    updatedAt: string;
  };
  tryout: Tryout;
}

export function useAttempt(attemptId: string | undefined) {
  return useQuery<AttemptWithTryout>({
    queryKey: ['attempt', attemptId],
    queryFn: async () => {
      if (!attemptId) throw new Error('attemptId is required');
      const res = await fetch(`/api/tryout-attempts/${attemptId}`);
      if (!res.ok) throw new Error('Failed to fetch attempt');
      return res.json() as Promise<AttemptWithTryout>;
    },
    enabled: !!attemptId,
    staleTime: 0, // always refetch — answers may have changed
  });
}

/* ── Update Attempt Scores (mutation) ──────────────────────────── */
export function useUpdateAttempt(attemptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      twkScore: number;
      tiuScore: number;
      tkpScore: number;
      totalScore: number;
      answers: Record<number, number>;
    }) => {
      const res = await fetch(`/api/tryout-attempts/${attemptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Gagal menyimpan hasil tryout');
      return res.json() as Promise<{ success: boolean; attempt: { id: string; totalScore: number } }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] });
      queryClient.invalidateQueries({ queryKey: ['attempt-history'] });
    },
  });
}

/* ── Update Attempt Ragu-ragu Flags (debounced mutation) ───────── */
// Module-level debouncer: one in-flight + one queued update per attemptId.
// Coalesces rapid toggles (200-300ms) into a single PUT with the latest state.
type FlagUpdate = Record<number, boolean>;

const flagDebouncers = new Map<
  string,
  { timer: ReturnType<typeof setTimeout> | null; latest: FlagUpdate }
>();

function flushFlags(attemptId: string): void {
  const entry = flagDebouncers.get(attemptId);
  if (!entry || !entry.timer) return;
  clearTimeout(entry.timer);
  flagDebouncers.delete(attemptId);
  const payload = entry.latest;
  if (Object.keys(payload).length === 0) return;
  // Fire-and-forget; consumer reads via useAttempt refetch / invalidation.
  fetch(`/api/tryout-attempts/${attemptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raguRaguFlags: payload }),
  }).catch(() => {
    // Silent fail — UI shows the optimistic state; next refetch will reconcile.
  });
}

export function queueFlagUpdate(attemptId: string, update: FlagUpdate, delayMs = 250): void {
  const existing = flagDebouncers.get(attemptId);
  const next: FlagUpdate = { ...(existing?.latest ?? {}), ...update };
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => flushFlags(attemptId), delayMs);
  flagDebouncers.set(attemptId, { timer, latest: next });
}

/* ── Update Attempt Answers (autosave mutation) ────────────────── */
// Fire-and-forget: no optimistic cache update, no invalidation on settle.
// The server is source of truth on next mount/focus/visibility re-fetch.
export interface UpdateAttemptAnswersInput {
  answers: Record<number, number>;
  /**
   * Remaining timer seconds at flush time. Carried on every PUT so the
   * server can persist the countdown and the next mount can resume from it.
   * Clamped to `[0, durationMin*60]` server-side; null/undefined is allowed
   * for score-only writes that should not touch the timer column.
   */
  timeLeftSeconds?: number | null;
}

export function useUpdateAttemptAnswers(attemptId: string) {
  return useMutation({
    mutationFn: async (input: UpdateAttemptAnswersInput) => {
      const res = await fetch(`/api/tryout-attempts/${attemptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Gagal menyimpan jawaban');
      return res.json() as Promise<{ success: boolean; attempt: { id: string } }>;
    },
  });
}

export function useUpdateAttemptFlags(attemptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: FlagUpdate) => {
      // Immediate (non-debounced) write — used when leaving the page or final save.
      const res = await fetch(`/api/tryout-attempts/${attemptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raguRaguFlags: update }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan tanda Ragu-ragu');
      return res.json() as Promise<{ success: boolean }>;
    },
    onMutate: async (update) => {
      // Optimistic merge into cached useAttempt data so the palette/UI updates instantly.
      await queryClient.cancelQueries({ queryKey: ['attempt', attemptId] });
      const prev = queryClient.getQueryData<AttemptWithTryout>(['attempt', attemptId]);
      if (prev) {
        queryClient.setQueryData<AttemptWithTryout>(['attempt', attemptId], {
          ...prev,
          attempt: {
            ...prev.attempt,
            raguRagu: { ...(prev.attempt.raguRagu ?? {}), ...update },
          },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['attempt', attemptId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] });
    },
  });
}

/* ── Packages ───────────────────────────────────────────────────── */
export function usePackages() {
  return useQuery<Package[]>({
    queryKey: ['packages'],
    queryFn: async () => {
      const res = await fetch('/api/packages', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch packages');
      const data = await res.json();
      return data.packages as Package[];
    },
    staleTime: 5 * 60_000,
  });
}

/* ── Bank Accounts ─────────────────────────────────────────────── */
export function useBanks() {
  return useQuery<BankAccount[]>({
    queryKey: ['banks'],
    queryFn: async () => {
      const res = await fetch('/api/banks');
      if (!res.ok) throw new Error('Failed to fetch banks');
      const data = await res.json();
      return data.banks as BankAccount[];
    },
    staleTime: 5 * 60_000,
  });
}

/* ── Logo Config ───────────────────────────────────────────────── */
const DEFAULT_LOGO_CONFIG: LogoConfig = {
  namaApp: 'FIX ASN',
  tagline: 'Sukses Lolos CPNS',
  warnaNama: '#1B3A6B',
  warnaTag: '#9A7000',
  warnaKiri: '#F5C518',
  warnaKanan: '#1B3A6B',
  warnaInner: '#1B3A6B',
  customImg: null,
  heroImg: '',
  heroCaption: '',
  heroSubCaption: '',
  heroTitle1: '',
  heroTitle2: '',
  heroTitle3: '',
  heroDesc: '',
  skdTitle: '',
  skdSubtitle: '',
  paketTitle: '',
  paketSubtitle: '',
  ctaTitle: '',
  ctaSubtitle: '',
  stat1Val: '',
  stat1Label: '',
  stat2Val: '',
  stat2Label: '',
  stat3Val: '',
  stat3Label: '',
  promoBannerText: '',
  contactWA: '',
  contactEmail: '',
  testimonial1Name: '',
  testimonial1Role: '',
  testimonial1Text: '',
  testimonial2Name: '',
  testimonial2Role: '',
  testimonial2Text: '',
  testimonial3Name: '',
  testimonial3Role: '',
  testimonial3Text: '',
  themePrimary: '#1B3A6B',
  themeSecondary: '#2563EB',
  themeDark: '#0C1E45',
};

export function useLogoConfig() {
  return useQuery<LogoConfig>({
    queryKey: ['logo-config'],
    queryFn: async () => {
      const res = await fetch('/api/logo-config');
      if (!res.ok) throw new Error('Failed to fetch logo config');
      const data = await res.json();
      return { ...DEFAULT_LOGO_CONFIG, ...data.config } as LogoConfig;
    },
    staleTime: 10 * 60_000,
  });
}

/* ── Attempt History (for list page) ───────────────────────────── */
export interface AttemptHistoryEntry {
  id: string;
  tryoutId: number;
  twkScore: number;
  tiuScore: number;
  tkpScore: number;
  totalScore: number;
  finishedAt: string | null;
  /**
   * Persisted answers keyed by questionIndex. Returned by the server
   * (`/api/tryout-attempts` includes `answers: true`) for in-progress
   * resume UX on the list page. May be undefined for legacy history rows.
   */
  answers?: Record<number, number>;
  /** Remaining timer seconds at last flush; null for fresh/legacy attempts. */
  timeLeftSeconds?: number | null;
  createdAt: string;
}

export function useAttemptHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['attempt-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/tryout-attempts?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch attempt history');
      const data = await res.json();
      return data.attempts as AttemptHistoryEntry[];
    },
    enabled: !!userId,
  });
}

/* ── Package Mutations ──────────────────────────────────────── */
export function useCreatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; price?: number; isTrial?: boolean; includesVideoPembelajaran?: boolean; startDate?: string; endDate?: string }) => {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create package');
      return json as { success: boolean; package: Package };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; name?: string; description?: string; price?: number; isTrial?: boolean; includesVideoPembelajaran?: boolean; startDate?: string; endDate?: string }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update package');
      return json as { success: boolean; package: Package };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: number) => {
      const res = await fetch(`/api/packages/${packageId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete package');
      return json as { success: boolean };
    },
    onSuccess: (_data, packageId) => {
      queryClient.setQueryData<Package[]>(['packages'], (current = []) =>
        current.filter((pkg) => pkg.id !== packageId)
      );
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['tryouts'] });
    },
  });
}

/* ── Tryout Mutations ─────────────────────────────────────────── */
export function useCreateTryout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; isTrial?: boolean; sortOrder?: number; durationMin?: number; startDate?: string; endDate?: string }) => {
      const res = await fetch('/api/tryouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create tryout');
      return json as { success: boolean; tryout: Tryout };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tryouts'] });
      queryClient.invalidateQueries({ queryKey: ['all-tryouts'] });
    },
  });
}

export function useUpdateTryout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; name?: string; isTrial?: boolean; sortOrder?: number; durationMin?: number; startDate?: string; endDate?: string }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/tryouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update tryout');
      return json as { success: boolean; tryout: Tryout };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tryouts'] });
      queryClient.invalidateQueries({ queryKey: ['all-tryouts'] });
    },
  });
}

export function useDeleteTryout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tryoutId: number) => {
      const res = await fetch(`/api/tryouts/${tryoutId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete tryout');
      return json as { success: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tryouts'] });
      queryClient.invalidateQueries({ queryKey: ['all-tryouts'] });
    },
  });
}

/* ── Package-Tryout Assignments ───────────────────────────────── */
export function usePackageTryouts(packageId: number | null) {
  return useQuery<Tryout[]>({
    queryKey: ['package-tryouts', packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const res = await fetch(`/api/packages/${packageId}/tryouts`);
      if (!res.ok) throw new Error('Failed to fetch package tryouts');
      const data = await res.json();
      return data.tryouts as Tryout[];
    },
    enabled: !!packageId,
    staleTime: 5 * 60_000,
  });
}

export function useSetPackageTryouts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { packageId: number; tryoutIds: number[] }) => {
      const res = await fetch(`/api/packages/${data.packageId}/tryouts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tryoutIds: data.tryoutIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update package tryouts');
      return json as { success: boolean; tryouts: Tryout[]; tryoutCount: number };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['package-tryouts', variables.packageId] });
      queryClient.invalidateQueries({ queryKey: ['tryouts'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

/* ── All tryouts (flat list for assignment UI) ────────────────── */
export function useAllTryouts() {
  return useQuery<Tryout[]>({
    queryKey: ['all-tryouts'],
    queryFn: async () => {
      const res = await fetch('/api/tryouts?scope=all');
      if (!res.ok) throw new Error('Failed to fetch all tryouts');
      const data = await res.json();
      if (Array.isArray(data.tryouts)) {
        return (data.tryouts as Tryout[]).sort((a, b) => a.sortOrder - b.sortOrder);
      }
      const grouped = data.tryouts as Record<string, Tryout[]>;
      const seen = new Set<number>();
      const result: Tryout[] = [];
      for (const tryouts of Object.values(grouped)) {
        for (const t of tryouts) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            result.push(t);
          }
        }
      }
      return result.sort((a, b) => a.sortOrder - b.sortOrder);
    },
    staleTime: 5 * 60_000,
  });
}

/* ── Admin Bank Mutations ─────────────────────────────────────── */
export function useAdminBanks() {
  return useQuery<BankAccount[]>({
    queryKey: ['banks', 'admin'],
    queryFn: async () => {
      const res = await fetch('/api/banks?scope=admin');
      if (!res.ok) throw new Error('Failed to fetch admin banks');
      const data = await res.json();
      return data.banks as BankAccount[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bankName: string; accountNumber: string; accountHolder: string; isActive?: boolean }) => {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create bank account');
      return json as { success: boolean; bank: BankAccount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['banks', 'admin'] });
    },
  });
}

export function useUpdateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; bankName?: string; accountNumber?: string; accountHolder?: string; isActive?: boolean }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/banks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update bank account');
      return json as { success: boolean; bank: BankAccount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['banks', 'admin'] });
    },
  });
}

export function useDeleteBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bankId: number) => {
      const res = await fetch(`/api/banks/${bankId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete bank account');
      return json as { success: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['banks', 'admin'] });
    },
  });
}

/* ── Admin: All Payments ──────────────────────────────────────── */
export function useAdminPayments() {
  return useQuery<Payment[]>({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const res = await fetch('/api/payments');
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      return data.payments as Payment[];
    },
    staleTime: 30_000,
  });
}
