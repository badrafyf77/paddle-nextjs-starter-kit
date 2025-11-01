'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VideoCall } from './video-call';
import { Mic, Video, Settings } from 'lucide-react';

export function InterviewPrep() {
  const [isInInterview, setIsInInterview] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [interviewTitle, setInterviewTitle] = useState('');
  const [serverUrl, setServerUrl] = useState(process.env.NEXT_PUBLIC_INTERVIEW_SERVER_URL || 'ws://localhost:8000');

  const handleStartInterview = () => {
    if (!candidateName.trim() || !serverUrl.trim()) {
      alert('Please enter your name and server URL');
      return;
    }
    setIsInInterview(true);
  };

  const handleEndInterview = () => {
    setIsInInterview(false);
  };

  if (isInInterview) {
    return (
      <VideoCall
        candidateName={candidateName}
        interviewTitle={interviewTitle || 'Job Interview Practice'}
        serverUrl={serverUrl}
        onEnd={handleEndInterview}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>AI Interview Practice</CardTitle>
          <CardDescription>
            Practice your interview skills with our AI interviewer. Get real-time feedback and improve your responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Interview Title (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g., Software Engineer Interview"
                value={interviewTitle}
                onChange={(e) => setInterviewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="server">Voice Chat Server URL</Label>
              <Input
                id="server"
                placeholder="ws://your-ec2-instance:8000"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Enter your AWS EC2 instance URL where the voice chat server is running
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Before you start:
            </h4>
            <ul className="text-sm space-y-1 ml-6 list-disc text-muted-foreground">
              <li>Ensure your camera and microphone are connected</li>
              <li>Find a quiet environment</li>
              <li>Your voice chat server must be running on AWS EC2</li>
              <li>Grant browser permissions for camera and microphone</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleStartInterview} className="flex-1" size="lg">
              <Video className="mr-2 h-4 w-4" />
              Start Interview
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Real-time Voice</h4>
                <p className="text-xs text-muted-foreground">Natural conversation with AI</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Video Recording</h4>
                <p className="text-xs text-muted-foreground">See yourself as you practice</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
