'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './message-bubble';
import { MessageSquare } from 'lucide-react';
import type { Message } from '@/lib/interview.types';

interface TranscriptPanelProps {
  messages: Message[];
}

export function TranscriptPanel({ messages }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);

  // Only auto-scroll on final messages, not partial updates
  useEffect(() => {
    if (!scrollRef.current || isUserScrolling) return;

    const finalMessages = messages.filter((m) => m.type === 'final');
    const hasNewFinalMessage = finalMessages.length > lastMessageCountRef.current;

    if (hasNewFinalMessage) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
      lastMessageCountRef.current = finalMessages.length;
    }
  }, [messages, isUserScrolling]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setIsUserScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages Container */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Conversation will appear here</p>
              <p className="text-xs mt-1">Start speaking to begin</p>
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>
    </div>
  );
}
