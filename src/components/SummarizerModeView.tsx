import React, { useState } from 'react';
import { FileText, Sparkles, Copy, Check, Volume2, ListChecks, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { geminiService } from '../services/geminiService';
import { voiceService } from '../services/voiceService';

interface SummarizerModeViewProps {
  onBackToChat: () => void;
  onSendToChat: (prompt: string) => void;
  defaultLanguage?: string;
}

export const SummarizerModeView: React.FC<SummarizerModeViewProps> = ({
  onBackToChat,
  onSendToChat,
  defaultLanguage = 'English',
}) => {
  const [summaryFormat, setSummaryFormat] = useState<'bullets' | 'tldr' | 'executive' | 'action_items'>('bullets');
  const [language, setLanguage] = useState(defaultLanguage === 'Kannada' ? 'Kannada' : 'English');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please enter or paste the text or document content you want to summarize.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setOutputText('');

    let prompt = '';
    if (summaryFormat === 'tldr') {
      prompt = `Provide a crisp, one-to-two sentence TL;DR distillation of the following text:
"""
${inputText}
"""
Language: ${language}.`;
    } else if (summaryFormat === 'executive') {
      prompt = `Create a professional Executive Summary with high-level background, primary conclusions, and strategic significance:
"""
${inputText}
"""
Language: ${language}.`;
    } else if (summaryFormat === 'action_items') {
      prompt = `Extract all concrete action items, responsibilities, decisions made, and deadlines from this text:
"""
${inputText}
"""
Language: ${language}.`;
    } else {
      prompt = `Summarize the following content into top key bullet points with bold subheadings:
"""
${inputText}
"""
Language: ${language}.`;
    }

    const systemInstruction = `You are PANDAPPA AI Summarization Specialist.
Provide razor-sharp, dense, information-rich summaries without fluff.
Ensure zero factual hallucination. Format using clear markdown headings and bullet points.`;

    let accumulated = '';
    await geminiService.streamChat({
      messages: [{ role: 'user', content: prompt }],
      systemInstruction,
      mode: 'summarizer',
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Summarization Assistant</h2>
              <span className="text-xs text-slate-400 font-medium">· PANDAPPA AI</span>
            </div>
            <p className="text-xs text-slate-400">
              Transform long texts, papers, and transcripts into high-yield summaries
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

      {/* Configuration */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-4">
        {/* Format Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'bullets', label: 'Key Bullets', icon: ListChecks },
            { id: 'tldr', label: 'One-Sentence TL;DR', icon: Sparkles },
            { id: 'executive', label: 'Executive Summary', icon: FileSpreadsheet },
            { id: 'action_items', label: 'Action Items & Decisions', icon: Check },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setSummaryFormat(f.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  summaryFormat === f.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Language Selection */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 font-medium">Summary Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 outline-none focus:border-amber-500"
          >
            <option value="English">English</option>
            <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
            <option value="Hindi">Hindi (हिन्दी)</option>
          </select>
        </div>

        {/* Input Textarea */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Source text or document transcript to condense:
          </label>
          <textarea
            rows={6}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your report, meeting notes, article, or lecture transcript here..."
            className="w-full rounded-xl border border-slate-700/70 bg-slate-950 p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSummarize}
            disabled={isProcessing || !inputText.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:from-amber-400 hover:to-orange-500 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Extracting Summary...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Summarize Content</span>
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
            <h3 className="font-bold text-white text-sm">PANDAPPA AI Summary</h3>
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
                onClick={() => onSendToChat(`Summarize follow up:\n\n${outputText}`)}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
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
