import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import SettingsPageClient from './settings-page-client';

export default async function SettingsPage() {
  await requireAuthenticatedUser();

  return <SettingsPageClient />;
}
