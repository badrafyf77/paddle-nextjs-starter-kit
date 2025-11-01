import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, WebSocketMessage } from '@/lib/interview.types';

export function useWebSocket(serverUrl: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ttsWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);

  const connect = useCallback(async () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    // Initialize Audio Context for TTS playback
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      await audioContextRef.current.audioWorklet.addModule('/static/ttsPlaybackProcessor.js');

      ttsWorkletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'tts-playback-processor');

      ttsWorkletNodeRef.current.port.onmessage = (event) => {
        const { type } = event.data;
        if (type === 'ttsPlaybackStarted') {
          setIsTTSPlaying(true);
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'tts_start' }));
          }
        } else if (type === 'ttsPlaybackStopped') {
          setIsTTSPlaying(false);
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'tts_stop' }));
          }
        }
      };

      ttsWorkletNodeRef.current.connect(audioContextRef.current.destination);
    }

    // Parse server URL and create WebSocket connection
    const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsReady(false);
      setStatusMessage('Connecting...');
    };

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data);
          handleJSONMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsReady(false);
      setStatusMessage('');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    socketRef.current = socket;
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (ttsWorkletNodeRef.current) {
      ttsWorkletNodeRef.current.disconnect();
      ttsWorkletNodeRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const handleJSONMessage = useCallback((data: WebSocketMessage) => {
    const { type, content, sentence_id } = data;

    switch (type) {
      case 'status':
        // Handle server status messages (initializing, ready, error)
        console.log(`Server status: ${data.status} - ${data.message}`);
        setStatusMessage(data.message || '');

        if (data.status === 'ready') {
          setIsReady(true);
          console.log('✅ Server is ready - you can start speaking');
        } else if (data.status === 'initializing') {
          setIsReady(false);
        }
        break;

      case 'partial_user_request':
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.type !== 'partial' || m.role !== 'user');
          if (content?.trim()) {
            return [
              ...filtered,
              {
                id: `partial-user-${Date.now()}`,
                role: 'user' as const,
                content,
                type: 'partial' as const,
                timestamp: Date.now(),
              },
            ];
          }
          return filtered;
        });
        break;

      case 'final_user_request':
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.type !== 'partial' || m.role !== 'user');
          if (content?.trim()) {
            return [
              ...filtered,
              {
                id: `final-user-${Date.now()}`,
                role: 'user' as const,
                content,
                type: 'final' as const,
                timestamp: Date.now(),
              },
            ];
          }
          return filtered;
        });
        break;

      case 'assistant_sentence':
        setMessages((prev) => {
          if (!content?.trim()) return prev;

          // Find the last assistant message that's still being generated
          const lastAssistantIndex = prev.findLastIndex((m) => m.role === 'assistant' && m.type === 'partial');

          if (lastAssistantIndex !== -1) {
            const lastMessage = prev[lastAssistantIndex];

            // Check if this sentence was already added (prevent duplicates)
            if (lastMessage.content.includes(content)) {
              return prev;
            }

            // Append to existing partial assistant message
            const updated = [...prev];
            const separator =
              lastMessage.content.endsWith('.') ||
              lastMessage.content.endsWith('!') ||
              lastMessage.content.endsWith('?')
                ? ' '
                : ' ';
            updated[lastAssistantIndex] = {
              ...updated[lastAssistantIndex],
              content: updated[lastAssistantIndex].content + separator + content,
            };
            return updated;
          } else {
            // Create new partial assistant message
            return [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant' as const,
                content,
                type: 'partial' as const,
                timestamp: Date.now(),
              },
            ];
          }
        });
        break;

      case 'partial_assistant_answer':
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.type !== 'partial' || m.role !== 'assistant');
          if (content?.trim()) {
            return [
              ...filtered,
              {
                id: `partial-assistant-${Date.now()}`,
                role: 'assistant' as const,
                content,
                type: 'partial' as const,
                timestamp: Date.now(),
              },
            ];
          }
          return filtered;
        });
        break;

      case 'final_assistant_answer':
        setMessages((prev) => {
          // Mark the last partial assistant message as final
          const lastAssistantIndex = prev.findLastIndex((m) => m.role === 'assistant' && m.type === 'partial');

          if (lastAssistantIndex !== -1) {
            const updated = [...prev];
            updated[lastAssistantIndex] = {
              ...updated[lastAssistantIndex],
              type: 'final' as const,
            };
            return updated;
          }
          return prev;
        });
        break;

      case 'tts_chunk':
        if (ttsWorkletNodeRef.current && content) {
          const int16Data = base64ToInt16Array(content);
          ttsWorkletNodeRef.current.port.postMessage(int16Data);
        }
        break;

      case 'tts_interruption':
      case 'stop_tts':
        if (ttsWorkletNodeRef.current) {
          ttsWorkletNodeRef.current.port.postMessage({ type: 'clear' });
        }
        setIsTTSPlaying(false);
        break;

      default:
        console.log('Unknown message type:', type);
    }
  }, []);

  const base64ToInt16Array = (b64: string): Int16Array => {
    const raw = atob(b64);
    const buf = new ArrayBuffer(raw.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < raw.length; i++) {
      view[i] = raw.charCodeAt(i);
    }
    return new Int16Array(buf);
  };

  const sendAudioData = useCallback((audioBuffer: ArrayBuffer) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(audioBuffer);
    } else {
      console.warn('⚠️ WebSocket not open, cannot send audio');
    }
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'clear_history' }));
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'set_speed', speed }));
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isReady,
    statusMessage,
    messages,
    connect,
    disconnect,
    clearHistory,
    setSpeed,
    sendAudioData,
    isTTSPlaying,
  };
}
