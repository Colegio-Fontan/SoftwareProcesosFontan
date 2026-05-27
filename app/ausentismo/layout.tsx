import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';

export default async function AusentismoLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();

  if (!user || !user.can_access_ausentismo) {
    redirect('/home');
  }

  return <>{children}</>;
}
