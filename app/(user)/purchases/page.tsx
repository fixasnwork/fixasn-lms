import type { Metadata } from 'next';
import { PurchaseHistory } from '@/components/payments/PurchaseHistory';

export const metadata: Metadata = { title: 'Riwayat Pembelian | FIX ASN' };

export default function Page() {
  return <PurchaseHistory />;
}
