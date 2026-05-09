import { Suspense } from 'react';
import { auth } from '@/auth';
import { unauthorized, forbidden } from 'next/navigation';
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
    unauthorized();
  }

  // Only admins should see the admin panel
  const role = (session.user as { role?: string }).role;
  if (role !== 'admin') {
    forbidden();
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
        const data = await prisma.package.findMany({ orderBy: { id: 'asc' } });
        return data.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }));
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Suspense fallback={<div className="hidden md:flex w-60 fixed h-screen top-0 bg-gradient-to-b from-[#0C1E45] to-[#1B3A6B]" />}>
        <AdminSidebar />
      </Suspense>
      <main className="md:ml-60 p-6 pb-24 md:pb-6 min-w-0 max-w-[calc(100vw-240px)]">
        <HydrationBoundary state={dehydrate(queryClient)}>
          {children}
        </HydrationBoundary>
      </main>
    </div>
  );
}
