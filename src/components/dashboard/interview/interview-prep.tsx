'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { VideoCall } from './video-call';
import { Video, Mic, MessageSquare, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      {/* Main Setup Card */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Start Interview Practice</CardTitle>
                <CardDescription className="mt-1">
                  Practice with our AI interviewer and improve your skills
                </CardDescription>
              </div>
              <Badge variant="default" className="bg-blue-600">
                AI Powered
              </Badge>
            </div>
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
                <Label htmlFor="server">Server URL</Label>
                <Input
                  id="server"
                  placeholder="ws://your-server:8000"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Your voice chat server endpoint</p>
              </div>
            </div>

            <Button onClick={handleStartInterview} className="w-full" size="lg">
              <Video className="mr-2 h-4 w-4" />
              Start Interview Session
            </Button>
          </CardContent>
        </Card>

        {/* Requirements Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Before You Start
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                'Ensure your camera and microphone are connected',
                'Find a quiet environment with good lighting',
                'Grant browser permissions when prompted',
                'Voice chat server must be running and accessible',
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Real-time Voice</h4>
                <p className="text-xs text-muted-foreground mt-1">Natural conversation with AI interviewer</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Video Practice</h4>
                <p className="text-xs text-muted-foreground mt-1">See yourself as you practice</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Live Transcript</h4>
                <p className="text-xs text-muted-foreground mt-1">Real-time conversation transcript</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Improve Skills</h4>
                <p className="text-xs text-muted-foreground mt-1">Get better with each practice session</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Speak clearly and at a moderate pace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use the STAR method for behavioral questions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Practice makes perfect - do multiple sessions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Review your transcript after each session</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
