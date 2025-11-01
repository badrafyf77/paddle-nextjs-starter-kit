'use client';

import { useState, useEffect } from 'react';
import { VideoPanel } from './video-panel';
import { TranscriptPanel } from './transcript-panel';
import { StatusBar } from './status-bar';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWebcam } from '@/hooks/useWebcam';
import { useAudioCapture } from '@/hooks/useAudioCapture';

interface VideoCallProps {
  candidateName: string;
  interviewTitle: string;
  serverUrl: string;
  onEnd: () => void;
}

export function VideoCall({ candidateName, interviewTitle, serverUrl, onEnd }: VideoCallProps) {
  const [isRecording, setIsRecording] = useState(false);

  const { isConnected, messages, connect, disconnect, clearHistory, sendAudioData } = useWebSocket(serverUrl);

  const { stream: webcamStream, startWebcam, stopWebcam, error: webcamError } = useWebcam();

  const { startCapture, stopCapture, isCapturing } = useAudioCapture(sendAudioData, () => false); // TODO: Pass actual TTS state

  const handleStart = async () => {
    try {
      await connect();
      await startWebcam();
      await startCapture();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start interview:', error);
      alert('Failed to start interview. Please check your permissions and server connection.');
    }
  };

  const handleStop = () => {
    disconnect();
    stopWebcam();
    stopCapture();
    setIsRecording(false);
  };

  const handleEnd = () => {
    handleStop();
    onEnd();
  };

  const handleReset = () => {
    clearHistory();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Main Content Area */}
      <div className="h-[calc(100vh-80px)] flex">
        {/* Left: Video Panel */}
        <div className="flex-1 p-4">
          <VideoPanel
            candidateName={candidateName}
            stream={webcamStream}
            isRecording={isRecording}
            error={webcamError}
          />
        </div>

        {/* Right: Transcript Panel */}
        <div className="w-96 bg-white">
          <TranscriptPanel messages={messages} />
        </div>
      </div>

      {/* Bottom: Status Bar */}
      <StatusBar
        interviewTitle={interviewTitle}
        isConnected={isConnected}
        isRecording={isRecording}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
        onEnd={handleEnd}
      />
    </div>
  );
}
