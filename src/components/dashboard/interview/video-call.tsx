'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoPanel } from './video-panel';
import { TranscriptPanel } from './transcript-panel';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWebcam } from '@/hooks/useWebcam';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { Video, VideoOff, Mic, MicOff, RotateCcw, X, Loader2 } from 'lucide-react';

interface VideoCallProps {
  candidateName: string;
  interviewTitle: string;
  serverUrl: string;
  onEnd: () => void;
}

export function VideoCall({ candidateName, interviewTitle, serverUrl, onEnd }: VideoCallProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const { isConnected, isReady, statusMessage, messages, connect, disconnect, clearHistory, sendAudioData } =
    useWebSocket(serverUrl);

  const { stream: webcamStream, startWebcam, stopWebcam, error: webcamError } = useWebcam();

  // Only allow audio capture when server is ready
  const { startCapture, stopCapture } = useAudioCapture(sendAudioData, () => !isReady);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await connect();

      // Wait for server to be ready before starting audio/video
      // The isReady state will be set by the WebSocket status message
      const maxWaitTime = 30000; // 30 seconds timeout
      const startTime = Date.now();

      while (!isReady && Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!isReady) {
        throw new Error('Server initialization timeout');
      }

      await startWebcam();
      await startCapture();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start interview:', error);
      alert('Failed to start interview. Please check your permissions and server connection.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = () => {
    disconnect();
    stopWebcam();
    stopCapture();
    setIsRecording(false);
  };

  const handleEnd = () => {
    if (isRecording) {
      handleStop();
    }
    onEnd();
  };

  const handleReset = () => {
    if (confirm('Clear conversation history?')) {
      clearHistory();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{interviewTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">Practice session with AI interviewer</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <Badge variant="default" className="bg-green-600">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
              Connected
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleEnd}>
            <X className="h-4 w-4 mr-2" />
            End Session
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3 flex-1 min-h-0">
        {/* Video Panel - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Video Feed</CardTitle>
                <div className="flex items-center gap-2">
                  {isConnected && !isReady && (
                    <Badge variant="secondary" className="animate-pulse">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Initializing...
                    </Badge>
                  )}
                  {isRecording && isReady && (
                    <Badge variant="destructive" className="animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full mr-2" />
                      Recording
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <VideoPanel
                candidateName={candidateName}
                stream={webcamStream}
                isRecording={isRecording}
                error={webcamError}
              />
            </CardContent>
          </Card>
        </div>

        {/* Transcript Panel - Takes 1 column */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Live Transcript</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <TranscriptPanel messages={messages} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="mt-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <Button onClick={handleStart} disabled={isStarting} size="lg">
                  {isStarting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Start Interview
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button onClick={handleStop} variant="destructive" size="lg" disabled={!isReady}>
                    <VideoOff className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="lg" disabled={!isReady}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mic className="h-4 w-4" />
              <span>
                {isConnected && !isReady
                  ? statusMessage || 'Initializing...'
                  : isRecording
                    ? 'Microphone active'
                    : 'Microphone inactive'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
