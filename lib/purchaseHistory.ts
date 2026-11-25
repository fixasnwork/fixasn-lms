import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hasPaymentAccess } from '@/lib/packageAccess';
import type { PurchaseHistoryItem, PurchaseHistoryPage } from '@/lib/purchaseHistoryTypes';

const packageSelect = { name: true, includesVideoPembelajaran: true, tryoutCount: true, _count: { select: { packageTryouts: true } } } as const;
const paymentSelect = {
  id: true, packageId: true, status: true, createdAt: true, verifiedAt: true,
  accessExpiresAt: true, accessDurationMonths: true, deletedAt: true, blockReason: true,
  package: { select: packageSelect },
} satisfies Prisma.PaymentSelect;
const orderSelect = {
  id: true, orderId: true, packageId: true, packageName: true, status: true, createdAt: true,
  paymentMethod: true, amount: true, adminFee: true, totalAmount: true,
  accessDurationMonths: true, paidAt: true,
  package: { select: packageSelect }, payment: { select: paymentSelect },
} satisfies Prisma.PaymentOrderSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;
type OrderRow = Prisma.PaymentOrderGetPayload<{ select: typeof orderSelect }>;
interface HistoryCursor { manual: string | null; midtrans: string | null }
const PAGE_SIZE = 20;

export function decodeHistoryCursor(raw: string | null): HistoryCursor {
  if (!raw) return { manual: null, midtrans: null };
  try {
    if (raw.length > 500) throw new Error();
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!parsed || !['manual', 'midtrans'].every((key) => parsed[key] === null || typeof parsed[key] === 'string' && uuid.test(parsed[key]))) throw new Error();
    return { manual: parsed.manual, midtrans: parsed.midtrans };
  } catch { throw new Error('Cursor riwayat tidak valid.'); }
}

function accessStatus(payment: PaymentRow | null): PurchaseHistoryItem['accessStatus'] {
  if (!payment || payment.deletedAt) return 'inactive';
  if (payment.status === 'blocked') return 'blocked';
  if (hasPaymentAccess(payment)) return 'active';
  if (payment.status === 'verified' && payment.accessExpiresAt) return 'expired';
  return 'inactive';
}

function openHref(pkg: PaymentRow['package']) {
  return pkg.includesVideoPembelajaran && !Math.max(pkg.tryoutCount, pkg._count.packageTryouts) ? '/video' : '/tryout';
}

export function mapManualPurchase(payment: PaymentRow): PurchaseHistoryItem {
  return {
    id: payment.id, source: 'manual', reference: payment.id, packageId: payment.packageId,
    packageName: payment.package.name, createdAt: payment.createdAt.toISOString(), status: payment.status,
    paymentMethod: 'manual', amount: null, adminFee: null, totalAmount: null,
    accessDurationMonths: payment.accessDurationMonths, paidAt: payment.verifiedAt?.toISOString() ?? null,
    accessExpiresAt: payment.accessExpiresAt?.toISOString() ?? null, accessStatus: accessStatus(payment),
    openHref: openHref(payment.package), detailHref: `/purchases/manual/${payment.id}`, blockReason: payment.blockReason,
  };
}

export function mapGatewayPurchase(order: OrderRow): PurchaseHistoryItem {
  return {
    id: order.id, source: 'midtrans', reference: order.orderId, packageId: order.packageId,
    packageName: order.packageName, createdAt: order.createdAt.toISOString(), status: order.status,
    paymentMethod: order.paymentMethod, amount: order.amount, adminFee: order.adminFee, totalAmount: order.totalAmount,
    accessDurationMonths: order.accessDurationMonths, paidAt: order.paidAt?.toISOString() ?? null,
    accessExpiresAt: order.payment?.accessExpiresAt?.toISOString() ?? null, accessStatus: accessStatus(order.payment),
    openHref: openHref(order.package), detailHref: `/payment/${order.orderId}`, blockReason: order.payment?.blockReason ?? null,
  };
}

export async function getPurchaseHistory(userId: string, cursor: HistoryCursor): Promise<PurchaseHistoryPage> {
  // Each source has its own stable cursor. Fetch bounded pages, then merge;
  // successful gateway payments are excluded from the manual source in SQL.
  const [manual, midtrans] = await Promise.all([
    prisma.payment.findMany({
      where: { userId, deletedAt: null, gatewayOrder: { is: null } }, select: paymentSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: PAGE_SIZE + 1,
      ...(cursor.manual ? { cursor: { id: cursor.manual }, skip: 1 } : {}),
    }),
    prisma.paymentOrder.findMany({
      where: { userId }, select: orderSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: PAGE_SIZE + 1,
      ...(cursor.midtrans ? { cursor: { id: cursor.midtrans }, skip: 1 } : {}),
    }),
  ]);
  const purchases: PurchaseHistoryItem[] = [];
  const next = { ...cursor };
  let m = 0;
  let g = 0;
  while (purchases.length < PAGE_SIZE && (m < manual.length || g < midtrans.length)) {
    if (g < midtrans.length && (m >= manual.length || midtrans[g].createdAt >= manual[m].createdAt)) {
      const row = midtrans[g++];
      purchases.push(mapGatewayPurchase(row));
      next.midtrans = row.id;
    } else {
      const row = manual[m++];
      purchases.push(mapManualPurchase(row));
      next.manual = row.id;
    }
  }
  return { purchases, nextCursor: m < manual.length || g < midtrans.length ? Buffer.from(JSON.stringify(next)).toString('base64url') : null };
}

export async function getManualPurchase(userId: string, id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const payment = await prisma.payment.findFirst({
    where: { id, userId, deletedAt: null, gatewayOrder: { is: null } },
    select: { ...paymentSelect, proofUrl: true },
  });
  return payment ? { purchase: mapManualPurchase(payment), proofUrl: payment.proofUrl } : null;
}
