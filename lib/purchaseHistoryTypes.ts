export interface PurchaseHistoryItem {
  id: string;
  source: 'manual' | 'midtrans';
  reference: string;
  packageId: number;
  packageName: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  amount: number | null;
  adminFee: number | null;
  totalAmount: number | null;
  accessDurationMonths: number | null;
  paidAt: string | null;
  accessExpiresAt: string | null;
  accessStatus: 'active' | 'expired' | 'blocked' | 'inactive';
  openHref: string;
  detailHref: string;
  blockReason: string | null;
}

export interface PurchaseHistoryPage {
  purchases: PurchaseHistoryItem[];
  nextCursor: string | null;
}

export const MANUAL_PAYMENT_LABELS: Record<string, string> = {
  pending: 'Menunggu verifikasi admin', verified: 'Pembayaran diverifikasi',
  rejected: 'Pembayaran ditolak', expired: 'Pembayaran kedaluwarsa', blocked: 'Akses diblokir',
};
