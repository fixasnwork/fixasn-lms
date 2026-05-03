import { auth } from '@/auth';
import { redirect } from 'next/navigation';
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

  // Only users (not admins) should see the dashboard
  const role = (session.user as { role?: string }).role;
  if (role !== 'user') {
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
