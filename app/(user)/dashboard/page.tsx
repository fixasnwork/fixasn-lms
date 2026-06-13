import { auth } from '@/auth';
import DashboardHomeClient from '@/components/dashboard/DashboardHomeClient';

export default async function DashboardHome() {
  const session = await auth();
  const userName = session?.user?.name || 'Pengguna';

  return (
    <DashboardHomeClient
      userName={userName}
    />
  );
}
