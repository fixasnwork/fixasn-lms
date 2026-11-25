import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { activatePayment } from '@/lib/paymentActivation';
import { PaymentError } from '@/lib/midtrans';
import { syncPaymentOrder } from '@/lib/paymentOrders';
import { PAYMENT_ACCESS_OPTIONS, PAYMENT_SOURCE_OPTIONS, PAYMENT_STATUS_OPTIONS, type AdminPaymentFilters, type AdminPaymentRow, type AdminPaymentAction, type AdminPaymentSummary } from '@/lib/adminPaymentTypes';

const PAGE_SIZE = 20;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAdminPaymentFilters(params: URLSearchParams): AdminPaymentFilters {
  const filters = { search: (params.get('search') ?? '').trim(), source: params.get('source') ?? 'all', status: params.get('status') ?? 'all', access: params.get('access') ?? 'all', page: Number(params.get('page') ?? '1') };
  if (filters.search.length > 200 || !Number.isSafeInteger(filters.page) || filters.page < 1 || filters.page > 100000 ||
    !PAYMENT_SOURCE_OPTIONS.some((option) => option.value === filters.source) ||
    !PAYMENT_STATUS_OPTIONS.some((option) => option.value === filters.status) ||
    !PAYMENT_ACCESS_OPTIONS.some((option) => option.value === filters.access)) throw new PaymentError('Filter pembayaran tidak valid.');
  return filters;
}

// A single union excludes gateway-linked Payment rows, so each purchase appears
// once. No proof images are selected for the table. All filters are parameters.
const combinedPayments = Prisma.sql`
  SELECT p.id, 'manual'::text AS source, p.id::text AS reference, p."userId", p."packageId", k.name AS "packageName",
    'manual'::text AS "paymentMethod",
    CASE WHEN p.status = 'verified' OR (p.status = 'blocked' AND p."verifiedAt" IS NOT NULL) THEN 'paid' ELSE p.status END AS status,
    NULL::integer AS amount, NULL::integer AS "adminFee", NULL::integer AS "totalAmount",
    p.id AS "paymentId", p.status AS "accessPaymentStatus", p."accessDurationMonths", p."accessExpiresAt", p."blockReason",
    p."createdAt", p."verifiedAt" AS "paidAt", NULL::text AS "transactionId"
  FROM payments p JOIN packages k ON k.id = p."packageId"
  WHERE p."deletedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM "paymentOrders" o WHERE o."paymentId" = p.id)
  UNION ALL
  SELECT o.id, 'midtrans'::text AS source, o."orderId" AS reference, o."userId", o."packageId", o."packageName", o."paymentMethod",
    o.status, o.amount, o."adminFee", o."totalAmount", p.id AS "paymentId", p.status AS "accessPaymentStatus",
    o."accessDurationMonths", p."accessExpiresAt", p."blockReason", o."createdAt", o."paidAt", o."transactionId"
  FROM "paymentOrders" o LEFT JOIN payments p ON p.id = o."paymentId" AND p."deletedAt" IS NULL
`;

export async function getAdminPayments(filters: AdminPaymentFilters, identity?: { source: string; id: string }) {
  const predicates: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (filters.source !== 'all') predicates.push(Prisma.sql`source = ${filters.source}`);
  if (filters.status !== 'all') predicates.push(filters.status === 'pending'
    ? Prisma.sql`status IN ('pending', 'creating')`
    : filters.status === 'rejected' ? Prisma.sql`status IN ('rejected', 'denied')` : Prisma.sql`status = ${filters.status}`);
  if (filters.access !== 'all') predicates.push(Prisma.sql`"accessStatus" = ${filters.access}`);
  if (identity) predicates.push(Prisma.sql`source = ${identity.source} AND id = ${identity.id}::uuid`);
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`;
    predicates.push(Prisma.sql`(reference ILIKE ${pattern} OR "userId" ILIKE ${pattern} OR "userName" ILIKE ${pattern} OR "packageName" ILIKE ${pattern})`);
  }
  const [result] = await prisma.$queryRaw<{ total: bigint; payments: AdminPaymentRow[]; summary: AdminPaymentSummary }[]>(Prisma.sql`
    WITH combined AS (${combinedPayments}), enriched AS (
      SELECT c.*, u.name AS "userName", u."isBlocked" AS "userIsBlocked", u."blockedReason" AS "userBlockedReason",
        CASE WHEN u."isBlocked" OR c."accessPaymentStatus" = 'blocked' THEN 'blocked'
          WHEN c."accessPaymentStatus" = 'verified' AND (c."accessExpiresAt" IS NULL OR c."accessExpiresAt" > CURRENT_TIMESTAMP) THEN 'active'
          WHEN c."accessPaymentStatus" = 'verified' THEN 'expired' ELSE 'inactive' END AS "accessStatus"
      FROM combined c JOIN users u ON u.email = c."userId"
    ), filtered AS (SELECT * FROM enriched WHERE ${Prisma.join(predicates, ' AND ')}), page_rows AS (
      SELECT * FROM filtered ORDER BY "createdAt" DESC, source DESC, id DESC LIMIT ${PAGE_SIZE} OFFSET ${(filters.page - 1) * PAGE_SIZE}
    )
    SELECT (SELECT count(*) FROM filtered) AS total,
      (SELECT jsonb_build_object(
        'total', count(*),
        'pending', count(*) FILTER (WHERE status IN ('pending', 'creating')),
        'paid', count(*) FILTER (WHERE status IN ('paid', 'partially_refunded')),
        'blocked', count(*) FILTER (WHERE "accessStatus" = 'blocked')
      ) FROM filtered) AS summary,
      COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r."createdAt" DESC, r.source DESC, r.id DESC) FROM page_rows r), '[]'::jsonb) AS payments
  `);
  const total = Number(result?.total ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A verification or another admin's update can remove the last filtered row.
  if (total && filters.page > lastPage) return getAdminPayments({ ...filters, page: lastPage }, identity);
  return { payments: result?.payments ?? [], total, page: Math.min(filters.page, lastPage), pageSize: PAGE_SIZE, summary: result?.summary ?? { total, pending: 0, paid: 0, blocked: 0 } };
}

export async function getAdminPaymentDetail(source: string, id: string) {
  validateIdentity(source, id);
  const result = await getAdminPayments({ search: '', source: 'all', status: 'all', access: 'all', page: 1 }, { source, id });
  const payment = result.payments[0];
  if (!payment) throw new PaymentError('Pembayaran tidak ditemukan.', 404);
  const proof = source === 'manual' ? await prisma.payment.findUnique({ where: { id }, select: { proofUrl: true } }) : null;
  return { payment, proofUrl: proof?.proofUrl ?? null };
}

function validateIdentity(source: string, id: string) {
  if (!['manual', 'midtrans'].includes(source) || !uuidPattern.test(id)) throw new PaymentError('Pembayaran tidak ditemukan.', 404);
}

export async function applyAdminPaymentAction(source: string, id: string, action: AdminPaymentAction, reason: unknown) {
  validateIdentity(source, id);
  if (!['verify', 'reject', 'block', 'restore', 'sync', 'ban', 'unban'].includes(action)) throw new PaymentError('Aksi tidak valid.');
  const note = typeof reason === 'string' ? reason.trim() : '';
  if (note.length > 1000 || (['reject', 'block', 'ban'].includes(action) && !note)) throw new PaymentError('Isi alasan tindakan, maksimal 1000 karakter.');
  if (action === 'sync') {
    if (source !== 'midtrans') throw new PaymentError('Cek status gateway hanya tersedia untuk Midtrans.');
    const order = await prisma.paymentOrder.findUnique({ where: { id } });
    if (!order) throw new PaymentError('Pembayaran tidak ditemukan.', 404);
    await syncPaymentOrder(order, true);
    return;
  }
  await prisma.$transaction(async (tx) => {
    // Same lock order as notification handling: gateway order, then payment.
    let paymentId: string | null = id;
    let gatewayStatus: string | null = null;
    let userId: string;
    if (source === 'midtrans') {
      await tx.$queryRaw`SELECT id FROM "paymentOrders" WHERE id = ${id}::uuid FOR UPDATE`;
      const order = await tx.paymentOrder.findUnique({ where: { id } });
      if (!order) throw new PaymentError('Pembayaran tidak ditemukan.', 404);
      paymentId = order.paymentId; gatewayStatus = order.status; userId = order.userId;
    } else {
      const manual = await tx.payment.findFirst({ where: { id, deletedAt: null, gatewayOrder: { is: null } } });
      if (!manual) throw new PaymentError('Pembayaran tidak ditemukan.', 404);
      userId = manual.userId;
    }
    if (action === 'ban' || action === 'unban') {
      await tx.user.update({ where: { email: userId }, data: {
        isBlocked: action === 'ban', blockedAt: action === 'ban' ? new Date() : null, blockedReason: action === 'ban' ? note : null,
      } });
      return;
    }
    if (!paymentId) throw new PaymentError('Transaksi ini belum memiliki akses paket.', 409);
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
    const payment = await tx.payment.findFirst({ where: { id: paymentId, deletedAt: null }, include: { package: true, user: true, gatewayOrder: true } });
    if (!payment || (source === 'manual' && payment.gatewayOrder)) throw new PaymentError('Pembayaran tidak ditemukan.', 404);
    if (action === 'verify' || action === 'reject') {
      if (source !== 'manual' || payment.status !== 'pending') throw new PaymentError('Hanya pembayaran manual yang menunggu verifikasi dapat diproses.', 409);
      if (action === 'verify' && payment.user.isBlocked) throw new PaymentError('Buka blokir akun terlebih dahulu.', 409);
      if (action === 'verify') await activatePayment(tx, payment);
      await tx.payment.update({ where: { id: paymentId }, data: { status: action === 'verify' ? 'verified' : 'rejected', blockReason: action === 'reject' ? note : null } });
    } else if (action === 'block') {
      if (payment.status !== 'verified') throw new PaymentError('Akses pembayaran ini tidak dapat diblokir.', 409);
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'blocked', blockReason: note } });
    } else if (action === 'restore') {
      if (payment.status !== 'blocked' || (source === 'midtrans' && !['paid', 'partially_refunded'].includes(gatewayStatus ?? ''))) throw new PaymentError('Akses pembayaran ini tidak dapat dipulihkan.', 409);
      // Restore the previous entitlement without activating or extending its clock.
      const status = source === 'midtrans' || payment.verifiedAt ? 'verified' : 'pending';
      await tx.payment.update({ where: { id: paymentId }, data: { status, blockReason: null } });
    }
  });
}
