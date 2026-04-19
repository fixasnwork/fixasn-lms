'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { redirect } from 'next/navigation';
import UserSidebar from '@/components/layouts/UserSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated || role !== 'user') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <UserSidebar />
      <main className="md:ml-[228px] p-7 pb-24 md:pb-7 min-w-0 max-w-[calc(100vw-228px)]">
        {children}
      </main>
    </div>
  );
}
