import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Payment, Tryout, Package, BankAccount, LogoConfig } from '@/lib/types';

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
        attempt: { id: string; tryoutId: number; isNew: boolean };
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
    answers: Record<number, number>;
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

/* ── Packages ───────────────────────────────────────────────────── */
export function usePackages() {
  return useQuery<Package[]>({
    queryKey: ['packages'],
    queryFn: async () => {
      const res = await fetch('/api/packages');
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
export function useAttemptHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['attempt-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/tryout-attempts?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch attempt history');
      const data = await res.json();
      return data.attempts as Array<{
        id: string;
        tryoutId: number;
        twkScore: number;
        tiuScore: number;
        tkpScore: number;
        totalScore: number;
        createdAt: string;
      }>;
    },
    enabled: !!userId,
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
