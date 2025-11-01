'use client';

import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { User, Camera } from 'lucide-react';

interface VideoPanelProps {
  candidateName: string;
  stream: MediaStream | null;
  isRecording: boolean;
  error: Error | null;
}

export function VideoPanel({ candidateName, stream, isRecording, error }: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden border min-h-[400px]">
      {/* Video Feed */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="text-center">
            {error ? (
              <>
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground text-lg font-medium">Camera unavailable</p>
                <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
              </>
            ) : (
              <>
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground text-lg font-medium">Waiting for camera...</p>
                <p className="text-muted-foreground text-sm mt-2">Grant permissions to start</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Candidate Name Badge - Bottom Left */}
      <div className="absolute bottom-4 left-4">
        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
          <User className="h-3 w-3 mr-2" />
          {candidateName}
        </Badge>
      </div>

      {/* AI Interviewer Badge - Bottom Right */}
      <div className="absolute bottom-4 right-4">
        <Badge variant="default" className="bg-primary/80 backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full mr-2 ${isRecording ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
          AI Interviewer
        </Badge>
      </div>
    </div>
  );
}
