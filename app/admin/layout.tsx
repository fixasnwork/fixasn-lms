'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/layouts/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated || role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <AdminSidebar />
      <main className="md:ml-60 p-6 pb-24 md:pb-6 min-w-0 max-w-[calc(100vw-240px)]">
        {children}
      </main>
    </div>
  );
}
