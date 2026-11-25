export interface PaymentOrderView {
  orderId: string;
  userId: string;
  packageId: number;
  packageName: string;
  amount: number;
  adminFee: number;
  totalAmount: number;
  accessDurationMonths: number;
  paymentMethod: string;
  status: string;
  snapRedirectUrl: string | null;
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export const OPEN_ORDER_STATUSES = ['creating', 'pending'];
export const ORDER_STATUS_LABELS: Record<string, string> = {
  creating: 'Menyiapkan pembayaran', pending: 'Menunggu pembayaran', paid: 'Pembayaran berhasil',
  denied: 'Pembayaran ditolak', expired: 'Pembayaran kedaluwarsa', cancelled: 'Pembayaran dibatalkan',
  failed: 'Pembayaran gagal', refunded: 'Dana dikembalikan', partially_refunded: 'Dana dikembalikan sebagian',
};
