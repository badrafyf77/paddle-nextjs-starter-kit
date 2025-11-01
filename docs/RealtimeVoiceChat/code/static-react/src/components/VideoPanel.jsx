import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import AIAvatar from './AIAvatar';

function VideoPanel({ candidateName, stream, isRecording, error }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Video Feed */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            {error ? (
              <>
                <div className="text-6xl mb-4">📷</div>
                <p className="text-white text-lg">Camera unavailable</p>
                <p className="text-gray-400 text-sm mt-2">{error.message}</p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">👤</div>
                <p className="text-white text-lg">Waiting for camera...</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Candidate Name Overlay - Bottom Left */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg"
      >
        <p className="text-white font-medium text-sm">{candidateName}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-300 text-xs">{isRecording ? 'Recording' : 'Not recording'}</span>
        </div>
      </motion.div>

      {/* AI Avatar - Bottom Right */}
      <AIAvatar isActive={isRecording} />

      {/* Recording Indicator - Top Right */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-6 right-6 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm px-3 py-2 rounded-full"
        >
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="text-white text-xs font-medium">REC</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export default VideoPanel;
