import { NextRequest, NextResponse } from 'next/server';
import { requireActiveSession } from '@/lib/routeAuth';
import { decodeHistoryCursor, getPurchaseHistory } from '@/lib/purchaseHistory';

export async function GET(request: NextRequest) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;
  let cursor;
  try { cursor = decodeHistoryCursor(request.nextUrl.searchParams.get('cursor')); }
  catch { return NextResponse.json({ error: 'Cursor riwayat tidak valid.' }, { status: 400 }); }
  try {
    return NextResponse.json(await getPurchaseHistory(auth.session.user.email, cursor), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Riwayat pembelian belum dapat dimuat.' }, { status: 500 });
  }
}
