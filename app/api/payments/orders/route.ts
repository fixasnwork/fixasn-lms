import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSession } from '@/lib/routeAuth';
import { getEmailFromSessionUser } from '@/lib/deviceSession';
import { mapPaymentOrder } from '@/lib/paymentOrders';

export async function GET(request: NextRequest) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;
  const email = getEmailFromSessionUser(auth.session.user);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orders = await prisma.paymentOrder.findMany({ where: { userId: email }, orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ orders: orders.map(mapPaymentOrder) }, { headers: { 'Cache-Control': 'no-store' } });
}
