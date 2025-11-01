import { motion } from 'framer-motion';

function MessageBubble({ message }) {
  const isAI = message.role === 'assistant';
  const isPartial = message.type === 'partial';

  // Only animate final messages, not partial updates
  const animationProps = isPartial
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.2 },
      };

  return (
    <motion.div {...animationProps} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
      {/* Speaker Name */}
      <div className={`text-xs font-medium mb-1 ${isAI ? 'text-gray-600' : 'text-blue-600'}`}>
        {isAI ? 'Alex' : message.role === 'user' ? 'Aaron Wang' : 'You'}
      </div>

      {/* Message Bubble */}
      <div
        className={`
          max-w-[85%] px-4 py-3 rounded-2xl shadow-sm
          ${isAI ? 'bg-gray-100 text-gray-900 rounded-tl-sm' : 'bg-blue-500 text-white rounded-tr-sm'}
          ${isPartial ? 'opacity-70' : 'opacity-100'}
        `}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
          {isPartial && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="ml-1"
            >
              ✏️
            </motion.span>
          )}
        </p>
      </div>

      {/* Timestamp (optional) */}
      {!isPartial && (
        <div className="text-xs text-gray-400 mt-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}
    </motion.div>
  );
}

export default MessageBubble;
