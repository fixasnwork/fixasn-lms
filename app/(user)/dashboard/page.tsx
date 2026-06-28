import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getEmailFromSessionUser } from '@/lib/deviceSession';
import DashboardHomeClient from '@/components/dashboard/DashboardHomeClient';

export const dynamic = 'force-dynamic';

export default async function DashboardHome() {
  const session = await auth();
  const userName = session?.user?.name || 'Pengguna';
  const userId = getEmailFromSessionUser(session?.user) || '';

  if (!userId) {
    // Layout already guards against this, but be defensive: no session ⇒ login.
    redirect('/login');
  }

  return <DashboardHomeClient userName={userName} />;
}
