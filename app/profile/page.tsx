import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import ProfilePageClient from './profile-page-client';

export default async function ProfilePage() {
  await requireAuthenticatedUser();

  return <ProfilePageClient />;
}
