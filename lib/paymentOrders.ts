import { randomUUID } from 'node:crypto';
import type { PaymentOrder } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isPackageAvailable } from '@/lib/availability';
import { activePaymentWhere } from '@/lib/packageAccess';
import { activatePayment } from '@/lib/paymentActivation';
import { calculateAdminFee, getPaymentMethod } from '@/lib/paymentMethods';
import { OPEN_ORDER_STATUSES } from '@/lib/paymentOrderTypes';
import { IS_MIDTRANS_PAYMENT_ENABLED } from '@/lib/paymentMode';
import {
  createSnapCheckout, getMidtransStatus, mapMidtransStatus, midtransDate,
  paymentAppUrl, PaymentError, type MidtransStatus,
} from '@/lib/midtrans';

export function mapPaymentOrder(order: PaymentOrder) {
  return {
    orderId: order.orderId, userId: order.userId, packageId: order.packageId, packageName: order.packageName,
    amount: order.amount, adminFee: order.adminFee, totalAmount: order.totalAmount,
    accessDurationMonths: order.accessDurationMonths, paymentMethod: order.paymentMethod,
    status: order.status, snapRedirectUrl: order.snapRedirectUrl,
    paidAt: order.paidAt?.toISOString() ?? null, expiresAt: order.expiresAt.toISOString(), createdAt: order.createdAt.toISOString(),
  };
}

export async function createPaymentOrder(userId: string, name: string, packageId: unknown, methodCode: unknown) {
  if (!IS_MIDTRANS_PAYMENT_ENABLED) throw new PaymentError('Pembayaran Midtrans sedang dinonaktifkan.', 403);
  const method = getPaymentMethod(methodCode);
  if (!Number.isSafeInteger(packageId) || Number(packageId) <= 0 || !method) throw new PaymentError('Paket atau metode pembayaran tidak valid.');
  // Fail before reserving an order if deployment configuration is incomplete.
  paymentAppUrl();
  if (!process.env.MIDTRANS_SERVER_KEY) throw new PaymentError('Pembayaran belum tersedia. Hubungi admin.', 503);
  const reservation = await prisma.$transaction(async (tx) => {
    // Serialize checkout requests for this account across tabs and instances.
    await tx.$queryRaw`SELECT email FROM users WHERE email = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { email: userId } });
    if (!user || user.deletedAt || user.isBlocked) throw new PaymentError('Akun tidak dapat melakukan pembelian.', 403);
    const pkg = await tx.package.findFirst({ where: { id: Number(packageId), deletedAt: null } });
    if (!pkg || pkg.isTrial || pkg.price <= 0 || !isPackageAvailable(pkg)) throw new PaymentError('Paket tidak tersedia untuk dibeli.', 403);
    const active = await tx.payment.findFirst({ where: { userId, packageId: pkg.id, ...activePaymentWhere() } });
    if (active) throw new PaymentError('Paket ini sudah aktif.', 409);
    const manualPending = await tx.payment.findFirst({ where: { userId, packageId: pkg.id, status: 'pending', deletedAt: null } });
    if (manualPending) throw new PaymentError('Pembayaran manual paket ini masih menunggu verifikasi admin.', 409);
    const existing = await tx.paymentOrder.findFirst({
      where: { userId, packageId: pkg.id, status: { in: OPEN_ORDER_STATUSES } }, orderBy: { createdAt: 'desc' },
    });
    if (existing) return { order: existing, fresh: false };
    const adminFee = calculateAdminFee(pkg.price, method.code);
    if (pkg.price + adminFee > 2147483647) throw new PaymentError('Nominal pembayaran terlalu besar.');
    const now = new Date();
    const order = await tx.paymentOrder.create({ data: {
      orderId: `FX-${randomUUID()}`, userId, packageId: pkg.id, packageName: pkg.name,
      amount: pkg.price, adminFee, totalAmount: pkg.price + adminFee, accessDurationMonths: pkg.accessDurationMonths,
      paymentMethod: method.code, createdAt: now, expiresAt: new Date(now.getTime() + 24 * 3600_000),
    } });
    return { order, fresh: true };
  });
  if (!reservation.fresh) {
    await syncPaymentOrder(reservation.order);
    return prisma.paymentOrder.findUniqueOrThrow({ where: { id: reservation.order.id } });
  }
  try {
    const snap = await createSnapCheckout(reservation.order, { email: userId, name });
    // A fast webhook may already have marked the order paid. Never overwrite it.
    await prisma.paymentOrder.updateMany({ where: { id: reservation.order.id, status: 'creating' }, data: { status: 'pending' } });
    return await prisma.paymentOrder.update({ where: { id: reservation.order.id }, data: snap });
  } catch (error) {
    // A network timeout may still have created a payable Snap transaction.
    // Keep that reservation open; never issue another charge automatically.
    if (error instanceof PaymentError && error.status === 422) {
      await prisma.paymentOrder.updateMany({ where: { id: reservation.order.id, status: 'creating' }, data: { status: 'failed' } });
    }
    return prisma.paymentOrder.findUniqueOrThrow({ where: { id: reservation.order.id } });
  }
}

export async function applyMidtransStatus(orderId: string, data: MidtransStatus) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "paymentOrders" WHERE "orderId" = ${orderId} FOR UPDATE`;
    const order = await tx.paymentOrder.findUnique({ where: { orderId } });
    if (!order) throw new PaymentError('Order tidak ditemukan.', 404);
    if (data.order_id !== orderId || !/^\d+(\.0{1,2})?$/.test(data.gross_amount) ||
        Number(data.gross_amount) !== order.totalAmount || (data.currency && data.currency !== 'IDR')) {
      throw new PaymentError('Nominal atau identitas pembayaran tidak sesuai.');
    }
    // Snap may replace a pending transaction when the customer retries. Pin
    // the provider transaction identity only after successful payment.
    if (order.paidAt && order.transactionId && data.transaction_id && order.transactionId !== data.transaction_id) {
      throw new PaymentError('Identitas transaksi tidak sesuai.');
    }
    const mapped = mapMidtransStatus(data);
    if (!mapped) return order;
    if (['paid', 'partially_refunded'].includes(mapped) && (data.status_code !== '200' || !data.transaction_id)) {
      throw new PaymentError('Pembayaran berhasil belum dapat dikonfirmasi.');
    }
    // Success is sticky against delayed pending/failed events; refunds remain explicit.
    let status = mapped;
    if (order.status === 'refunded') status = 'refunded';
    else if (['paid', 'partially_refunded'].includes(order.status) && !['refunded', 'partially_refunded'].includes(mapped)) status = order.status;
    else if (!OPEN_ORDER_STATUSES.includes(order.status) && mapped === 'pending') status = order.status;
    const paidAt = order.paidAt ?? (['paid', 'partially_refunded'].includes(status) ? midtransDate(data.settlement_time) ?? midtransDate(data.transaction_time) ?? new Date() : null);
    let paymentId = order.paymentId;
    if (['paid', 'partially_refunded'].includes(status) && !paymentId) {
      // One payment per order: order row lock and unique paymentId prevent duplicate activation.
      const payment = await tx.payment.create({ data: {
        userId: order.userId, packageId: order.packageId, status: 'pending', accessDurationMonths: order.accessDurationMonths,
      }, include: { package: true } });
      await activatePayment(tx, payment, paidAt ?? new Date());
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'verified' } });
      paymentId = payment.id;
    }
    if (status === 'refunded' && paymentId) {
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'rejected' } });
    }
    return tx.paymentOrder.update({ where: { id: order.id }, data: {
      status, paymentId, paidAt, ...(data.transaction_id ? { transactionId: data.transaction_id } : {}),
    } });
  });
}

export async function syncPaymentOrder(order: PaymentOrder, force = false) {
  if (['failed', 'denied', 'cancelled', 'expired', 'refunded'].includes(order.status) && !force) return;
  const now = new Date();
  if (!force) {
    // Database claim bounds polling across tabs and application instances.
    const claim = await prisma.paymentOrder.updateMany({ where: {
      id: order.id, OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(now.getTime() - 15_000) } }],
    }, data: { lastSyncedAt: now } });
    if (!claim.count) return;
  }
  const data = await getMidtransStatus(order.orderId);
  if (data) await applyMidtransStatus(order.orderId, data);
  else if (order.expiresAt <= now) {
    // No payment method was submitted, and the explicit 24h Snap deadline has passed.
    await prisma.paymentOrder.updateMany({ where: { id: order.id, status: { in: OPEN_ORDER_STATUSES } }, data: { status: 'expired' } });
  }
}
