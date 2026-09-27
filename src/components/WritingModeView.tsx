import React, { useState } from 'react';
import { PenTool, Sparkles, Copy, Check, Volume2, ArrowRight, RefreshCw, Wand2 } from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { geminiService } from '../services/geminiService';
import { voiceService } from '../services/voiceService';

interface WritingModeViewProps {
  onBackToChat: () => void;
  onSendToChat: (prompt: string) => void;
  defaultLanguage?: string;
}

export const WritingModeView: React.FC<WritingModeViewProps> = ({
  onBackToChat,
  onSendToChat,
  defaultLanguage = 'English',
}) => {
  const [taskType, setTaskType] = useState<'draft' | 'rewrite' | 'grammar' | 'expand' | 'shorten'>('draft');
  const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Academic' | 'Creative' | 'Concise'>('Professional');
  const [language, setLanguage] = useState(defaultLanguage === 'Kannada' ? 'Kannada' : 'English');
  const [inputText, setInputText] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setErrorMessage(taskType === 'draft' ? 'Please provide a topic or prompt to draft.' : 'Please enter the text to rewrite.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setOutputText('');

    let prompt = '';
    if (taskType === 'draft') {
      prompt = `Draft a high-quality piece of writing based on: "${inputText}".
Tone: ${tone}.
Language: ${language}.
${customInstructions ? `Additional user instructions: ${customInstructions}` : ''}
Provide engaging, well-structured, polished prose.`;
    } else if (taskType === 'rewrite') {
      prompt = `Rewrite and elevate the following text.
Tone: ${tone}.
Target Language: ${language}.
Original Text:
"""
${inputText}
"""
${customInstructions ? `Additional instructions: ${customInstructions}` : ''}
Improve flow, vocabulary, and impact while maintaining core meaning.`;
    } else if (taskType === 'grammar') {
      prompt = `Proofread, correct grammar, punctuation, and clarify the following text:
"""
${inputText}
"""
Target Language: ${language}.
Provide the corrected text first, followed by a brief bulleted list of improvements made.`;
    } else if (taskType === 'expand') {
      prompt = `Expand on the following concepts with richer depth, supporting points, and elaboration:
"""
${inputText}
"""
Tone: ${tone}.
Language: ${language}.`;
    } else if (taskType === 'shorten') {
      prompt = `Condense and tighten the following text to make it punchy and concise without losing vital information:
"""
${inputText}
"""
Language: ${language}.`;
    }

    const systemInstruction = `You are PANDAPPA AI Writing and Editing Specialist.
You provide masterful writing, rewriting, copy-editing, and creative drafting in English, Kannada (ಕನ್ನಡ), and Hindi.
Deliver clean, impactful, ready-to-publish content.`;

    let accumulated = '';
    await geminiService.streamChat({
      messages: [{ role: 'user', content: prompt }],
      systemInstruction,
      mode: 'writer',
      onChunk: (chunk) => {
        accumulated += chunk;
        setOutputText(accumulated);
      },
      onError: (err) => {
        setErrorMessage(err);
      },
      onDone: () => {
        setIsProcessing(false);
      },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      voiceService.speak({
        text: outputText,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-950 p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/30">
            <PenTool className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Writing & Rewriting Assistant</h2>
              <span className="text-xs text-slate-400 font-medium">· PANDAPPA AI</span>
            </div>
            <p className="text-xs text-slate-400">
              Draft articles, rewrite tone, proofread grammar, or expand ideas in English & Kannada
            </p>
          </div>
        </div>

        <button
          onClick={onBackToChat}
          className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
        >
          Back to Chat
        </button>
      </div>

      {/* Task & Tone Config */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-4">
        {/* Task Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'draft', label: 'Draft New', icon: Wand2 },
            { id: 'rewrite', label: 'Rewrite & Polish', icon: Sparkles },
            { id: 'grammar', label: 'Fix Grammar', icon: Check },
            { id: 'expand', label: 'Expand Depth', icon: ArrowRight },
            { id: 'shorten', label: 'Make Concise', icon: ArrowRight },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTaskType(t.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  taskType === t.id
                    ? 'bg-violet-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tone & Language Selectors */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Tone & Voice</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as any)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="Professional">Professional & Polished</option>
              <option value="Friendly">Friendly & Approachable</option>
              <option value="Academic">Academic & Scholarly</option>
              <option value="Creative">Creative & Engaging</option>
              <option value="Concise">Crisp & Concise</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="English">English</option>
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Specific Instructions (Optional)</label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Include bulleted takeaways, use metaphors..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Input Textarea */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            {taskType === 'draft' ? 'Topic, outline, or thesis to draft:' : 'Source text to process:'}
          </label>
          <textarea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              taskType === 'draft'
                ? 'e.g. Write an introductory article about renewable solar energy in India...'
                : 'Paste the original text you want PANDAPPA AI to rewrite, fix, or expand...'
            }
            className="w-full rounded-xl border border-slate-700/70 bg-slate-950 p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleGenerate}
            disabled={isProcessing || !inputText.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:from-violet-400 hover:to-indigo-500 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Generating Prose...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Content</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Output Results */}
      {outputText && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm">PANDAPPA AI Result</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSpeak}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => onSendToChat(`Here is the text I generated in Writing Mode:\n\n${outputText}`)}
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
              >
                Continue in Chat →
              </button>
            </div>
          </div>
          <MarkdownView content={outputText} />
        </div>
      )}
    </div>
  );
};
