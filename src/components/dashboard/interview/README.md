# Interview Preparation Components

React components for the AI-powered interview practice feature.

## Components

### `interview-prep.tsx`

Main setup component with form to configure interview session.

- Collects user name, interview title, and server URL
- Validates inputs before starting
- Shows feature benefits and requirements

### `video-call.tsx`

Full-screen interview interface container.

- Manages WebSocket connection
- Handles webcam and audio capture
- Coordinates all child components
- Manages interview lifecycle

### `video-panel.tsx`

Displays webcam feed with overlays.

- Shows live video from user's camera
- Displays candidate name overlay
- Shows AI avatar
- Recording indicator
- Error states for camera issues

### `ai-avatar.tsx`

AI interviewer avatar component.

- Animated avatar icon
- Speaking indicator when AI is talking
- Positioned in bottom-right of video

### `transcript-panel.tsx`

Live transcript of conversation.

- Scrollable message list
- Auto-scroll on new messages
- User scroll detection
- Empty state

### `message-bubble.tsx`

Individual message component.

- User messages (blue, right-aligned)
- AI messages (gray, left-aligned)
- Partial message animation
- Timestamps

### `status-bar.tsx`

Control buttons and status display.

- Interview title display
- Connection status indicator
- Start/Stop/Reset/End buttons
- Responsive layout

## Usage

```tsx
import { InterviewPrep } from '@/components/dashboard/interview/interview-prep';

export default function InterviewPage() {
  return <InterviewPrep />;
}
```

## Props

### VideoCall

```typescript
interface VideoCallProps {
  candidateName: string; // User's name
  interviewTitle: string; // Interview title
  serverUrl: string; // WebSocket server URL
  onEnd: () => void; // Callback when interview ends
}
```

### VideoPanel

```typescript
interface VideoPanelProps {
  candidateName: string; // User's name for overlay
  stream: MediaStream | null; // Webcam stream
  isRecording: boolean; // Recording state
  error: Error | null; // Camera error
}
```

### TranscriptPanel

```typescript
interface TranscriptPanelProps {
  messages: Message[]; // Array of messages
}
```

### MessageBubble

```typescript
interface MessageBubbleProps {
  message: Message; // Message object
}
```

### StatusBar

```typescript
interface StatusBarProps {
  interviewTitle: string; // Interview title
  isConnected: boolean; // WebSocket connection state
  isRecording: boolean; // Recording state
  onStart: () => void; // Start callback
  onStop: () => void; // Stop callback
  onReset: () => void; // Reset callback
  onEnd: () => void; // End callback
}
```

### AIAvatar

```typescript
interface AIAvatarProps {
  isActive: boolean; // Speaking state
}
```

## Styling

All components use Tailwind CSS classes and follow the existing design system:

- Colors: gray-900, blue-600, red-500, green-500
- Spacing: Consistent with dashboard layout
- Typography: Same font family and sizes
- Animations: Smooth transitions and fades

## Dependencies

- React 19
- Next.js 15
- Tailwind CSS
- shadcn/ui components (Button, Card, Input, Label)
- Custom hooks (useWebSocket, useWebcam, useAudioCapture)

## State Management

Components use React hooks for state:

- `useState` for local state
- `useEffect` for side effects
- `useRef` for DOM references
- `useCallback` for memoized callbacks

## Error Handling

All components handle errors gracefully:

- Camera permission denied
- Microphone permission denied
- WebSocket connection failed
- Server unreachable
- Network errors

## Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Performance

- Optimized re-renders with React.memo (where needed)
- Efficient WebSocket message handling
- Audio worklets for low-latency processing
- Smooth animations with CSS transitions

## Testing

To test components:

1. Ensure voice chat server is running
2. Navigate to `/dashboard/interview`
3. Fill in the form
4. Click "Start Interview"
5. Grant permissions
6. Test all controls

## Troubleshooting

### Camera not working

- Check browser permissions
- Ensure HTTPS or localhost
- Verify no other app is using camera

### Audio not working

- Check microphone permissions
- Verify Audio Worklet files exist
- Check browser console for errors

### WebSocket connection failed

- Verify server URL is correct
- Check server is running
- Verify network connectivity

## Future Enhancements

- [ ] Recording save functionality
- [ ] Interview analytics
- [ ] Multiple AI personas
- [ ] Custom questions
- [ ] Feedback reports
