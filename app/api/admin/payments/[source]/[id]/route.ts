import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { applyAdminPaymentAction, getAdminPaymentDetail } from '@/lib/adminPayments';
import { PaymentError } from '@/lib/midtrans';
import type { AdminPaymentAction } from '@/lib/adminPaymentTypes';

type Context = { params: Promise<{ source: string; id: string }> };
function errorResponse(error: unknown) {
  return NextResponse.json({ error: error instanceof PaymentError ? error.message : error instanceof SyntaxError ? 'Permintaan tidak valid.' : 'Pembayaran belum dapat diproses.' }, { status: error instanceof PaymentError ? error.status : error instanceof SyntaxError ? 400 : 500 });
}
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const { source, id } = await params;
    return NextResponse.json(await getAdminPaymentDetail(source, id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const { source, id } = await params;
    const body = await request.json();
    await applyAdminPaymentAction(source, id, body?.action as AdminPaymentAction, body?.reason);
    return NextResponse.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
