import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import BackupsPageClient from './backups-page-client';

export default async function BackupsPage() {
  await requireAuthenticatedUser();

  return <BackupsPageClient />;
}
