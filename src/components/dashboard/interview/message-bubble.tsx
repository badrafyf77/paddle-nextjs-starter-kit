'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, User, Edit2, Check, X } from 'lucide-react';
import type { Message } from '@/lib/interview.types';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
}

export function MessageBubble({ message, onEdit }: MessageBubbleProps) {
  const isAI = message.role === 'assistant';
  const isPartial = message.type === 'partial';
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const handleSaveEdit = () => {
    if (editedContent.trim() && editedContent !== message.content && onEdit) {
      onEdit(message.id, editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {/* Avatar */}
      {isAI && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} max-w-[80%]`}>
        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-2.5 ${
            isAI ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
          } ${isPartial ? 'opacity-70' : 'opacity-100'}`}
        >
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                className="text-sm bg-background text-foreground"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>

              {/* Partial indicator */}
              {isPartial && (
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                  <div
                    className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Timestamp and Edit Button */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isAI && !isPartial && onEdit && !isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {!isAI && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}
