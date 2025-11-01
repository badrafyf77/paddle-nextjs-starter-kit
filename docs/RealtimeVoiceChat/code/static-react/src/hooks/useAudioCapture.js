import { useState, useCallback, useRef } from 'react';

const BATCH_SAMPLES = 2048;
const HEADER_BYTES = 8;
const FRAME_BYTES = BATCH_SAMPLES * 2;
const MESSAGE_BYTES = HEADER_BYTES + FRAME_BYTES;

function useAudioCapture(sendAudioData) {
  const [isCapturing, setIsCapturing] = useState(false);
  const audioContextRef = useRef(null);
  const micWorkletNodeRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const batchBufferRef = useRef(null);
  const batchViewRef = useRef(null);
  const batchInt16Ref = useRef(null);
  const batchOffsetRef = useRef(0);
  const bufferPoolRef = useRef([]);
  const isTTSPlayingRef = useRef(false);

  const initBatch = useCallback(() => {
    if (!batchBufferRef.current) {
      batchBufferRef.current = bufferPoolRef.current.pop() || new ArrayBuffer(MESSAGE_BYTES);
      batchViewRef.current = new DataView(batchBufferRef.current);
      batchInt16Ref.current = new Int16Array(batchBufferRef.current, HEADER_BYTES);
      batchOffsetRef.current = 0;
    }
  }, []);

  const flushBatch = useCallback(() => {
    const ts = Date.now() & 0xffffffff;
    batchViewRef.current.setUint32(0, ts, false);
    const flags = isTTSPlayingRef.current ? 1 : 0;
    batchViewRef.current.setUint32(4, flags, false);

    sendAudioData(batchBufferRef.current);

    bufferPoolRef.current.push(batchBufferRef.current);
    batchBufferRef.current = null;
  }, [sendAudioData]);

  const flushRemainder = useCallback(() => {
    if (batchOffsetRef.current > 0) {
      for (let i = batchOffsetRef.current; i < BATCH_SAMPLES; i++) {
        batchInt16Ref.current[i] = 0;
      }
      flushBatch();
    }
  }, [flushBatch]);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: 48000 },
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      }

      await audioContextRef.current.audioWorklet.addModule('/static/pcmWorkletProcessor.js');

      micWorkletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-worklet-processor');

      micWorkletNodeRef.current.port.onmessage = ({ data }) => {
        const incoming = new Int16Array(data);
        let read = 0;

        while (read < incoming.length) {
          initBatch();
          const toCopy = Math.min(incoming.length - read, BATCH_SAMPLES - batchOffsetRef.current);
          batchInt16Ref.current.set(incoming.subarray(read, read + toCopy), batchOffsetRef.current);
          batchOffsetRef.current += toCopy;
          read += toCopy;

          if (batchOffsetRef.current === BATCH_SAMPLES) {
            flushBatch();
          }
        }
      };

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(micWorkletNodeRef.current);

      setIsCapturing(true);
      console.log('Audio capture started');
    } catch (error) {
      console.error('Error starting audio capture:', error);
      setIsCapturing(false);
    }
  }, [initBatch, flushBatch]);

  const stopCapture = useCallback(() => {
    flushRemainder();

    if (micWorkletNodeRef.current) {
      micWorkletNodeRef.current.disconnect();
      micWorkletNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsCapturing(false);
    console.log('Audio capture stopped');
  }, [flushRemainder]);

  return {
    isCapturing,
    startCapture,
    stopCapture,
  };
}

export default useAudioCapture;
