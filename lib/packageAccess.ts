export const ACCESS_DURATION_OPTIONS = [
  { months: 1, label: '1 bulan' },
  { months: 3, label: '3 bulan' },
  { months: 6, label: '6 bulan' },
  { months: 12, label: '1 tahun' },
] as const;

export function isAccessDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function accessDurationLabel(months: number = 1): string {
  return ACCESS_DURATION_OPTIONS.find((option) => option.months === months)?.label ?? `${months} bulan`;
}

/** Calendar months in WITA; clamp Jan 31 + 1 month to the last day of February. */
export function accessExpiry(start: Date, months: number): Date {
  const offset = 8 * 60 * 60 * 1000;
  const local = new Date(start.getTime() + offset);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  return new Date(local.getTime() - offset);
}

export function hasPaymentAccess(payment: {
  status: string;
  accessExpiresAt?: Date | string | null;
}, now = new Date()): boolean {
  return payment.status === 'verified' &&
    (payment.accessExpiresAt == null || new Date(payment.accessExpiresAt).getTime() > now.getTime());
}

/** Null expiry preserves verified purchases made before duration tracking existed. */
export function activePaymentWhere(now = new Date()) {
  return {
    status: 'verified',
    deletedAt: null,
    OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }],
  };
}
