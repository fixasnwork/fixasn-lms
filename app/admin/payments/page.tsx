import type { Metadata } from 'next';
import { PaymentsTable } from '@/components/admin/payments/PaymentsTable';

export const metadata: Metadata = { title: 'Pembayaran | FIX ASN' };

export default function PaymentsPage() {
  return <PaymentsTable />;
}
