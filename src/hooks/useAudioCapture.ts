import { useState, useRef, useCallback } from 'react';

const BATCH_SAMPLES = 2048;
const HEADER_BYTES = 8;
const FRAME_BYTES = BATCH_SAMPLES * 2;
const MESSAGE_BYTES = HEADER_BYTES + FRAME_BYTES;

export function useAudioCapture(onAudioData: (data: ArrayBuffer) => void, getTTSPlayingState: () => boolean) {
  const [isCapturing, setIsCapturing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const batchBufferRef = useRef<ArrayBuffer | null>(null);
  const batchViewRef = useRef<DataView | null>(null);
  const batchInt16Ref = useRef<Int16Array | null>(null);
  const batchOffsetRef = useRef(0);
  const bufferPoolRef = useRef<ArrayBuffer[]>([]);

  const initBatch = useCallback(() => {
    if (!batchBufferRef.current) {
      batchBufferRef.current = bufferPoolRef.current.pop() || new ArrayBuffer(MESSAGE_BYTES);
      batchViewRef.current = new DataView(batchBufferRef.current);
      batchInt16Ref.current = new Int16Array(batchBufferRef.current, HEADER_BYTES);
      batchOffsetRef.current = 0;
    }
  }, []);

  const flushBatch = useCallback(() => {
    if (!batchViewRef.current || !batchBufferRef.current) return;

    const ts = Date.now() & 0xffffffff;
    batchViewRef.current.setUint32(0, ts, false);
    const flags = getTTSPlayingState() ? 1 : 0;
    batchViewRef.current.setUint32(4, flags, false);

    onAudioData(batchBufferRef.current);

    bufferPoolRef.current.push(batchBufferRef.current);
    batchBufferRef.current = null;
  }, [onAudioData, getTTSPlayingState]);

  const flushRemainder = useCallback(() => {
    if (batchOffsetRef.current > 0 && batchInt16Ref.current) {
      for (let i = batchOffsetRef.current; i < BATCH_SAMPLES; i++) {
        batchInt16Ref.current[i] = 0;
      }
      flushBatch();
    }
  }, [flushBatch]);

  const startCapture = useCallback(async () => {
    console.log('🎤 Starting audio capture...');
    try {
      // Get microphone stream - MUST be 48kHz to match server expectations
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: 48000 },
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Create audio context at 48kHz (server expects this and resamples to 16kHz)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      }

      // Load audio worklet
      await audioContextRef.current.audioWorklet.addModule('/static/pcmWorkletProcessor.js');

      // Create worklet node
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-worklet-processor');

      // Handle audio data from worklet with batching
      workletNodeRef.current.port.onmessage = ({ data }) => {
        const incoming = new Int16Array(data);
        let read = 0;

        while (read < incoming.length) {
          initBatch();
          const toCopy = Math.min(incoming.length - read, BATCH_SAMPLES - batchOffsetRef.current);

          if (batchInt16Ref.current) {
            batchInt16Ref.current.set(incoming.subarray(read, read + toCopy), batchOffsetRef.current);
          }

          batchOffsetRef.current += toCopy;
          read += toCopy;

          if (batchOffsetRef.current === BATCH_SAMPLES) {
            flushBatch();
          }
        }
      };

      // Connect audio graph
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(workletNodeRef.current);

      setIsCapturing(true);
      console.log('✅ Audio capture started at 48kHz with batching');
    } catch (err) {
      console.error('❌ Error starting audio capture:', err);
      throw err;
    }
  }, [initBatch, flushBatch]);

  const stopCapture = useCallback(() => {
    flushRemainder();

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsCapturing(false);
    console.log('🎤 Audio capture stopped');
  }, [flushRemainder]);

  return {
    isCapturing,
    startCapture,
    stopCapture,
  };
}
