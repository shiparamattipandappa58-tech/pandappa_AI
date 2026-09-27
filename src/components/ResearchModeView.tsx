import React, { useState } from 'react';
import { Compass, Sparkles, Copy, Check, Volume2, Search, BookOpen, Layers, RefreshCw } from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { geminiService } from '../services/geminiService';
import { voiceService } from '../services/voiceService';

interface ResearchModeViewProps {
  onBackToChat: () => void;
  onSendToChat: (prompt: string) => void;
  defaultLanguage?: string;
}

export const ResearchModeView: React.FC<ResearchModeViewProps> = ({
  onBackToChat,
  onSendToChat,
  defaultLanguage = 'English',
}) => {
  const [researchType, setResearchType] = useState<'deep_dive' | 'comparative' | 'fact_check' | 'literature_review'>('deep_dive');
  const [depth, setDepth] = useState<'Standard' | 'Advanced' | 'Rigorous'>('Advanced');
  const [language, setLanguage] = useState(defaultLanguage === 'Kannada' ? 'Kannada' : 'English');
  const [query, setQuery] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleResearch = async () => {
    if (!query.trim()) {
      setErrorMessage('Please enter a research inquiry or question.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setOutputText('');

    let prompt = '';
    if (researchType === 'deep_dive') {
      prompt = `Conduct a comprehensive academic research deep-dive on: "${query}".
Depth Level: ${depth}.
Language: ${language}.
Include:
1. Executive Summary & Foundational Definitions
2. Historical or Theoretical Context
3. Core Mechanisms, Principles, or Evidence
4. Contemporary Applications & Case Studies
5. Open Questions, Criticisms, or Limitations`;
    } else if (researchType === 'comparative') {
      prompt = `Perform a structured comparative research breakdown for: "${query}".
Depth: ${depth}.
Language: ${language}.
Provide a comparative framework, pros and cons, trade-offs, and clear evaluation metrics.`;
    } else if (researchType === 'fact_check') {
      prompt = `Investigate and fact-check this claim or phenomenon rigorously: "${query}".
Language: ${language}.
Provide evidence-based verification, context, consensus view, and identify any misconceptions.`;
    } else {
      prompt = `Synthesize a structured literature and concept review on: "${query}".
Depth: ${depth}.
Language: ${language}.
Highlight key methodologies, influential paradigms, and summary conclusions.`;
    }

    const systemInstruction = `You are PANDAPPA AI Research Assistant.
Provide objective, highly detailed, scholarly, and structured research synthesis.
Acknowledge uncertainties, avoid speculation, and cite consensus scientific and empirical principles.`;

    let accumulated = '';
    await geminiService.streamChat({
      messages: [{ role: 'user', content: prompt }],
      systemInstruction,
      mode: 'research',
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">AI Research Assistant</h2>
              <span className="text-xs text-slate-400 font-medium">· PANDAPPA AI</span>
            </div>
            <p className="text-xs text-slate-400">
              Rigorous multi-faceted research synthesis, fact-checking, and conceptual deep-dives
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
        {/* Research Type */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'deep_dive', label: 'Deep Dive Report', icon: BookOpen },
            { id: 'comparative', label: 'Comparative Matrix', icon: Layers },
            { id: 'fact_check', label: 'Fact Verification', icon: Check },
            { id: 'literature_review', label: 'Concept Review', icon: Search },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setResearchType(t.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  researchType === t.id
                    ? 'bg-indigo-500 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Depth & Language */}
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Rigor & Depth</label>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as any)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="Standard">Standard - Clear & Comprehensive</option>
              <option value="Advanced">Advanced - In-depth Academic Framework</option>
              <option value="Rigorous">Rigorous - Graduate / Technical Deep Dive</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="English">English</option>
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
            </select>
          </div>
        </div>

        {/* Input Inquiry */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Research Subject or Scientific Query:
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Quantum Computing vs Classical Cryptography, CRISPR gene editing ethics, Gravitational waves..."
            className="w-full rounded-xl border border-slate-700/70 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleResearch}
            disabled={isProcessing || !query.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:from-indigo-400 hover:to-cyan-500 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Conducting Synthesis...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Synthesize Research</span>
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
            <h3 className="font-bold text-white text-sm">PANDAPPA AI Research Synthesis</h3>
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
                onClick={() => onSendToChat(`Research follow up on "${query}":\n\n${outputText}`)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
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
