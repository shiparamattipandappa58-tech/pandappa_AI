import React, { useState } from 'react';
import { Languages, ArrowRightLeft, Sparkles, Copy, Check, Volume2, RefreshCw } from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { geminiService } from '../services/geminiService';
import { voiceService } from '../services/voiceService';

interface TranslationModeViewProps {
  onBackToChat: () => void;
  onSendToChat: (prompt: string) => void;
}

export const TranslationModeView: React.FC<TranslationModeViewProps> = ({
  onBackToChat,
  onSendToChat,
}) => {
  const [sourceLang, setSourceLang] = useState<'English' | 'Kannada' | 'Hindi' | 'Auto'>('English');
  const [targetLang, setTargetLang] = useState<'Kannada' | 'English' | 'Hindi'>('Kannada');
  const [style, setStyle] = useState<'Natural' | 'Formal' | 'Conversational'>('Natural');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSwap = () => {
    if (sourceLang !== 'Auto') {
      const temp = sourceLang;
      setSourceLang(targetLang as any);
      setTargetLang(temp as any);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please enter text to translate.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setOutputText('');

    const prompt = `Translate the following text accurately and naturally.
Source Language: ${sourceLang}
Target Language: ${targetLang}
Style / Register: ${style}
Source Text:
"""
${inputText}
"""

Instructions:
1. Provide the direct, idiomatic translation in ${targetLang}.
2. If translating to or from Kannada (ಕನ್ನಡ), ensure grammatical agreement and natural phrasing.
3. If relevant, include a brief Pronunciation/Transliteration guide in Latin script below the translation.`;

    const systemInstruction = `You are PANDAPPA AI Translation Specialist.
You have native-level fluency in Kannada (ಕನ್ನಡ), English, and Hindi (हिन्दी).
Translate meaning and context accurately rather than literal word-for-word replacement.`;

    let accumulated = '';
    await geminiService.streamChat({
      messages: [{ role: 'user', content: prompt }],
      systemInstruction,
      mode: 'translator',
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

  const handleSpeak = () => {
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Translation Assistant</h2>
              <span className="text-xs text-slate-400 font-medium">· PANDAPPA AI</span>
            </div>
            <p className="text-xs text-slate-400">
              High-precision Kannada (ಕನ್ನಡ), English, and Hindi linguistic translations
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

      {/* Language Selector Bar */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as any)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value="English">English</option>
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Auto">Auto Detect</option>
            </select>

            <button
              onClick={handleSwap}
              disabled={sourceLang === 'Auto'}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-30 transition"
              title="Swap languages"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>

            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as any)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-cyan-300 font-semibold outline-none focus:border-cyan-500"
            >
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tone:</span>
            {(['Natural', 'Formal', 'Conversational'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  style === s ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input Text */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Text to Translate:
          </label>
          <textarea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste text in English, Kannada, or Hindi..."
            className="w-full rounded-xl border border-slate-700/70 bg-slate-950 p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleTranslate}
            disabled={isProcessing || !inputText.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Translate to {targetLang}</span>
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
            <h3 className="font-bold text-white text-sm">PANDAPPA AI Translation</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeak}
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
                onClick={() => onSendToChat(`Translate follow-up:\n\n${outputText}`)}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
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
