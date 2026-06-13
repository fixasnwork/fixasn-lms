import prisma from '@/lib/prisma';
import type { PackagePopularityItem } from '@/lib/types';

/**
 * Compute package popularity from non-deleted payment records.
 *
 * Counts all non-deleted payments grouped by non-deleted packages.
 * Returns rows sorted by purchaseCount desc, then package name for stability.
 * Returns empty array when no payments or packages exist.
 */
export async function getPackagePopularity(): Promise<PackagePopularityItem[]> {
  const [payments, packages] = await Promise.all([
    prisma.payment.findMany({
      where: { deletedAt: null },
      select: { packageId: true },
    }),
    prisma.package.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);

  if (payments.length === 0 || packages.length === 0) {
    return packages.map((pkg) => ({
      packageId: pkg.id,
      packageName: pkg.name,
      purchaseCount: 0,
      purchaseShare: 0,
    }));
  }

  const pkgMap = new Map(packages.map((p) => [p.id, p.name]));
  const countMap = new Map<number, number>();

  for (const p of payments) {
    if (pkgMap.has(p.packageId)) {
      countMap.set(p.packageId, (countMap.get(p.packageId) ?? 0) + 1);
    }
  }

  const totalPayments = [...countMap.values()].reduce((s, c) => s + c, 0);

  const rows: PackagePopularityItem[] = packages.map((pkg) => {
    const count = countMap.get(pkg.id) ?? 0;
    return {
      packageId: pkg.id,
      packageName: pkg.name,
      purchaseCount: count,
      purchaseShare: totalPayments > 0 ? Math.round((count / totalPayments) * 100) : 0,
    };
  });

  rows.sort((a, b) => {
    if (b.purchaseCount !== a.purchaseCount) return b.purchaseCount - a.purchaseCount;
    return a.packageName.localeCompare(b.packageName);
  });

  return rows;
}
