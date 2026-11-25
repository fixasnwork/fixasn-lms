import type { Prisma } from '@prisma/client';
import { accessExpiry } from '@/lib/packageAccess';

// Caller must lock the payment row before invoking this function.
export async function activatePayment(tx: Prisma.TransactionClient, payment: {
  id: string; userId: string; packageId: number; status: string;
  accessDurationMonths: number | null; verifiedAt: Date | null;
  package: { accessDurationMonths: number };
}, paidAt = new Date()) {
  const legacyVerified = payment.status === 'verified' && payment.accessDurationMonths === null;
  if (!payment.verifiedAt && !legacyVerified) {
    const months = payment.accessDurationMonths ?? payment.package.accessDurationMonths;
    await tx.payment.update({
      where: { id: payment.id },
      data: { verifiedAt: paidAt, accessDurationMonths: months, accessExpiresAt: accessExpiry(paidAt, months) },
    });
  }
  await tx.userPurchase.upsert({
    where: { userId_packageId: { userId: payment.userId, packageId: payment.packageId } },
    create: { userId: payment.userId, packageId: payment.packageId, paymentId: payment.id },
    update: { paymentId: payment.id, deletedAt: null },
  });
}
