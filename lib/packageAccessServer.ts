import prisma from '@/lib/prisma';
import { activePaymentWhere } from '@/lib/packageAccess';

export async function hasTryoutAccess(email: string, tryoutId: number): Promise<boolean> {
  const tryout = await prisma.tryout.findUnique({ where: { id: tryoutId, deletedAt: null }, select: { isTrial: true } });
  if (!tryout) return false;
  if (tryout.isTrial) return true;
  return (await prisma.payment.findFirst({
    where: {
      ...activePaymentWhere(), userId: email,
      package: { deletedAt: null, packageTryouts: { some: { tryoutId } } },
    }, select: { id: true },
  })) !== null;
}

export async function hasVideoPackageAccess(email: string): Promise<boolean> {
  // Keep legacy direct grants; paid access is checked against every payment,
  // so a pending renewal cannot replace a still-active verified purchase.
  const purchase = await prisma.userPurchase.findFirst({
    where: {
      userId: email, deletedAt: null,
      package: { is: { includesVideoPembelajaran: true, deletedAt: null } },
      OR: [
        { paymentId: null },
        { package: { is: { payments: { some: { ...activePaymentWhere(), userId: email } } } } },
      ],
    }, select: { id: true },
  });
  return purchase !== null;
}
