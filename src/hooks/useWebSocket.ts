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

    // Initialize Audio Context for TTS playback (24kHz - direct from Kokoro TTS, no upsampling)
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      await audioContextRef.current.audioWorklet.addModule('/static/ttsPlaybackProcessor.js');

      ttsWorkletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'tts-playback-processor');

      ttsWorkletNodeRef.current.port.onmessage = (event) => {
        const { type, message } = event.data;
        if (type === 'ttsPlaybackStarted') {
          console.log('🔊 TTS playback started');
          setIsTTSPlaying(true);
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'tts_start' }));
          }
        } else if (type === 'ttsPlaybackStopped') {
          console.log('🔇 TTS playback stopped');
          setIsTTSPlaying(false);
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'tts_stop' }));
          }
        } else if (type === 'debug') {
          console.log(`🔊 Worklet: ${message}`);
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
    setIsReady(false);
    setStatusMessage('');
  }, []);

  const handleJSONMessage = useCallback((data: WebSocketMessage) => {
    const { type, content, sentence_id } = data;

    // Log all non-tts_chunk messages for debugging
    if (type !== 'tts_chunk') {
      console.log('📨 Received message:', type, content ? `"${content.substring(0, 50)}..."` : '');
    }

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
          // Remove any partial user messages
          const filtered = prev.filter((m) => !(m.type === 'partial' && m.role === 'user'));
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
          // Remove partial user messages and mark all partial assistant messages as final
          // This ensures previous assistant response is finalized before new user message
          const updated = prev
            .filter((m) => !(m.type === 'partial' && m.role === 'user'))
            .map((m) => {
              // Finalize any partial assistant messages from previous turn
              if (m.role === 'assistant' && m.type === 'partial') {
                return { ...m, type: 'final' as const };
              }
              return m;
            });

          if (content?.trim()) {
            return [
              ...updated,
              {
                id: `final-user-${Date.now()}`,
                role: 'user' as const,
                content,
                type: 'final' as const,
                timestamp: Date.now(),
              },
            ];
          }
          return updated;
        });
        break;

      case 'partial_assistant_answer':
        setMessages((prev) => {
          if (!content?.trim()) return prev;

          // Ensure there's a final user message before adding assistant response
          const hasFinalUserMessage = prev.some((m) => m.role === 'user' && m.type === 'final');
          if (!hasFinalUserMessage) {
            console.log('⚠️ Received assistant answer before user message, waiting...');
            return prev;
          }

          // Find the last user message and last assistant message
          const lastUserIndex = prev.findLastIndex((m) => m.role === 'user' && m.type === 'final');
          const lastAssistantIndex = prev.findLastIndex((m) => m.role === 'assistant');

          // If there's an assistant message after the last user message, update it
          if (lastAssistantIndex !== -1 && lastAssistantIndex > lastUserIndex) {
            // This assistant message is for the current turn
            const lastAssistant = prev[lastAssistantIndex];

            // Only update if it's still partial (not finalized)
            if (lastAssistant.type === 'partial') {
              const updated = [...prev];
              updated[lastAssistantIndex] = {
                ...updated[lastAssistantIndex],
                content, // Replace with full accumulated text
              };
              return updated;
            } else {
              // The last assistant message is already final, ignore this update
              console.log('⚠️ Ignoring partial update for finalized message');
              return prev;
            }
          } else {
            // No assistant message after last user, create new one
            console.log('✅ Creating new assistant message');
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

      case 'final_assistant_answer':
        setMessages((prev) => {
          // Mark the last partial assistant message as final and update content if provided
          const lastAssistantIndex = prev.findLastIndex((m) => m.role === 'assistant' && m.type === 'partial');

          if (lastAssistantIndex !== -1) {
            const updated = [...prev];
            updated[lastAssistantIndex] = {
              ...updated[lastAssistantIndex],
              type: 'final' as const,
              // Update content if provided (server sends the final cleaned content)
              content: content && content.trim() ? content : updated[lastAssistantIndex].content,
            };
            console.log('✅ Marked assistant message as final', content ? 'with updated content' : '');
            return updated;
          } else {
            // No partial message found - create a new final message
            console.log('⚠️ No partial assistant message found, creating new final message');
            if (content && content.trim()) {
              return [
                ...prev,
                {
                  id: `assistant-final-${Date.now()}`,
                  role: 'assistant' as const,
                  content,
                  type: 'final' as const,
                  timestamp: Date.now(),
                },
              ];
            }
          }
          return prev;
        });
        break;

      case 'tts_chunk':
        if (ttsWorkletNodeRef.current && content) {
          const int16Data = base64ToInt16Array(content);
          console.log(`🔊 Received TTS chunk: ${int16Data.length} samples (${(int16Data.length / 24000).toFixed(3)}s)`);
          ttsWorkletNodeRef.current.port.postMessage(int16Data);
        } else {
          console.warn('⚠️ Received TTS chunk but worklet not ready or no content');
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

  const editMessage = useCallback((messageId: string, newContent: string) => {
    // Update the message locally
    setMessages((prev) => {
      const messageIndex = prev.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return prev;

      const updated = [...prev];
      updated[messageIndex] = {
        ...updated[messageIndex],
        content: newContent,
      };

      // Remove all assistant messages after this user message
      const assistantMessagesToRemove = updated.slice(messageIndex + 1).filter((m) => m.role === 'assistant');
      const filteredMessages = updated.filter((m, idx) => {
        if (idx <= messageIndex) return true;
        return m.role !== 'assistant';
      });

      return filteredMessages;
    });

    // Send the corrected message to the server
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'edit_user_message',
          content: newContent,
        }),
      );
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
    editMessage,
    isTTSPlaying,
  };
}
