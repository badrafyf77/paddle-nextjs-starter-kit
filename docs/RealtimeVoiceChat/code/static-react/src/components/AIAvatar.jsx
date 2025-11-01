import { motion } from 'framer-motion';

function AIAvatar({ isActive, name = 'Alex', size = 80 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: 'spring' }}
      className="absolute bottom-6 right-6"
    >
      <div className="relative">
        {/* Pulsing ring when active */}
        {isActive && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full bg-blue-400"
            style={{ width: size, height: size }}
          />
        )}

        {/* Avatar Circle */}
        <div
          className="relative rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden"
          style={{ width: size, height: size }}
        >
          {/* AI Icon/Image */}
          <div className="text-white text-2xl font-bold">🤖</div>
        </div>

        {/* Name Label */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full whitespace-nowrap">
          <span className="text-white text-xs font-medium">{name}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default AIAvatar;
