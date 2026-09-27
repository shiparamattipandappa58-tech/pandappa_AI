import React, { useRef, useEffect } from 'react';
import { Sparkles, GraduationCap, Code2, PenTool, Languages, FileText, ArrowRight } from 'lucide-react';
import { Message, AssistantMode } from '../types/assistant';
import { MessageItem } from './MessageItem';
import { PandappaLogo } from './PandappaLogo';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  onSendPresetMessage: (prompt: string) => void;
  onRegenerateMessage?: () => void;
  onEditMessage?: (id: string, content: string) => void;
  currentMode: AssistantMode;
  onOpenStudyModeView?: () => void;
  onOpenCodingModeView?: () => void;
  speechRate?: number;
  preferredVoice?: string;
  userName?: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  onSendPresetMessage,
  onRegenerateMessage,
  onEditMessage,
  currentMode,
  onOpenStudyModeView,
  onOpenCodingModeView,
  speechRate,
  preferredVoice,
  userName = 'Friend',
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const welcomeStarters = [
    {
      title: 'Study Assistant',
      desc: 'Create an interactive quiz on any topic',
      icon: GraduationCap,
      action: () => {
        if (onOpenStudyModeView) onOpenStudyModeView();
        else onSendPresetMessage('Create a 5-question study quiz on cell biology with explanations.');
      },
    },
    {
      title: 'Coding Assistant',
      desc: 'Write, debug, or explain algorithms',
      icon: Code2,
      action: () => {
        if (onOpenCodingModeView) onOpenCodingModeView();
        else onSendPresetMessage('Explain how the QuickSort algorithm works with Python code.');
      },
    },
    {
      title: 'Multilingual Kannada',
      desc: 'Ask or translate in Kannada (ಕನ್ನಡ)',
      icon: Languages,
      action: () =>
        onSendPresetMessage('ನಮಸ್ಕಾರ PANDAPPA AI! ಕನ್ನಡದಲ್ಲಿ ನನ್ನೊಂದಿಗೆ ಮಾತನಾಡಿ. ಇಂದಿನ ದಿನದ ವಿಶೇಷತೆ ಏನು?'),
    },
    {
      title: 'Analyze Documents',
      desc: 'Summarize PDFs and text files',
      icon: FileText,
      action: () =>
        onSendPresetMessage('How can I upload and analyze a PDF document or image with PANDAPPA AI?'),
    },
  ];

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
    >
      {messages.length === 0 ? (
        <div className="flex min-h-full flex-col items-center justify-center p-4 md:p-8 text-center max-w-2xl mx-auto">
          {/* Brand Visual Anchor */}
          <div className="mb-6 flex flex-col items-center">
            <PandappaLogo size="xl" showText={false} />
            <h2 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Hello{userName && userName !== 'Friend' ? `, ${userName}` : ''}! I'm PANDAPPA AI.
            </h2>
            <p className="mt-1.5 text-sm text-slate-400 max-w-md">
              How can I help you today? Ask questions, study concepts, solve coding problems, or talk to me by voice.
            </p>
          </div>

          {/* Quick Action Suggestion Cards */}
          <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 text-left pt-2">
            {welcomeStarters.map((starter, idx) => {
              const Icon = starter.icon;
              return (
                <button
                  key={idx}
                  onClick={starter.action}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 transition-all duration-200 hover:border-cyan-500/60 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-cyan-950/20"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/90 text-cyan-400 group-hover:bg-cyan-500/10 group-hover:text-cyan-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                  </div>
                  <div className="mt-3">
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-white">
                      {starter.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {starter.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Wake Word Hint Notice */}
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Say "Hey Pandappa" or click the microphone to start voice interaction</span>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl divide-y divide-slate-800/30">
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isMessageStreaming = isLastMessage && isStreaming && message.role === 'assistant';

            return (
              <MessageItem
                key={message.id}
                message={message}
                isStreaming={isMessageStreaming}
                onRegenerate={
                  isLastMessage && message.role === 'assistant' && !isStreaming
                    ? onRegenerateMessage
                    : undefined
                }
                onEdit={message.role === 'user' ? onEditMessage : undefined}
                speechRate={speechRate}
                preferredVoice={preferredVoice}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
