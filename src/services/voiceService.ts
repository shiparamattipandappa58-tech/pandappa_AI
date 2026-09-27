// Speech Recognition & Speech Synthesis Service for PANDAPPA AI
// Single source of truth voice state & strict lifecycle controller

// Type definitions for Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export type VoiceMachineState =
  | 'MIC_OFF'
  | 'MIC_ON'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'ENDING'
  | 'ENDED';

/**
 * Carefully evaluate if user input is intended as a voice session termination command,
 * while ensuring normal questions (e.g. "Stop the car?", "How do I stop a program?")
 * are NOT falsely interpreted as stop commands.
 */
export function isTerminationCommand(rawText: string): boolean {
  if (!rawText) return false;
  const text = rawText.trim().toLowerCase();

  // Clean punctuation but preserve words
  const clean = text
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Direct question check - if text is framed as an inquiry/question, it is NOT a session termination command
  const isQuestion =
    rawText.includes('?') ||
    /^(can you|could you|how|why|what|when|where|which|who|whom|whose|explain|tell me|is it|is there|are you|are there|does|do|did|should|would|will)\b/i.test(
      text
    ) ||
    /\b(how to stop|how do i stop|how can i stop|ways to stop|stop the\b|stop a\b|stop an\b|stop this\b|stop that\b|stop in\b|stop of\b|stop for\b|stop word|stop codon|bus stop|train stop|car stop|heart stop|stopping)\b/i.test(
      clean
    );

  if (isQuestion) {
    return false;
  }

  // 2. Exact match check against standard termination phrases
  const exactStopPhrases = new Set([
    'stop',
    'end',
    'end session',
    'stop session',
    'stop listening',
    'stop talking',
    'stop voice mode',
    'exit voice mode',
    'exit session',
    'exit voice',
    'exit',
    'quit',
    'cancel',
    'close',
    'close session',
    'finish',
    'finished',
    'goodbye',
    'bye',
    'bye bye',
    'enough',
    'thats enough',
    'that is enough',
    'thats all',
    'that is all',
    'im done',
    'i am done',
    'all done',
    'we are done',
    'thats enough for today',
    'that is enough for today',
    'okay thats enough',
    'ok thats enough',
    'im done for today',
    'i am done for today',
    'that will be all',
    'that will do',
    // Kannada commands
    'ಸಾಕು',
    'ಇವತ್ತಿಗೆ ಸಾಕು',
    'ಇಲ್ಲಿಗೆ ಮುಗಿಸೋಣ',
    'ಮುಗಿಸು',
    'ನಿಲ್ಲಿಸು',
    'ಮುಗಿದಿದೆ',
    'ಸಾಕು ಇವತ್ತಿಗೆ',
    'ನಿಲ್ಲು',
    'ಧನ್ಯವಾದಗಳು ಸಾಕು',
    'ಸಾಕು ಧನ್ಯವಾದ',
    'ಮುಕ್ತಾಯ',
  ]);

  if (exactStopPhrases.has(clean) || exactStopPhrases.has(text)) {
    return true;
  }

  // 3. Kannada phrase contains check (Kannada ASR might include inflection or particles)
  const kannadaStopPatterns = [
    'ಸಾಕು',
    'ಇವತ್ತಿಗೆ ಸಾಕು',
    'ಇಲ್ಲಿಗೆ ಮುಗಿಸೋಣ',
    'ಮುಗಿಸು',
    'ನಿಲ್ಲಿಸು',
    'ಮುಗಿದಿದೆ',
    'ಸಾಕು ಇವತ್ತಿಗೆ',
    'ನಿಲ್ಲು',
    'ಮುಕ್ತಾಯ',
  ];
  for (const kp of kannadaStopPatterns) {
    if (text.includes(kp)) {
      return true;
    }
  }

  // 4. Regex patterns for natural multi-word termination commands
  const terminationRegex =
    /^(please\s+|okay\s+|ok\s+|alright\s+|i\s+think\s+)?(that'?s\s+enough|that\s+is\s+enough|i'?m\s+done|i\s+am\s+done|stop\s+listening|stop\s+talking|end\s+session|exit\s+voice\s+mode|that'?s\s+all|that\s+is\s+all|we'?re\s+done)(\s+for\s+today|\s+for\s+now|\s+thank\s+you|\s+thanks)?$/i;

  if (terminationRegex.test(clean)) {
    return true;
  }

  // 5. Short one/two-word clear imperative stop phrases (e.g., "stop", "end", "stop please", "stop now", "enough")
  const imperativeStopRegex =
    /^(stop|end|finish|close|goodbye|bye|cancel|enough)(\s+(please|now|it|here|pandappa|assistant))?$/i;
  if (imperativeStopRegex.test(clean)) {
    return true;
  }

  return false;
}

export class VoiceService {
  private recognition: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  private machineState: VoiceMachineState = 'MIC_OFF';
  private timerRegistry: Set<ReturnType<typeof setTimeout>> = new Set();
  private isSessionActive: boolean = false;
  private stateChangeListeners: Set<(state: VoiceMachineState) => void> = new Set();

  constructor() {
    // Clean up all microphone resources on page unload or visibility hide
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.forceShutdown());
      window.addEventListener('beforeunload', () => this.forceShutdown());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // If page goes to background, stop any microphone capture immediately
          this.forceShutdown();
        }
      });
    }
  }

  /**
   * Subscribe to state machine transitions
   */
  public onStateChange(listener: (state: VoiceMachineState) => void): () => void {
    this.stateChangeListeners.add(listener);
    listener(this.machineState);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Set voice state with single-source-of-truth state machine validation
   */
  public setState(nextState: VoiceMachineState) {
    // Prevent contradictory transitions:
    // ENDED cannot automatically transition to LISTENING without explicit activation
    if (this.machineState === 'ENDED' && nextState === 'LISTENING') {
      console.warn('[PANDAPPA Voice] Prevented illegal state transition from ENDED to LISTENING');
      return;
    }

    if (this.machineState === nextState) return;

    this.machineState = nextState;
    this.stateChangeListeners.forEach((l) => l(nextState));
  }

  public getState(): VoiceMachineState {
    return this.machineState;
  }

  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public isSpeechSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  /**
   * Register a timer so it can be completely cancelled upon session end or stop command
   */
  public registerTimer(timerId: ReturnType<typeof setTimeout>): ReturnType<typeof setTimeout> {
    this.timerRegistry.add(timerId);
    return timerId;
  }

  /**
   * Cancel and clear all pending voice timers
   */
  public cancelAllVoiceTimers() {
    this.timerRegistry.forEach((id) => clearTimeout(id));
    this.timerRegistry.clear();
  }

  /**
   * Explicitly set session active flag
   */
  public setSessionActive(active: boolean) {
    this.isSessionActive = active;
    if (!active) {
      this.cancelAllVoiceTimers();
      this.stopListening();
      this.setState('MIC_OFF');
    }
  }

  public getSessionActive(): boolean {
    return this.isSessionActive;
  }

  /**
   * Start speech recognition for an explicit user-initiated turn or active session.
   * NEVER runs as an unconstrained background loop.
   */
  public startListening({
    language = 'en-US',
    onResult,
    onError,
    onStart,
    onEnd,
  }: {
    language?: string;
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (errorMsg: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
  }) {
    if (!this.isSpeechRecognitionSupported()) {
      onError('Speech recognition is not supported in this browser. You can type your message.');
      this.setState('MIC_OFF');
      return;
    }

    // Clean up any existing recognition first
    this.stopListening();

    try {
      const win = window as unknown as IWindow;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = language;

      this.setState('MIC_ON');

      this.recognition.onstart = () => {
        this.setState('LISTENING');
        onStart?.();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const fullText = (finalTranscript || interimTranscript).trim();
        if (fullText) {
          onResult(fullText, !!finalTranscript);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let msg = 'Microphone error.';
        if (event.error === 'not-allowed') {
          msg = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
          this.setSessionActive(false);
          this.setState('MIC_OFF');
        } else if (event.error === 'no-speech') {
          msg = 'No speech detected.';
        } else if (event.error === 'network') {
          msg = 'Network error occurred during speech recognition.';
        }
        onError(msg);
      };

      this.recognition.onend = () => {
        // Only trigger onEnd callback; do NOT automatically restart here!
        onEnd?.();
      };

      this.recognition.start();
    } catch (err: any) {
      this.setState('MIC_OFF');
      onError(err?.message || 'Failed to start microphone recognition.');
    }
  }

  /**
   * Stop speech recognition, clear all listeners, abort active session.
   */
  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    if (this.machineState === 'LISTENING' || this.machineState === 'MIC_ON') {
      this.setState('MIC_OFF');
    }
  }

  /**
   * Stop speech synthesis & audio playback
   */
  public stopSpeaking() {
    if (this.isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
    if (this.machineState === 'SPEAKING') {
      this.setState(this.isSessionActive ? 'MIC_ON' : 'MIC_OFF');
    }
  }

  /**
   * Completely shut down all audio capture, speech recognition,
   * speech synthesis, and ongoing playback immediately.
   */
  public stopAllVoiceOperations() {
    this.cancelAllVoiceTimers();
    this.stopListening();
    this.stopSpeaking();
    this.setState('MIC_OFF');
  }

  /**
   * Forced emergency shutdown on page hide, backgrounding, or session close
   */
  public forceShutdown() {
    this.isSessionActive = false;
    this.cancelAllVoiceTimers();
    this.stopListening();
    this.stopSpeaking();
    this.setState('MIC_OFF');
  }

  public isSpeaking(): boolean {
    if (this.isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
      return true;
    }
    return !!(this.currentAudio && !this.currentAudio.paused);
  }

  /**
   * Browser SpeechSynthesis TTS
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSpeechSynthesisSupported()) return [];
    return window.speechSynthesis.getVoices();
  }

  public speak({
    text,
    rate = 1.0,
    pitch = 1.0,
    voiceName,
    onStart,
    onEnd,
    onError,
  }: {
    text: string;
    rate?: number;
    pitch?: number;
    voiceName?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }) {
    if (!this.isSpeechSynthesisSupported()) {
      onError?.('Text-to-speech is not supported on this browser.');
      return;
    }

    this.stopSpeaking();

    // Clean text of markdown formatting symbols before speaking
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/```[\s\S]*?```/g, 'Code snippet omitted for speech.')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voices = this.getVoices();
    if (voiceName && voices.length > 0) {
      const match = voices.find((v) => v.name === voiceName);
      if (match) utterance.voice = match;
    } else if (voices.length > 0) {
      const preferred =
        voices.find((v) => v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google')) ||
        voices[0];
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      this.setState('SPEAKING');
      onStart?.();
    };

    utterance.onend = () => {
      if (this.machineState === 'SPEAKING') {
        this.setState(this.isSessionActive ? 'MIC_ON' : 'MIC_OFF');
      }
      onEnd?.();
    };

    utterance.onerror = (e) => {
      if (this.machineState === 'SPEAKING') {
        this.setState(this.isSessionActive ? 'MIC_ON' : 'MIC_OFF');
      }
      onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Check microphone permission status passively without prompting user
   */
  public async getMicrophonePermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return status.state;
      }
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  /**
   * Request microphone permission explicitly once
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close tracks immediately after testing
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Detect if app is hosted inside native Android WebView with AndroidBridge
   */
  public isNativeAndroidApp(): boolean {
    return typeof (window as any).AndroidBridge !== 'undefined';
  }

  /**
   * Invoke Android Native Bridge if available
   */
  public triggerNativeAssistant(action: string, payload?: any) {
    if (this.isNativeAndroidApp()) {
      try {
        (window as any).AndroidBridge.onAction(action, JSON.stringify(payload || {}));
      } catch (e) {
        console.warn('Native Android bridge call failed', e);
      }
    }
  }
}

export const voiceService = new VoiceService();
