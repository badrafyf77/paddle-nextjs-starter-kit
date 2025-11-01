'use client';

import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, RotateCcw, X } from 'lucide-react';

interface StatusBarProps {
  interviewTitle: string;
  isConnected: boolean;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onEnd: () => void;
}

export function StatusBar({
  interviewTitle,
  isConnected,
  isRecording,
  onStart,
  onStop,
  onReset,
  onEnd,
}: StatusBarProps) {
  return (
    <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-8">
      {/* Left: Interview Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-lg">🎯</span>
        </div>
        <div>
          <h3 className="text-white font-medium text-sm">{interviewTitle}</h3>
          <p className="text-gray-400 text-xs">
            {isConnected ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Connected
              </span>
            ) : (
              'Disconnected'
            )}
          </p>
        </div>
      </div>

      {/* Center: Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button onClick={onStart} size="lg" className="bg-green-600 hover:bg-green-700">
            <Video className="mr-2 h-4 w-4" />
            Start Interview
          </Button>
        ) : (
          <>
            <Button onClick={onStop} size="lg" variant="destructive">
              <VideoOff className="mr-2 h-4 w-4" />
              Stop
            </Button>
            <Button onClick={onReset} size="lg" variant="outline" className="text-white border-gray-700">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </>
        )}
      </div>

      {/* Right: End Interview */}
      <Button onClick={onEnd} size="lg" variant="ghost" className="text-white hover:bg-gray-800">
        <X className="mr-2 h-4 w-4" />
        End Interview
      </Button>
    </div>
  );
}
