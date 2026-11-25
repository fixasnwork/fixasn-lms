import { Badge } from '@/components/shadcn/badge';
import type { AdminPaymentRow } from '@/lib/adminPaymentTypes';

export function paymentStatusLabel(row: AdminPaymentRow) {
  if (row.status === 'pending') return row.source === 'manual' ? 'Menunggu verifikasi' : 'Menunggu pembayaran';
  return ({ creating: 'Menyiapkan pembayaran', paid: row.source === 'manual' ? 'Terverifikasi' : 'Berhasil', rejected: 'Ditolak', denied: 'Ditolak', expired: 'Kedaluwarsa', cancelled: 'Dibatalkan', failed: 'Gagal', refunded: 'Dana dikembalikan', partially_refunded: 'Pengembalian sebagian', blocked: 'Diblokir' } as Record<string, string>)[row.status] ?? row.status;
}
export function PaymentStatusBadge({ row }: { row: AdminPaymentRow }) {
  const color = ['pending', 'creating'].includes(row.status) ? 'bg-yellow-400 text-yellow-950' : ['paid', 'partially_refunded'].includes(row.status) ? 'bg-green-700 text-white' : 'bg-red-700 text-white';
  return <Badge className={`h-auto rounded-md px-2.5 py-1 font-semibold ${color}`}>{paymentStatusLabel(row)}</Badge>;
}
export function AccessStatusBadge({ row }: { row: AdminPaymentRow }) {
  const label = ({ active: 'Aktif', inactive: 'Belum aktif', expired: 'Berakhir', blocked: 'Diblokir' } as Record<string, string>)[row.accessStatus] ?? 'Belum aktif';
  return <Badge variant="secondary" className={`h-auto rounded-md px-2.5 py-1 ${row.accessStatus === 'active' ? 'bg-green-50 text-green-800' : row.accessStatus === 'blocked' ? 'bg-red-50 text-red-800' : ''}`}>{label}</Badge>;
}
