'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface JobApplication {
  id: string;
  platform: string;
  job_url: string;
  job_title: string | null;
  company_name: string | null;
  status: string;
  applied_at: string | null;
  created_at: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-4 w-4" />,
    variant: 'outline' as const,
  },
  submitted: {
    label: 'Submitted',
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: 'default' as const,
  },
  failed: {
    label: 'Failed',
    icon: <XCircle className="h-4 w-4" />,
    variant: 'destructive' as const,
  },
};

export function JobApplications() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <p className="text-muted-foreground text-center">No job applications yet. Add a job to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {applications.map((app) => {
        const config = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;

        return (
          <Card key={app.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{app.job_title || 'Job Application'}</CardTitle>
                  <CardDescription className="mt-1">
                    {app.company_name && <span>{app.company_name} • </span>}
                    <span className="capitalize">{app.platform}</span>
                  </CardDescription>
                </div>
                <Badge variant={config.variant} className="flex items-center gap-1">
                  {config.icon}
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {app.applied_at
                    ? `Applied ${new Date(app.applied_at).toLocaleDateString()}`
                    : `Created ${new Date(app.created_at).toLocaleDateString()}`}
                </div>
                <a
                  href={app.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View Job
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
