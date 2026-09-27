import React, { useState } from 'react';
import { Code2, Bug, Zap, ArrowRightLeft, FileCode, Check, Copy, Sparkles, Terminal, BookOpen } from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { geminiService } from '../services/geminiService';

interface CodingModeViewProps {
  onBackToChat: () => void;
  onSendToChat: (prompt: string) => void;
}

export const CodingModeView: React.FC<CodingModeViewProps> = ({ onBackToChat, onSendToChat }) => {
  const [language, setLanguage] = useState('python');
  const [targetLanguage, setTargetLanguage] = useState('javascript');
  const [task, setTask] = useState<'generate' | 'debug' | 'explain' | 'convert' | 'optimize'>('generate');
  const [inputCode, setInputCode] = useState('');
  const [instruction, setInstruction] = useState('');
  const [outputResult, setOutputResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const languages = [
    { id: 'python', name: 'Python' },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'c', name: 'C' },
    { id: 'cpp', name: 'C++' },
    { id: 'java', name: 'Java' },
    { id: 'html', name: 'HTML' },
    { id: 'css', name: 'CSS' },
    { id: 'sql', name: 'SQL' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' },
  ];

  const handleExecuteCodingTask = async () => {
    if (task === 'generate' && !instruction.trim()) {
      setErrorMsg('Please describe what code you want to generate.');
      return;
    }
    if (task !== 'generate' && !inputCode.trim()) {
      setErrorMsg('Please paste or write your code snippet.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setOutputResult('');

    let prompt = '';
    if (task === 'generate') {
      prompt = `Task: Generate production-quality ${language} code.
Requirements: ${instruction}
Please provide clean, modern, well-commented code followed by a step-by-step explanation of how it works.`;
    } else if (task === 'debug') {
      prompt = `Task: Debug and fix the following ${language} code.
Code:
\`\`\`${language}
${inputCode}
\`\`\`
${instruction ? `Problem or error reported: ${instruction}` : ''}
Please identify the bugs, explain the root cause, provide the corrected code, and summarize best practices.`;
    } else if (task === 'explain') {
      prompt = `Task: Explain this ${language} code in clear, step-by-step detail.
Code:
\`\`\`${language}
${inputCode}
\`\`\`
Break down the logic, time/space complexity, and edge cases.`;
    } else if (task === 'convert') {
      prompt = `Task: Convert the following ${language} code into idiomatic ${targetLanguage}.
Source code (${language}):
\`\`\`${language}
${inputCode}
\`\`\`
Provide the converted ${targetLanguage} code and note key syntax differences.`;
    } else if (task === 'optimize') {
      prompt = `Task: Optimize the performance, readability, and security of this ${language} code.
Code:
\`\`\`${language}
${inputCode}
\`\`\`
Explain the optimizations made and provide the refactored code.`;
    }

    const systemInstruction = `You are PANDAPPA AI Coding Assistant.
You specialize in writing pristine, bug-free, modern, secure code in C, C++, Java, Python, JavaScript, TypeScript, HTML, CSS, SQL, etc.
Always format code in standard markdown codeblocks with language names.
Provide step-by-step explanations, time complexity where relevant, and never invent syntax.`;

    let accumulated = '';
    await geminiService.streamChat({
      messages: [{ role: 'user', content: prompt }],
      systemInstruction,
      mode: 'coding',
      onChunk: (chunk) => {
        accumulated += chunk;
        setOutputResult(accumulated);
      },
      onError: (err) => {
        setErrorMsg(err);
      },
      onDone: () => {
        setIsProcessing(false);
      },
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-950 p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Coding Assistant</h2>
              <span className="text-xs text-slate-400 font-medium">· PANDAPPA AI</span>
            </div>
            <p className="text-xs text-slate-400">
              Debug, generate, optimize, and convert code with step-by-step explanations
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

      {/* Task Selector & Configuration */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-4">
        {/* Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setTask('generate')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              task === 'generate'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Code</span>
          </button>

          <button
            onClick={() => setTask('debug')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              task === 'debug'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Bug className="h-3.5 w-3.5" />
            <span>Debug & Fix</span>
          </button>

          <button
            onClick={() => setTask('explain')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              task === 'explain'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Explain Code</span>
          </button>

          <button
            onClick={() => setTask('convert')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              task === 'convert'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Convert Language</span>
          </button>

          <button
            onClick={() => setTask('optimize')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              task === 'optimize'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Optimize & Refactor</span>
          </button>
        </div>

        {/* Language Selection */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Programming Language:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 outline-none focus:border-emerald-500"
            >
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {task === 'convert' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Target Language:</span>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 outline-none focus:border-emerald-500"
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          {task === 'generate' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Describe the feature, algorithm, or script to generate:
              </label>
              <textarea
                rows={3}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g., Create an async function to parse CSV files and validate email addresses with unit tests..."
                className="w-full rounded-xl border border-slate-700/70 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Source Code:
                </label>
                <textarea
                  rows={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder={`// Paste your ${language} code here...`}
                  className="w-full rounded-xl border border-slate-700/70 bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {(task === 'debug' || task === 'optimize') && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Specific error or requirements (optional):
                  </label>
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="e.g., TypeError: Cannot read properties of undefined, or slow execution with large lists"
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleExecuteCodingTask}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Terminal className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing Code...</span>
                </>
              ) : (
                <>
                  <Code2 className="h-3.5 w-3.5" />
                  <span className="capitalize">{task} Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Output Results */}
      {outputResult && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">PANDAPPA AI Solution</h3>
            </div>
            <button
              onClick={() => onSendToChat(`Follow up on this coding task: ${instruction || inputCode.slice(0, 100)}`)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition"
            >
              Continue in Chat →
            </button>
          </div>
          <MarkdownView content={outputResult} />
        </div>
      )}
    </div>
  );
};
