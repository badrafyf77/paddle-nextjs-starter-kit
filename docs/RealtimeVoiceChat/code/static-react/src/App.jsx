import { useState, useEffect } from 'react';
import VideoPanel from './components/VideoPanel';
import TranscriptPanel from './components/TranscriptPanel';
import StatusBar from './components/StatusBar';
import useWebSocket from './hooks/useWebSocket';
import useWebcam from './hooks/useWebcam';
import useAudioCapture from './hooks/useAudioCapture';

function App() {
  const [candidateName, setCandidateName] = useState('Aaron Wang');
  const [interviewTitle, setInterviewTitle] = useState('Developer Intern Interview');
  const [isRecording, setIsRecording] = useState(false);

  const { isConnected, messages, connect, disconnect, clearHistory, sendAudioData } = useWebSocket();

  const { stream: webcamStream, startWebcam, stopWebcam, error: webcamError } = useWebcam();

  const { startCapture, stopCapture, isCapturing } = useAudioCapture(sendAudioData);

  const handleStart = async () => {
    try {
      await connect();
      await startWebcam();
      await startCapture();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  };

  const handleStop = () => {
    disconnect();
    stopWebcam();
    stopCapture();
    setIsRecording(false);
  };

  const handleReset = () => {
    clearHistory();
  };

  return (
    <div className="w-screen h-screen bg-black flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video Panel */}
        <div className="flex-1 p-4">
          <VideoPanel
            candidateName={candidateName}
            stream={webcamStream}
            isRecording={isRecording}
            error={webcamError}
          />
        </div>

        {/* Right: Transcript Panel */}
        <div className="w-96 bg-white">
          <TranscriptPanel messages={messages} />
        </div>
      </div>

      {/* Bottom: Status Bar */}
      <StatusBar
        interviewTitle={interviewTitle}
        isConnected={isConnected}
        isRecording={isRecording}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
      />
    </div>
  );
}

export default App;
