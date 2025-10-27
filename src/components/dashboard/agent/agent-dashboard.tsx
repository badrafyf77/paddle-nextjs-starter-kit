'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformConnections } from './platform-connections';
import { JobApplications } from './job-applications';
import { AddJobForm } from './add-job-form';

export function AgentDashboard() {
  return (
    <Tabs defaultValue="platforms" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
        <TabsTrigger value="platforms">Platforms</TabsTrigger>
        <TabsTrigger value="jobs">Applications</TabsTrigger>
        <TabsTrigger value="add">Add Job</TabsTrigger>
      </TabsList>

      <TabsContent value="platforms" className="mt-6">
        <PlatformConnections />
      </TabsContent>

      <TabsContent value="jobs" className="mt-6">
        <JobApplications />
      </TabsContent>

      <TabsContent value="add" className="mt-6">
        <AddJobForm />
      </TabsContent>
    </Tabs>
  );
}
