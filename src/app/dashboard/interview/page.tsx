import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { InterviewPrep } from '@/components/dashboard/interview/interview-prep';

export default function InterviewPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
      <DashboardPageHeader pageTitle="Interview Preparation" />
      <InterviewPrep />
    </main>
  );
}
