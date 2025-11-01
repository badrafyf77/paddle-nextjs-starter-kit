import { useState, useCallback, useRef } from 'react';

function useWebcam() {
  const [stream, setStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

  const startWebcam = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false, // Audio is handled separately
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
      console.log('Webcam started successfully');
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError(err);
      setIsActive(false);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
      setIsActive(false);
      console.log('Webcam stopped');
    }
  }, []);

  return {
    stream,
    isActive,
    error,
    startWebcam,
    stopWebcam,
  };
}

export default useWebcam;
