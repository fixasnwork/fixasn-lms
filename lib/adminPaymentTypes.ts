export const PAYMENT_SOURCE_OPTIONS = [
  { value: 'all', label: 'Semua sumber' }, { value: 'manual', label: 'Manual' }, { value: 'midtrans', label: 'Midtrans' },
];
export const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Semua status' }, { value: 'pending', label: 'Menunggu' },
  { value: 'paid', label: 'Berhasil / Terverifikasi' }, { value: 'rejected', label: 'Ditolak' },
  { value: 'expired', label: 'Kedaluwarsa' }, { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'failed', label: 'Gagal' }, { value: 'refunded', label: 'Dana dikembalikan' },
  { value: 'partially_refunded', label: 'Pengembalian sebagian' }, { value: 'blocked', label: 'Diblokir' },
];
export const PAYMENT_ACCESS_OPTIONS = [
  { value: 'all', label: 'Semua akses' }, { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Belum aktif' }, { value: 'expired', label: 'Berakhir' }, { value: 'blocked', label: 'Diblokir' },
];
export interface AdminPaymentFilters { search: string; source: string; status: string; access: string; page: number }
export interface AdminPaymentRow {
  id: string; source: 'manual' | 'midtrans'; reference: string; userId: string; userName: string;
  packageId: number; packageName: string; paymentMethod: string; status: string;
  amount: number | null; adminFee: number | null; totalAmount: number | null;
  paymentId: string | null; accessPaymentStatus: string | null; accessStatus: string;
  accessDurationMonths: number | null; accessExpiresAt: string | null; blockReason: string | null;
  createdAt: string; paidAt: string | null; transactionId: string | null;
  userIsBlocked: boolean; userBlockedReason: string | null;
}
export interface AdminPaymentSummary { total: number; pendingManual: number; paid: number; blocked: number }
export interface AdminPaymentsPage { payments: AdminPaymentRow[]; total: number; page: number; pageSize: number; summary: AdminPaymentSummary }
export type AdminPaymentAction = 'verify' | 'reject' | 'block' | 'restore' | 'sync' | 'ban' | 'unban';

export function availablePaymentActions(row: AdminPaymentRow): AdminPaymentAction[] {
  const actions: AdminPaymentAction[] = [];
  if (row.source === 'midtrans') actions.push('sync');
  if (row.source === 'manual' && row.status === 'pending') {
    if (!row.userIsBlocked) actions.push('verify');
    actions.push('reject');
  }
  if (row.paymentId && row.accessPaymentStatus === 'verified') actions.push('block');
  if (row.paymentId && row.accessPaymentStatus === 'blocked' &&
    (row.source === 'manual' || ['paid', 'partially_refunded'].includes(row.status))) actions.push('restore');
  actions.push(row.userIsBlocked ? 'unban' : 'ban');
  return actions;
}
