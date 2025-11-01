// Interview Server Configuration
// Update this with your AWS EC2 instance details

export const INTERVIEW_CONFIG = {
  // Default server URL - users can override this in the UI
  DEFAULT_SERVER_URL: process.env.NEXT_PUBLIC_INTERVIEW_SERVER_URL || 'ws://localhost:8000',

  // Audio settings
  AUDIO: {
    SAMPLE_RATE: 16000,
    ECHO_CANCELLATION: true,
    NOISE_SUPPRESSION: true,
    AUTO_GAIN_CONTROL: true,
  },

  // Video settings
  VIDEO: {
    WIDTH: 1280,
    HEIGHT: 720,
    FACING_MODE: 'user',
  },

  // WebSocket settings
  WEBSOCKET: {
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 2000,
  },
};
