import { AssistantMode, FileAttachment, Message, QuizQuestion, Flashcard } from '../types/assistant';

export interface StreamChatParams {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    attachments?: Array<{ mimeType: string; data: string; name: string }>;
  }>;
  systemInstruction?: string;
  attachments?: Array<{ mimeType: string; data: string; name: string }>;
  temperature?: number;
  mode?: AssistantMode;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onError: (errorMsg: string) => void;
  onDone: () => void;
}

export const geminiService = {
  /**
   * Stream a chat response using Server-Sent Events from the backend
   */
  async streamChat({
    messages,
    systemInstruction,
    attachments,
    temperature = 0.7,
    mode = 'general',
    signal,
    onChunk,
    onError,
    onDone,
  }: StreamChatParams): Promise<void> {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          systemInstruction,
          attachments,
          temperature,
          mode,
        }),
        signal,
      });

      if (!response.ok) {
        let errMessage = `Server returned HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {
          // ignore
        }
        onError(errMessage);
        onDone();
        return;
      }

      if (!response.body) {
        onError('ReadableStream not supported by this browser.');
        onDone();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              onError(parsed.error);
            } else if (parsed.text) {
              onChunk(parsed.text);
            }
          } catch {
            // Raw text fallback
            if (dataStr) onChunk(dataStr);
          }
        }
      }

      onDone();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted the stream
        onDone();
        return;
      }
      onError(err?.message || 'Network connection failed. Please check your internet connection.');
      onDone();
    }
  },

  /**
   * Generate structured study quizzes, flashcards, or notes
   */
  async generateStudyContent({
    topic,
    difficulty = 'Medium',
    type = 'quiz',
    language = 'English',
    count = 5,
  }: {
    topic: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
    type: 'quiz' | 'flashcards' | 'notes';
    language?: string;
    count?: number;
  }): Promise<{ items?: any[]; notes?: string }> {
    const response = await fetch('/api/study/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, difficulty, type, language, count }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate study materials.');
    }

    return response.json();
  },

  /**
   * Transcribe recorded audio file
   */
  async transcribeAudio(audioData: string, mimeType: string, languagePrompt?: string): Promise<string> {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioData, mimeType, languagePrompt }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Transcription failed.');
    }

    const data = await response.json();
    return data.text || '';
  },
};
