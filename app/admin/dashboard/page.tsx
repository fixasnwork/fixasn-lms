import prisma from "@/lib/prisma";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboard() {
  const [payments, packages] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.package.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    }),
  ]);

  const serializedPayments = payments.map((p) => ({
    id: p.id,
    userId: p.userId,
    packageId: p.packageId,
    status: p.status as "pending" | "verified" | "blocked",
    proofUrl: p.proofUrl,
    blockReason: p.blockReason,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const serializedPackages = packages.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    isTrial: p.isTrial,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <AdminDashboardClient
      payments={serializedPayments}
      packages={serializedPackages}
    />
  );
}
