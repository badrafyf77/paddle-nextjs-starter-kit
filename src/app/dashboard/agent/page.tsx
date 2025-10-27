import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { AgentDashboard } from '@/components/dashboard/agent/agent-dashboard';

export default function AgentPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
      <DashboardPageHeader pageTitle="Job Application Agent" />
      <AgentDashboard />
    </main>
  );
}
