'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Linkedin, Briefcase, Building2, Rocket, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Platform {
  id: string;
  name: string;
  supported: boolean;
}

interface ConnectionStatus {
  platform: string;
  is_connected: boolean;
  loading?: boolean;
}

const platformIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-8 w-8" />,
  indeed: <Briefcase className="h-8 w-8" />,
  glassdoor: <Building2 className="h-8 w-8" />,
  wellfound: <Rocket className="h-8 w-8" />,
};

export function PlatformConnections() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const response = await fetch('/api/agent/platforms');
      const data = await response.json();
      setPlatforms(data.platforms || []);

      // Check connection status for each platform
      for (const platform of data.platforms || []) {
        checkConnectionStatus(platform.id);
      }
    } catch (error) {
      console.error('Error fetching platforms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load platforms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async (platform: string) => {
    try {
      const response = await fetch(`/api/agent/status?platform=${platform}`);
      const data = await response.json();

      if (data.status === 'success' && data.data) {
        setConnections((prev) => ({
          ...prev,
          [platform]: {
            platform,
            is_connected: data.data.is_connected,
          },
        }));
      }
    } catch (error) {
      console.error(`Error checking ${platform} status:`, error);
    }
  };

  const handleConnect = async (platform: string) => {
    setConnections((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true },
    }));

    try {
      const response = await fetch('/api/agent/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: 'Success',
          description: `Connected to ${platform}`,
        });
        checkConnectionStatus(platform);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to connect',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to platform',
        variant: 'destructive',
      });
    } finally {
      setConnections((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], loading: false },
      }));
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect from ${platform}?`)) {
      return;
    }

    setConnections((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true },
    }));

    try {
      const response = await fetch(`/api/agent/disconnect?platform=${platform}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: 'Success',
          description: `Disconnected from ${platform}`,
        });
        checkConnectionStatus(platform);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to disconnect',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect from platform',
        variant: 'destructive',
      });
    } finally {
      setConnections((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], loading: false },
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      {platforms.map((platform) => {
        const connection = connections[platform.id];
        const isConnected = connection?.is_connected || false;
        const isLoading = connection?.loading || false;

        return (
          <Card key={platform.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {platformIcons[platform.id]}
                  <div>
                    <CardTitle className="text-xl">{platform.name}</CardTitle>
                    <CardDescription className="mt-1">{isConnected ? 'Connected' : 'Not connected'}</CardDescription>
                  </div>
                </div>
                {isConnected ? (
                  <Badge variant="default" className="bg-green-600">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {isConnected
                  ? 'Your session is active. You can apply to jobs on this platform.'
                  : 'Connect your account to start applying to jobs automatically.'}
              </p>
              {isConnected ? (
                <Button
                  variant="outline"
                  onClick={() => handleDisconnect(platform.id)}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </Button>
              ) : (
                <Button onClick={() => handleConnect(platform.id)} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Account'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
