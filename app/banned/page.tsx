import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import BannedClient from './BannedClient';

export default async function BannedPage() {
  const session = await auth();

  // Non-banned users should not see this page
  if (!session?.user || !(session as { isBlocked?: boolean }).isBlocked) {
    redirect('/dashboard');
  }

  return <BannedClient />;
}
