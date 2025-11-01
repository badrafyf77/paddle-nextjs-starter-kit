'use client';

import type { Message } from '@/lib/interview.types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAI = message.role === 'assistant';
  const isPartial = message.type === 'partial';

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
      <div className={`max-w-[80%] ${isAI ? 'order-1' : 'order-2'}`}>
        {/* Sender Name */}
        <div className={`text-xs text-gray-500 mb-1 ${isAI ? 'text-left' : 'text-right'}`}>
          {isAI ? '🤖 AI Interviewer' : '👤 You'}
        </div>

        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isAI ? 'bg-gray-100 text-gray-900 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'
          } ${isPartial ? 'opacity-70' : 'opacity-100'}`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

          {/* Partial indicator */}
          {isPartial && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse delay-150" />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-400 mt-1 ${isAI ? 'text-left' : 'text-right'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
