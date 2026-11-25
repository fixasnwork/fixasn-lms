import { PaymentOrderStatus } from '@/components/payments/PaymentOrderStatus';

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <PaymentOrderStatus orderId={orderId} />;
}
