import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import prisma from '@/lib/prisma';
import { makeQueryClient } from '@/lib/queryClient';
import UserSidebar from '@/components/layouts/UserSidebar';
import { SidebarProvider } from '@/components/shadcn/sidebar';
import { TooltipProvider } from '@/components/shadcn/tooltip';

export const dynamic = "force-dynamic";

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
          include: { _count: { select: { packageTryouts: true } } },
        });
        return data.map(({ _count, ...p }) => ({ ...p, tryoutCount: Math.max(p.tryoutCount, _count.packageTryouts), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }));
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['banks'],
      queryFn: async () => {
        const data = await prisma.bankAccount.findMany({
          where: { isActive: true, deletedAt: null },
          orderBy: { id: 'asc' },
        });
        return data.map((b) => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }));
      },
    }),
  ]);

  return (
    <TooltipProvider>
      <SidebarProvider
        data-ui="user-dashboard"
        className="min-h-screen bg-background"
        style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}
      >
        <Suspense fallback={<div className="hidden md:block w-64 shrink-0 bg-white border-r border-gray-100" />}>
          <UserSidebar />
        </Suspense>
        <main className="min-w-0 flex-1 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+112px)] sm:p-7 sm:pb-32 md:pb-7">
          <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
          </HydrationBoundary>
        </main>
      </SidebarProvider>
    </TooltipProvider>
  );
}
