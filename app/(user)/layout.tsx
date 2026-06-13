import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
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
    redirect('/login');
  }
  if ((session as { isSessionStale?: boolean }).isSessionStale) {
    redirect('/login');
  }

  const role = (session.user as { role?: string }).role;
  if (role !== 'user') {
    redirect('/login');
  }

  // Check if user is banned
  const email = session.user.email;
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { isBlocked: true },
    });
    if (user?.isBlocked) {
      redirect('/banned');
    }
  }

  // Prefetch common data on server to avoid client waterfalls
  const queryClient = makeQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['packages'],
      queryFn: async () => {
        const data = await prisma.package.findMany({
          where: { deletedAt: null },
          orderBy: { id: 'asc' },
        });
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
      <main className="md:ml-[228px] p-7 pb-32 md:pb-7 min-w-0 md:max-w-[calc(100vw-228px)]">
        <HydrationBoundary state={dehydrate(queryClient)}>
          {children}
        </HydrationBoundary>
      </main>
    </div>
  );
}
