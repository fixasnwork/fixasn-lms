import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import DashboardHomeClient from '@/components/dashboard/DashboardHomeClient';

export default async function DashboardHome() {
  const session = await auth();
  const userName = session?.user?.name || 'Pengguna';
  const userEmail = session?.user?.email;

  // Fetch packages from DB
  const dbPackages = await prisma.package.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { id: 'asc' },
  });
  const packages = dbPackages.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  // Fetch user's verified/pending payments to determine owned packages
  let purchasedPkgIds: number[] = [];
  if (userEmail) {
    const payments = await prisma.payment.findMany({
      where: {
        userId: userEmail,
        status: { in: ['pending', 'verified'] },
      },
      select: { packageId: true },
    });
    purchasedPkgIds = payments.map((p) => p.packageId);
  }

  return (
    <DashboardHomeClient
      userName={userName}
      packages={packages}
      purchasedPkgIds={purchasedPkgIds}
    />
  );
}
