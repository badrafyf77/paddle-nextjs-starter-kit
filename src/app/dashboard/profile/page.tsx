import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { ProfileSetup } from '@/components/dashboard/profile/profile-setup';

export default function ProfilePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
      <DashboardPageHeader pageTitle="Profile Setup" />
      <ProfileSetup />
    </main>
  );
}
