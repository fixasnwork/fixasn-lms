import { Suspense } from 'react';
import { auth } from '@/auth';
import { unauthorized, forbidden } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import prisma from '@/lib/prisma';
import { makeQueryClient } from '@/lib/queryClient';
import UserSidebar from '@/components/layouts/UserSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    unauthorized();
  }
  if ((session as { isSessionStale?: boolean }).isSessionStale) {
    unauthorized();
  }

  const role = (session.user as { role?: string }).role;
  if (role !== 'user') {
    forbidden();
  }

  // Prefetch common data on server to avoid client waterfalls
  const queryClient = makeQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['packages'],
      queryFn: async () => {
        const data = await prisma.package.findMany({ orderBy: { id: 'asc' } });
        return data.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }));
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['banks'],
      queryFn: async () => {
        const data = await prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
        return data.map((b) => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }));
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Suspense fallback={<div className="hidden md:flex w-[228px] fixed h-screen top-0 bg-white border-r border-gray-100" />}>
        <UserSidebar />
      </Suspense>
      <main className="md:ml-[228px] p-7 pb-24 md:pb-7 min-w-0 md:max-w-[calc(100vw-228px)]">
        <HydrationBoundary state={dehydrate(queryClient)}>
          {children}
        </HydrationBoundary>
      </main>
    </div>
  );
}
