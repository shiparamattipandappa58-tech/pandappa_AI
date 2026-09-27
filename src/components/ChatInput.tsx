import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Mic,
  MicOff,
  Paperclip,
  Radio,
  Languages,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { FileAttachment } from '../types/assistant';
import { voiceService } from '../services/voiceService';
import { FileAttachmentPreview } from './FileAttachmentPreview';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: FileAttachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  onOpenVoiceMode: () => void;
  disabled?: boolean;
  preferredLanguage?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  onOpenVoiceMode,
  disabled = false,
  preferredLanguage = 'English',
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState(
    preferredLanguage === 'Kannada' ? 'kn-IN' : preferredLanguage === 'Hindi' ? 'hi-IN' : 'en-US'
  );
  const [micError, setMicError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Clean up any ongoing microphone capture on unmount
  useEffect(() => {
    return () => {
      voiceService.stopListening();
    };
  }, []);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isStreaming || disabled) return;

    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    }

    onSendMessage(text.trim(), attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleVoiceInput = () => {
    setMicError(null);

    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      return;
    }

    voiceService.startListening({
      language: speechLanguage,
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript, isFinal) => {
        setText(transcript);
      },
      onError: (errorMsg) => {
        setIsListening(false);
        setMicError(errorMsg);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Limit size to 25MB
      if (file.size > 25 * 1024 * 1024) {
        setMicError(`File "${file.name}" exceeds the 25MB limit.`);
        continue;
      }

      const reader = new FileReader();
      const readPromise = new Promise<void>((resolve) => {
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const isImage = file.type.startsWith('image/');

          newAttachments.push({
            id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            data: result,
            previewUrl: isImage ? result : undefined,
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });

      await readPromise;
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleApplyPreset = (presetPrompt: string) => {
    setText((prev) => (prev ? `${prev}\n${presetPrompt}` : presetPrompt));
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-slate-800/80 bg-slate-950/80 p-3 md:p-4 backdrop-blur-md">
      <div className="mx-auto max-w-4xl space-y-2">
        {/* Mic Error Notice */}
        {micError && (
          <div className="flex items-center justify-between rounded-xl border border-rose-800/80 bg-rose-950/40 p-2.5 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{micError}</span>
            </div>
            <button
              onClick={() => setMicError(null)}
              className="text-xs text-rose-400 hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
            <FileAttachmentPreview
              attachments={attachments}
              onRemove={handleRemoveAttachment}
              onApplyPreset={handleApplyPreset}
            />
          </div>
        )}

        {/* Listening Indicator Bar */}
        {isListening && (
          <div className="flex items-center justify-between rounded-xl border border-cyan-500/50 bg-cyan-950/30 px-3.5 py-1.5 text-xs text-cyan-300 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
              </span>
              <span className="font-semibold">PANDAPPA AI is listening...</span>
              <span className="text-[11px] text-cyan-400/80">
                ({speechLanguage.startsWith('kn') ? 'Kannada' : speechLanguage.startsWith('hi') ? 'Hindi' : 'English'})
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              className="font-bold text-xs text-cyan-200 hover:text-white"
            >
              Done Speaking
            </button>
          </div>
        )}

        {/* Main Input Box */}
        <div className="relative flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-lg focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to your speech...'
                : 'Message PANDAPPA AI... (Enter to send, Shift+Enter for newline)'
            }
            disabled={disabled}
            className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-[180px]"
          />

          {/* Bottom Action Controls */}
          <div className="flex items-center justify-between border-t border-slate-800/60 px-3 py-2">
            {/* Left Controls: File upload & Speech language */}
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp,.csv,.json,.ts,.js,.py"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                title="Attach Document or Image (PDF, TXT, DOC, PNG, JPG)"
              >
                <Paperclip className="h-4 w-4" />
                <span className="text-[11px] font-medium hidden sm:inline">Attach</span>
              </button>

              {/* Language Selector for Speech */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-xs text-slate-300">
                <Languages className="h-3 w-3 text-slate-400" />
                <select
                  value={speechLanguage}
                  onChange={(e) => setSpeechLanguage(e.target.value)}
                  className="bg-transparent text-[11px] font-medium text-slate-300 outline-none cursor-pointer"
                  title="Speech Recognition Language"
                >
                  <option value="en-US" className="bg-slate-900">EN</option>
                  <option value="kn-IN" className="bg-slate-900">ಕನ್ನಡ (KN)</option>
                  <option value="hi-IN" className="bg-slate-900">हिन्दी (HI)</option>
                </select>
              </div>

              {/* Full Voice Mode Launcher Button */}
              <button
                type="button"
                onClick={onOpenVoiceMode}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-950/60 transition"
                title="Open Fullscreen Voice Assistant Mode"
              >
                <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">Voice Mode</span>
              </button>
            </div>

            {/* Right Controls: Mic & Send/Stop */}
            <div className="flex items-center gap-1.5">
              {/* Mic Input Button */}
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                className={`rounded-xl p-2 transition ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50 animate-pulse'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title={isListening ? 'Stop voice input' : 'Voice input (Speech-to-Text)'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Send or Stop Button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-500 transition"
                  title="Stop generating"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={(!text.trim() && attachments.length === 0) || disabled}
                  className="flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-2.5 text-slate-950 shadow-md transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer footer */}
        <p className="text-center text-[10px] text-slate-500">
          PANDAPPA AI can assist with study, coding, and analysis. Always verify important academic or factual details.
        </p>
      </div>
    </div>
  );
};
