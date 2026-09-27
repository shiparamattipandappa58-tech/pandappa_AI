import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, Languages, Square, CheckCircle2 } from 'lucide-react';
import { voiceService, isTerminationCommand, VoiceMachineState } from '../services/voiceService';
import { geminiService } from '../services/geminiService';
import { UserSettings, Message } from '../types/assistant';

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  conversationHistory: Message[];
  onNewMessage: (userText: string, assistantText: string) => void;
  onUpdateSpeechRate?: (rate: number) => void;
  onSessionEnded?: (notice: string) => void;
}

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  settings,
  conversationHistory,
  onNewMessage,
  onUpdateSpeechRate,
  onSessionEnded,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceMachineState>('MIC_OFF');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [assistantResponse, setAssistantResponse] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speechSpeed, setSpeechSpeed] = useState<number>(settings.speechRate || 1.0);
  const [sessionTurnCount, setSessionTurnCount] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    settings.language === 'Kannada' ? 'kn-IN' : settings.language === 'Hindi' ? 'hi-IN' : 'en-US'
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionActiveRef = useRef<boolean>(false);
  const isTerminatedRef = useRef<boolean>(false);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Safe timer helper that registers and can be synchronously wiped
  const setTrackedTimeout = useCallback((fn: () => void, delayMs: number) => {
    if (!sessionActiveRef.current || isTerminatedRef.current) return null;
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, delayMs);
    timersRef.current.add(id);
    return id;
  }, []);

  const clearAllTrackedTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current.clear();
    voiceService.cancelAllVoiceTimers();
  }, []);

  /**
   * Complete, immediate termination of the voice session.
   * Cancels all audio, microphonics, listeners, and pending tasks.
   * Does NOT auto-restart microphone.
   */
  const terminateVoiceSession = useCallback((reason: string = 'Voice session ended.') => {
    if (isTerminatedRef.current) return;
    isTerminatedRef.current = true;
    sessionActiveRef.current = false;

    // 1. Immediately abort AI streaming request
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
    }

    // 2. Clear all queued timers immediately
    clearAllTrackedTimers();

    // 3. Completely shut down voice operations and tell service session is over
    voiceService.setSessionActive(false);
    voiceService.stopAllVoiceOperations();

    // 4. Update state machine: ENDING -> ENDED
    setVoiceState('ENDED');
    setAssistantResponse(reason);

    // 5. Return to normal chat mode after brief visual confirmation
    setTimeout(() => {
      onSessionEnded?.(reason);
      onClose();
    }, 1100);
  }, [clearAllTrackedTimers, onClose, onSessionEnded]);

  /**
   * Listen for user speech during an active voice session.
   */
  const startListeningTurn = useCallback(() => {
    if (!sessionActiveRef.current || isTerminatedRef.current) {
      voiceService.stopListening();
      return;
    }

    // Ensure audio playback is stopped before listening
    voiceService.stopSpeaking();
    setErrorMessage(null);
    setUserTranscript('');
    setVoiceState('LISTENING');

    voiceService.startListening({
      language: selectedLanguage,
      onStart: () => {
        if (!sessionActiveRef.current || isTerminatedRef.current) {
          voiceService.stopListening();
          setVoiceState('MIC_OFF');
          return;
        }
        setVoiceState('LISTENING');
      },
      onResult: (transcript: string, isFinal: boolean) => {
        if (!sessionActiveRef.current || isTerminatedRef.current) return;

        setUserTranscript(transcript);

        // PRIORITY CHECK: Is this a clear termination command?
        if (isTerminationCommand(transcript)) {
          terminateVoiceSession('Voice session ended.');
          return;
        }

        // If recognized final speech and not a stop command, handle question
        if (isFinal && transcript.trim().length > 1) {
          handleUserQuestion(transcript);
        }
      },
      onError: (err: string) => {
        if (!sessionActiveRef.current || isTerminatedRef.current) return;

        // On temporary silence or no-speech in active session, cleanly retry only if still active
        if (err.includes('No speech detected') || err.includes('no-speech')) {
          if (sessionActiveRef.current && !isTerminatedRef.current && voiceState === 'LISTENING') {
            setTrackedTimeout(() => {
              if (sessionActiveRef.current && !isTerminatedRef.current) {
                startListeningTurn();
              }
            }, 300);
          }
          return;
        }

        setErrorMessage(err);
      },
      onEnd: () => {
        // If session is still active and not currently processing or speaking, wait for next user question
        if (
          sessionActiveRef.current &&
          !isTerminatedRef.current &&
          voiceState === 'LISTENING'
        ) {
          setTrackedTimeout(() => {
            if (sessionActiveRef.current && !isTerminatedRef.current) {
              startListeningTurn();
            }
          }, 350);
        }
      },
    });
  }, [selectedLanguage, setTrackedTimeout, terminateVoiceSession, voiceState]);

  /**
   * Handle user question with Gemini, speak answer, and continue listening for next question.
   */
  const handleUserQuestion = useCallback(async (query: string) => {
    if (!sessionActiveRef.current || isTerminatedRef.current) return;

    // Double check termination command
    if (isTerminationCommand(query)) {
      terminateVoiceSession('Voice session ended.');
      return;
    }

    voiceService.stopListening();
    setVoiceState('THINKING');
    setAssistantResponse('');

    abortControllerRef.current = new AbortController();

    let fullReply = '';

    // Build recent conversation history
    const recentHistory = conversationHistory.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    recentHistory.push({ role: 'user', content: query });

    const isKannada = selectedLanguage.startsWith('kn');
    const isHindi = selectedLanguage.startsWith('hi');

    const systemInstruction = `You are PANDAPPA AI in an active Voice Session.
The user is speaking with you hands-free.
Provide concise, clear, natural spoken answers (1 to 3 short sentences unless explaining a complex question).
Avoid raw markdown formatting, code fences, or tables since your output is read aloud through voice synthesis.
Language: ${isKannada ? 'Kannada (ಕನ್ನಡ)' : isHindi ? 'Hindi (हिन्दी)' : 'English'}.
Maintain conversation context across multiple questions.`;

    await geminiService.streamChat({
      messages: recentHistory,
      systemInstruction,
      temperature: 0.7,
      signal: abortControllerRef.current.signal,
      onChunk: (chunk) => {
        if (!sessionActiveRef.current || isTerminatedRef.current) return;
        fullReply += chunk;
        setAssistantResponse(fullReply);
      },
      onError: (err) => {
        if (!sessionActiveRef.current || isTerminatedRef.current) return;
        setErrorMessage(err);
        setVoiceState('LISTENING');
        startListeningTurn();
      },
      onDone: () => {
        if (!sessionActiveRef.current || isTerminatedRef.current) return;

        if (!fullReply.trim()) {
          startListeningTurn();
          return;
        }

        // Commit turn to main conversation
        onNewMessage(query, fullReply);
        setSessionTurnCount((c) => c + 1);

        // Transition to Speaking
        setVoiceState('SPEAKING');

        // Speak response aloud
        voiceService.speak({
          text: fullReply,
          rate: speechSpeed,
          voiceName: settings.preferredVoice,
          onStart: () => {
            if (!sessionActiveRef.current || isTerminatedRef.current) {
              voiceService.stopSpeaking();
              return;
            }
            setVoiceState('SPEAKING');
          },
          onEnd: () => {
            // SESSION-BASED CONTINUATION:
            // Automatically continue listening for the next question only if session is active
            if (sessionActiveRef.current && !isTerminatedRef.current) {
              setTrackedTimeout(() => {
                if (sessionActiveRef.current && !isTerminatedRef.current) {
                  startListeningTurn();
                }
              }, 400);
            }
          },
          onError: () => {
            if (sessionActiveRef.current && !isTerminatedRef.current) {
              startListeningTurn();
            }
          },
        });
      },
    });
  }, [conversationHistory, onNewMessage, selectedLanguage, setTrackedTimeout, settings.preferredVoice, speechSpeed, startListeningTurn, terminateVoiceSession]);

  /**
   * Session Initialization:
   * When modal opens, start ONE voice session.
   * PANDAPPA AI greets: "Yes, I'm listening."
   * Then automatically begins listening for user questions.
   */
  useEffect(() => {
    if (isOpen) {
      sessionActiveRef.current = true;
      isTerminatedRef.current = false;
      voiceService.setSessionActive(true);
      setSessionTurnCount(0);
      setUserTranscript('');
      setErrorMessage(null);

      const isKannada = selectedLanguage.startsWith('kn');
      const isHindi = selectedLanguage.startsWith('hi');
      const initialGreeting = isKannada
        ? 'ಹೌದು, ನಾನು ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ.'
        : isHindi
        ? 'हाँ, मैं सुन रहा हूँ।'
        : "Yes, I'm listening.";

      setAssistantResponse(initialGreeting);
      setVoiceState('SPEAKING');

      // Speak initial greeting aloud
      voiceService.speak({
        text: initialGreeting,
        rate: speechSpeed,
        voiceName: settings.preferredVoice,
        onStart: () => {
          setVoiceState('SPEAKING');
        },
        onEnd: () => {
          if (sessionActiveRef.current && !isTerminatedRef.current) {
            startListeningTurn();
          }
        },
        onError: () => {
          if (sessionActiveRef.current && !isTerminatedRef.current) {
            startListeningTurn();
          }
        },
      });
    } else {
      sessionActiveRef.current = false;
      isTerminatedRef.current = true;
      clearAllTrackedTimers();
      voiceService.setSessionActive(false);
      voiceService.stopAllVoiceOperations();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setVoiceState('MIC_OFF');
    }

    return () => {
      sessionActiveRef.current = false;
      isTerminatedRef.current = true;
      clearAllTrackedTimers();
      voiceService.setSessionActive(false);
      voiceService.stopAllVoiceOperations();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearAllTrackedTimers, isOpen]);

  // Page backgrounding & tab visibility hook
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && sessionActiveRef.current) {
        terminateVoiceSession('Voice session ended due to backgrounding.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [terminateVoiceSession]);

  /**
   * Interruption handler:
   * If AI is speaking and user triggers stop, immediately cut off speech and end session.
   */
  const handleInterruptOrStop = () => {
    terminateVoiceSession('Voice session ended.');
  };

  const handleSpeedChange = (speed: number) => {
    setSpeechSpeed(speed);
    onUpdateSpeechRate?.(speed);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-slate-100 backdrop-blur-2xl">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 px-4 md:px-6 py-3.5 gap-3">
        {/* Brand & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black tracking-wider text-sm bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
              PANDAPPA AI
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              VOICE SESSION
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* 4-state visual indicator */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs shadow-inner">
            {voiceState === 'LISTENING' && (
              <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                </span>
                ● Listening
              </span>
            )}

            {voiceState === 'THINKING' && (
              <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse" />
                ● Thinking
              </span>
            )}

            {voiceState === 'SPEAKING' && (
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                ● Speaking
              </span>
            )}

            {(voiceState === 'ENDED' || voiceState === 'ENDING' || voiceState === 'MIC_OFF') && (
              <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                ● Voice session ended
              </span>
            )}
          </div>
        </div>

        {/* Controls & Termination */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs">
            <Languages className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                voiceService.stopListening();
                if (sessionActiveRef.current && !isTerminatedRef.current) {
                  setTrackedTimeout(() => startListeningTurn(), 300);
                }
              }}
              disabled={voiceState === 'ENDED'}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs disabled:opacity-50"
            >
              <option value="en-US" className="bg-slate-900">English</option>
              <option value="kn-IN" className="bg-slate-900">ಕನ್ನಡ (Kannada)</option>
              <option value="hi-IN" className="bg-slate-900">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Speech Speed Controls */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-300">
            <span className="text-slate-400 text-[11px]">Speed:</span>
            {[0.85, 1.0, 1.25].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                disabled={voiceState === 'ENDED'}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${
                  speechSpeed === s ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Immediate End Session Button */}
          <button
            onClick={() => terminateVoiceSession('Voice session ended.')}
            disabled={voiceState === 'ENDED'}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition shadow-sm"
            title="End voice session immediately"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>End Session</span>
          </button>

          <button
            onClick={() => terminateVoiceSession('Voice session ended.')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Central Visualizer & Conversation Area */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-6 text-center overflow-y-auto">
        {/* Animated Central Assistant Orb */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer glow aura */}
          <div
            className={`absolute h-60 w-60 rounded-full transition-all duration-700 pointer-events-none ${
              voiceState === 'LISTENING'
                ? 'bg-cyan-500/25 scale-125 animate-ping opacity-40'
                : voiceState === 'THINKING'
                ? 'bg-indigo-600/25 scale-115 animate-pulse'
                : voiceState === 'SPEAKING'
                ? 'bg-emerald-500/25 scale-125 animate-pulse'
                : 'bg-rose-500/10 scale-95 opacity-20'
            }`}
          />

          <div
            className={`absolute h-48 w-48 rounded-full border transition-all duration-500 pointer-events-none ${
              voiceState === 'LISTENING'
                ? 'border-cyan-400/50 scale-110 shadow-lg shadow-cyan-500/20'
                : voiceState === 'THINKING'
                ? 'border-indigo-400/50 scale-105 animate-spin'
                : voiceState === 'SPEAKING'
                ? 'border-emerald-400/60 scale-115 shadow-lg shadow-emerald-500/20'
                : 'border-slate-800'
            }`}
          />

          {/* Interactive Core Orb */}
          <button
            onClick={() => {
              if (voiceState === 'SPEAKING') {
                handleInterruptOrStop();
              } else if (voiceState === 'LISTENING') {
                terminateVoiceSession('Voice session ended.');
              } else if (voiceState === 'THINKING') {
                handleInterruptOrStop();
              }
            }}
            disabled={voiceState === 'ENDED'}
            aria-label="Voice Session Orb"
            className={`relative flex h-32 w-32 md:h-36 md:w-36 items-center justify-center rounded-full shadow-2xl transition-all duration-500 select-none cursor-pointer group ${
              voiceState === 'LISTENING'
                ? 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-cyan-500/40 scale-105 ring-4 ring-cyan-300/40'
                : voiceState === 'THINKING'
                ? 'bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700 shadow-indigo-500/40 ring-4 ring-indigo-300/40'
                : voiceState === 'SPEAKING'
                ? 'bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-600 shadow-emerald-500/40 ring-4 ring-emerald-300/40'
                : 'bg-gradient-to-br from-slate-800 via-rose-950 to-slate-900 ring-2 ring-rose-500/30'
            }`}
          >
            {voiceState === 'LISTENING' && (
              <div className="flex flex-col items-center">
                <Mic className="h-12 w-12 text-white animate-pulse" />
                <span className="text-[10px] font-bold text-white/90 mt-1 uppercase tracking-wider">Listening</span>
              </div>
            )}
            {voiceState === 'THINKING' && (
              <div className="flex flex-col items-center">
                <Sparkles className="h-11 w-11 text-white animate-spin" />
                <span className="text-[10px] font-bold text-white/90 mt-1 uppercase tracking-wider">Thinking</span>
              </div>
            )}
            {voiceState === 'SPEAKING' && (
              <div className="flex flex-col items-center">
                <Volume2 className="h-12 w-12 text-white animate-bounce" />
                <span className="text-[10px] font-bold text-white/90 mt-1 uppercase tracking-wider">Tap to Stop</span>
              </div>
            )}
            {(voiceState === 'ENDED' || voiceState === 'ENDING' || voiceState === 'MIC_OFF') && (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="h-11 w-11 text-rose-300" />
                <span className="text-[10px] font-bold text-rose-300 mt-1 uppercase tracking-wider">Session Ended</span>
              </div>
            )}
          </button>
        </div>

        {/* State Headline */}
        <div className="mb-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {voiceState === 'LISTENING' && "I'm listening. Ask anything..."}
            {voiceState === 'THINKING' && 'PANDAPPA AI is processing...'}
            {voiceState === 'SPEAKING' && 'PANDAPPA AI is speaking'}
            {(voiceState === 'ENDED' || voiceState === 'ENDING' || voiceState === 'MIC_OFF') && 'Voice session ended.'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {voiceState === 'ENDED' || voiceState === 'ENDING' || voiceState === 'MIC_OFF' ? (
              <span className="text-rose-400 font-medium">Microphone is OFF. Returning to chat...</span>
            ) : (
              <span>
                Session active · Ask multiple questions · Say <strong className="text-slate-300">"Stop"</strong>, <strong className="text-slate-300">"That's enough"</strong>, or <strong className="text-slate-300">"ಸಾಕು"</strong> to finish
              </span>
            )}
          </p>
        </div>

        {/* Live Transcripts Card */}
        <div className="max-w-xl w-full rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 md:p-5 shadow-inner text-left">
          {userTranscript && (
            <div className="mb-3 border-b border-slate-800/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                You:
              </span>
              <p className="text-sm text-slate-200 mt-1 font-medium leading-relaxed">
                {userTranscript}
              </p>
            </div>
          )}

          {assistantResponse && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                PANDAPPA AI:
              </span>
              <p className="text-sm text-slate-100 mt-1 leading-relaxed">
                {assistantResponse}
              </p>
            </div>
          )}

          {!userTranscript && !assistantResponse && (
            <div className="py-4 text-center">
              <p className="text-xs text-slate-500 italic">
                Active voice session started. Speak naturally to ask your question.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 rounded-lg border border-rose-800/60 bg-rose-950/40 p-2.5 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Session Info Chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
          <span className="rounded-md bg-slate-900 border border-slate-800 px-2 py-0.5">
            Questions in session: <strong className="text-slate-200">{sessionTurnCount}</strong>
          </span>
          <span className="rounded-md bg-slate-900 border border-slate-800 px-2 py-0.5">
            Voice Mode: <strong className="text-emerald-400">Session Controlled</strong>
          </span>
          <span className="rounded-md bg-slate-900 border border-slate-800 px-2 py-0.5">
            Microphone: <strong className={voiceState === 'LISTENING' ? 'text-cyan-400' : 'text-slate-400'}>
              {voiceState === 'LISTENING' ? 'Active' : 'OFF'}
            </strong>
          </span>
        </div>
      </div>

      {/* Bottom Bar Controls */}
      <div className="flex items-center justify-between border-t border-slate-800/80 px-4 md:px-6 py-3.5 bg-slate-950/80">
        <div className="flex items-center gap-2">
          {voiceState === 'SPEAKING' ? (
            <button
              onClick={handleInterruptOrStop}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Interrupt / Stop Speaking</span>
            </button>
          ) : voiceState === 'LISTENING' ? (
            <button
              onClick={() => terminateVoiceSession('Voice session ended.')}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <MicOff className="h-3.5 w-3.5 text-rose-400" />
              <span>Stop Listening</span>
            </button>
          ) : null}
        </div>

        {/* Large End Voice Session button */}
        <button
          onClick={() => terminateVoiceSession('Voice session ended.')}
          disabled={voiceState === 'ENDED'}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 md:px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:bg-rose-500 active:scale-95 transition"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          <span>Exit Voice Session</span>
        </button>
      </div>
    </div>
  );
};
