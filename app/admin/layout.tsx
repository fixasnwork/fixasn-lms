import { auth } from '@/auth';
import { redirect } from 'next/navigation';
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
