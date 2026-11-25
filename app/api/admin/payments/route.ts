import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminPayments, parseAdminPaymentFilters } from '@/lib/adminPayments';
import { PaymentError } from '@/lib/midtrans';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const data = await getAdminPayments(parseAdminPaymentFilters(request.nextUrl.searchParams));
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : 'Pembayaran gagal dimuat.' }, { status: error instanceof PaymentError ? error.status : 500 });
  }
}
