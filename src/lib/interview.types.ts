// Types for Interview Preparation Feature

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'partial' | 'final';
  timestamp: number;
  sentence_id?: number;
}

export interface WebSocketMessage {
  type: string;
  content?: string;
  sentence_id?: number;
  speed?: number;
  status?: string;
  message?: string;
}
