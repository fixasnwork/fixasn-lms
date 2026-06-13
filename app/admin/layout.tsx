import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import prisma from '@/lib/prisma';
import { makeQueryClient } from '@/lib/queryClient';
import AdminSidebar from '@/components/layouts/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Only admins should see the admin panel
  const role = (session.user as { role?: string }).role;
  if (role !== 'admin') {
    redirect('/');
  }

  // Prefetch common admin data on server
  const queryClient = makeQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['admin-payments'],
      queryFn: async () => {
        const data = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
        return data.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }));
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['packages'],
      queryFn: async () => {
        const data = await prisma.package.findMany({
          where: { deletedAt: null },
          orderBy: { id: 'asc' },
          include: { _count: { select: { packageTryouts: true } } },
        });
        return data.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          isTrial: p.isTrial,
          startDate: p.startDate?.toISOString() ?? null,
          endDate: p.endDate?.toISOString() ?? null,
          tryoutCount: Math.max(p.tryoutCount, p._count.packageTryouts),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }));
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['logo-config'],
      queryFn: async () => {
        const entries = await prisma.logoConfigEntry.findMany();
        return Object.fromEntries(entries.map(e => [e.configKey, e.configValue]));
      },
    }),
  ]);

  // Read brand colors from prefetched data for server-side CSS var injection
  const logoConfigData = queryClient.getQueryData(['logo-config']) as Record<string, string | null> | undefined;
  const brandPrimary = logoConfigData?.themePrimary || '#1B3A6B';
  const brandSecondary = logoConfigData?.themeSecondary || '#2563EB';
  const brandDark = logoConfigData?.themeDark || '#0C1E45';

  return (
    <>
      <style>{`
        :root {
          --brand-primary: ${brandPrimary};
          --brand-secondary: ${brandSecondary};
          --brand-dark: ${brandDark};
        }
      `}</style>
      <div className="min-h-screen bg-[#F0F4FF]">
        <Suspense fallback={<div className="hidden md:flex w-60 fixed h-screen top-0 bg-gradient-to-b from-brand-dark to-brand" />}>
          <AdminSidebar />
        </Suspense>
        <main className="min-w-0 px-4 py-4 pb-24 sm:px-5 sm:py-5 sm:pb-24 md:ml-60 md:px-6 md:py-6 md:pb-6 md:max-w-[calc(100vw-240px)]">
          <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
          </HydrationBoundary>
        </main>
      </div>
    </>
  );
}
