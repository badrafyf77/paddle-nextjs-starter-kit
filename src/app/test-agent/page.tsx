'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Platform {
  id: string;
  name: string;
  supported: boolean;
}

export default function TestAgentPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const response = await fetch('/api/agent/platforms');
      const data = await response.json();
      setPlatforms(data.platforms || []);
    } catch (error) {
      console.error('Error fetching platforms:', error);
    }
  };

  const checkStatus = async (platform: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agent/status?platform=${platform}`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectPlatform = async (platform: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/agent/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const data = await response.json();
      alert(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error connecting platform:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Job Application Agent - Test Page</h1>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Available Platforms</h2>
        <div className="grid grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="border p-4 rounded">
              <h3 className="font-semibold">{platform.name}</h3>
              <p className="text-sm text-gray-500">ID: {platform.id}</p>
              <div className="mt-4 space-x-2">
                <Button onClick={() => checkStatus(platform.id)} disabled={loading} variant="outline" size="sm">
                  Check Status
                </Button>
                <Button onClick={() => connectPlatform(platform.id)} disabled={loading} size="sm">
                  Connect
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {status && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Status Result</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(status, null, 2)}</pre>
        </Card>
      )}

      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>✅ GET /api/agent/platforms - List platforms</li>
          <li>✅ GET /api/agent/status?platform=linkedin - Check connection</li>
          <li>✅ POST /api/agent/connect - Connect to platform</li>
          <li>✅ POST /api/agent/apply - Apply to job</li>
          <li>✅ DELETE /api/agent/disconnect?platform=linkedin - Disconnect</li>
        </ul>
      </Card>
    </div>
  );
}
