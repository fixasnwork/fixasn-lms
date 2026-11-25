import { ManualPurchaseDetail } from '@/components/payments/ManualPurchaseDetail';

export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  return <ManualPurchaseDetail paymentId={paymentId} />;
}
