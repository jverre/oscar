// Chat related types
export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'assistant';
  status?: 'sending' | 'sent' | 'error';
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// User related types
export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

// UI related types
export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  error: string;
  warning: string;
  info: string;
}

// API related types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}