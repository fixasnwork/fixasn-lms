import { NextRequest, NextResponse } from 'next/server';
import { requireActiveSession } from '@/lib/routeAuth';
import { getManualPurchase } from '@/lib/purchaseHistory';

export async function GET(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;
  const { paymentId } = await params;
  try {
    const result = await getManualPurchase(auth.session.user.email, paymentId);
    if (!result) return NextResponse.json({ error: 'Pembelian tidak ditemukan.' }, { status: 404 });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Detail pembelian belum dapat dimuat.' }, { status: 500 }); }
}
