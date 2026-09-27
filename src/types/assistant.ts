export type Role = 'user' | 'assistant';

export type AssistantMode =
  | 'general'
  | 'study'
  | 'coding'
  | 'writer'
  | 'summarizer'
  | 'translator'
  | 'explain'
  | 'brainstorm'
  | 'doc_analyzer'
  | 'image_analyzer'
  | 'math'
  | 'research';

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  mimeType: string;
  data: string; // base64
  previewUrl?: string;
  uploadProgress?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  errorMessage?: string;
  isSpoken?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  mode: AssistantMode;
}

export interface UserSettings {
  assistantName: string;
  userName: string;
  theme: 'dark' | 'light' | 'system';
  language: 'English' | 'Kannada' | 'Hindi' | 'Auto';
  responseLength: 'concise' | 'balanced' | 'comprehensive';
  speechRate: number;
  autoSpeak: boolean;
  preferredVoice: string;
  useAiTts: boolean;
  wakeWordEnabled: boolean;
  wakeWordSensitivity: 'low' | 'normal' | 'high';
  systemPromptExtra: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
  hint?: string;
}
