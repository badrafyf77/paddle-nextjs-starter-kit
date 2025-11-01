import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';

function TranscriptPanel({ messages }) {
  const scrollRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  // Only auto-scroll on final messages, not partial updates
  useEffect(() => {
    if (!scrollRef.current || isUserScrolling) return;

    const finalMessages = messages.filter((m) => m.type === 'final');
    const hasNewFinalMessage = finalMessages.length > lastMessageCountRef.current;

    if (hasNewFinalMessage) {
      // New final message - scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
      lastMessageCountRef.current = finalMessages.length;
    }
    // Don't scroll on partial message updates at all
  }, [messages, isUserScrolling]);

  // Track user scrolling
  const handleScroll = () => {
    if (!scrollRef.current) return;

    setIsUserScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Reset user scrolling flag after they stop scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Live Transcript</h2>
          <button
            onClick={() => window.location.reload()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 transcript-scroll"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full text-gray-400 text-sm"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <p>Conversation will appear here</p>
              </div>
            </motion.div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default TranscriptPanel;
