import React, { useState, useEffect } from 'react';
import { X, User, Palette, Languages, Volume2, Sliders, Shield, Database, Info, Check, Trash2, Download, Upload, Smartphone, Cloud, RefreshCw, Key, ExternalLink } from 'lucide-react';
import { UserSettings } from '../types/assistant';
import { voiceService } from '../services/voiceService';
import { supabaseService } from '../services/supabaseService';
import { storageService } from '../services/storageService';
import { PandappaLogo } from './PandappaLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onClearHistory: () => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => void;
  onWipeAllData: () => void;
  onOpenAndroidBlueprint: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearHistory,
  onExportData,
  onImportData,
  onWipeAllData,
  onOpenAndroidBlueprint,
}) => {
  const [activeSection, setActiveSection] = useState<
    'account' | 'appearance' | 'language' | 'voice' | 'ai' | 'privacy' | 'data' | 'about'
  >('appearance');

  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Supabase Cloud State
  const initialSupabase = supabaseService.getConfiguration();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabase.url);
  const [supabaseKey, setSupabaseKey] = useState(initialSupabase.key);
  const [supabaseStatus, setSupabaseStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    const cfg = supabaseService.getConfiguration();
    setSupabaseUrl(cfg.url);
    setSupabaseKey(cfg.key);

    if (voiceService.isSpeechSynthesisSupported()) {
      const v = voiceService.getVoices();
      setVoices(v);
      window.speechSynthesis.onvoiceschanged = () => {
        setVoices(voiceService.getVoices());
      };
    }
  }, [settings, isOpen]);

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseStatus(null);
    const res = await supabaseService.testConnection(supabaseUrl, supabaseKey);
    setSupabaseStatus(res);
    setIsTestingSupabase(false);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    setSupabaseStatus(null);
    supabaseService.configure(supabaseUrl, supabaseKey);
    const convs = storageService.getConversations();
    const res = await supabaseService.syncConversations(convs);
    setSupabaseStatus(res);
    setIsSyncingSupabase(false);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          onImportData(text);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <PandappaLogo size="sm" showText={false} />
            <div>
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <p className="text-xs text-slate-400">PANDAPPA AI Preferences & Controls</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body with Sidebar navigation */}
        <div className="flex flex-1 overflow-hidden">
          {/* Settings Nav */}
          <div className="w-48 sm:w-56 border-r border-slate-800 bg-slate-950/50 p-3 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveSection('account')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSection === 'account' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Account</span>
            </button>

            <button
              onClick={() => setActiveSection('appearance')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSection === 'appearance' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveSection('language')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSection === 'language' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Languages className="h-4 w-4" />
              <span>Language</span>
            </button>

            <button
              onClick={() => setActiveSection('voice')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSection === 'voice' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Volume2 className="h-4 w-4" />
              <span>Voice & Speech</span>
            </button>

            <button
              onClick={() => setActiveSection('ai')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSection === 'ai' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>AI Preferences</span>
            </button>

            <button
              onClick={() => setActiveSection('privacy')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSection === 'privacy' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Privacy & Security</span>
            </button>

            <button
              onClick={() => setActiveSection('data')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSection === 'data' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Database className="h-4 w-4" />
              <span>Data & Backup</span>
            </button>

            <button
              onClick={() => setActiveSection('about')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSection === 'about' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Info className="h-4 w-4" />
              <span>About PANDAPPA AI</span>
            </button>
          </div>

          {/* Section Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-200">
            {/* ACCOUNT */}
            {activeSection === 'account' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                  User Profile
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Your Name or Preferred Title
                  </label>
                  <input
                    type="text"
                    value={localSettings.userName}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, userName: e.target.value })
                    }
                    className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    PANDAPPA AI uses this to personalize greetings and responses.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Assistant Name
                  </label>
                  <input
                    type="text"
                    value={localSettings.assistantName}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, assistantName: e.target.value })
                    }
                    className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* APPEARANCE */}
            {activeSection === 'appearance' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                  Theme & Display
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Interface Theme
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, theme: 'dark' })}
                      className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition ${
                        localSettings.theme === 'dark'
                          ? 'border-cyan-500 bg-cyan-950/30 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="h-6 w-6 rounded-full bg-slate-950 border border-slate-700 mb-1.5" />
                      <span className="text-xs font-semibold">Dark Mode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, theme: 'light' })}
                      className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition ${
                        localSettings.theme === 'light'
                          ? 'border-cyan-500 bg-cyan-950/30 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-300 mb-1.5" />
                      <span className="text-xs font-semibold">Light Mode</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LANGUAGE */}
            {activeSection === 'language' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                  Language & Dialect
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Primary Interaction Language
                  </label>
                  <select
                    value={localSettings.language}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, language: e.target.value as any })
                    }
                    className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Auto">Auto Detect / Multilingual</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    PANDAPPA AI naturally adapts to Kannada script, English, or mixed questions.
                  </p>
                </div>
              </div>
            )}

            {/* VOICE */}
            {activeSection === 'voice' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                  Voice & Speech Synthesis
                </h3>

                <div className="flex items-center justify-between max-w-md rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                  <div>
                    <span className="text-xs font-semibold text-white block">Auto-Read Responses</span>
                    <span className="text-[11px] text-slate-400">
                      Automatically speak answers aloud upon completion.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.autoSpeak}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, autoSpeak: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Speech Rate: {localSettings.speechRate}x
                  </label>
                  <input
                    type="range"
                    min="0.75"
                    max="1.75"
                    step="0.05"
                    value={localSettings.speechRate}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, speechRate: parseFloat(e.target.value) })
                    }
                    className="w-full max-w-sm accent-cyan-500"
                  />
                </div>

                {voices.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Preferred Device Voice
                    </label>
                    <select
                      value={localSettings.preferredVoice}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, preferredVoice: e.target.value })
                      }
                      className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Default System Voice</option>
                      {voices.map((v, i) => (
                        <option key={i} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Wake word toggle */}
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between max-w-md rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5">
                    <div>
                      <span className="text-xs font-semibold text-cyan-300 block">
                        "Hey Pandappa" Wake Word (Web)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Listens for "Hey Pandappa" while this tab is active and focused.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSettings.wakeWordEnabled}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, wakeWordEnabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                    />
                  </div>

                  <button
                    onClick={onOpenAndroidBlueprint}
                    className="mt-2.5 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>View 24/7 Background Android Wake-Word Architecture</span>
                  </button>
                </div>
              </div>
            )}

            {/* AI PREFERENCES */}
            {activeSection === 'ai' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                  AI Output Preferences
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Response Length
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-w-md">
                    {(['concise', 'balanced', 'comprehensive'] as const).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, responseLength: len })}
                        className={`rounded-xl border p-2 text-xs font-semibold capitalize transition ${
                          localSettings.responseLength === len
                            ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Custom System Prompt Instructions (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={localSettings.systemPromptExtra}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, systemPromptExtra: e.target.value })
                    }
                    placeholder="e.g. Always include concise summaries at the start; or prefer Kannada explanations when talking about Karnataka history..."
                    className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* PRIVACY */}
            {activeSection === 'privacy' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                  Privacy & Microphone Controls
                </h3>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs space-y-3 text-slate-300 leading-relaxed">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="font-semibold text-white block">Microphone Access Model</span>
                      <span className="text-[11px] text-slate-400">
                        Requested only once when you explicitly start voice mode or speech-to-text.
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Session Controlled
                    </span>
                  </div>

                  <p>
                    <strong>Strict Microphone Lifecycle:</strong> The microphone is OFF by default. It is activated ONLY when you explicitly open Voice Mode or tap the microphone button in chat. Once a voice session ends, the microphone is completely stopped and released.
                  </p>
                  <p>
                    <strong>No Background Recording:</strong> PANDAPPA AI never records audio in the background or when the app is minimized. The browser tab's microphone is shut down immediately when you say "Stop", "That's enough", or exit the session.
                  </p>
                  <p>
                    <strong>Private by Design:</strong> Conversations are preserved locally in your browser storage. No audio streams are kept or uploaded continuously.
                  </p>
                </div>
              </div>
            )}

            {/* DATA */}
            {activeSection === 'data' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                  Data Management & Backup
                </h3>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={onExportData}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                  >
                    <Download className="h-4 w-4 text-cyan-400" />
                    <span>Export All Conversations (JSON)</span>
                  </button>

                  <label className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer transition">
                    <Upload className="h-4 w-4 text-emerald-400" />
                    <span>Import Backup File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Supabase Cloud Sync Section */}
                <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Supabase Cloud Database & Sync
                      </h4>
                    </div>
                    <span className="text-[10px] rounded-full bg-cyan-500/20 text-cyan-300 font-semibold px-2.5 py-0.5 border border-cyan-500/30">
                      Cloud Sync Ready
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Connect PANDAPPA AI to your Supabase PostgreSQL project to backup, restore, and synchronize your chat conversations to the cloud.
                  </p>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Supabase Project URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://xyzcompany.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Found in Supabase Dashboard → Project Settings → API → Project URL.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Supabase Publishable / Anon Key
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={supabaseKey}
                          onChange={(e) => setSupabaseKey(e.target.value)}
                          className="w-full font-mono rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-cyan-300 focus:border-cyan-500 focus:outline-none pr-8"
                        />
                        <Key className="absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestSupabase}
                        disabled={isTestingSupabase}
                        className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                        <span>{isTestingSupabase ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncToSupabase}
                        disabled={isSyncingSupabase}
                        className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition shadow-sm disabled:opacity-50"
                      >
                        <Cloud className={`h-3.5 w-3.5 ${isSyncingSupabase ? 'animate-pulse' : ''}`} />
                        <span>{isSyncingSupabase ? 'Syncing...' : 'Sync Conversations Now'}</span>
                      </button>
                    </div>

                    {supabaseStatus && (
                      <div
                        className={`rounded-lg border p-2.5 text-xs leading-relaxed ${
                          supabaseStatus.success
                            ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300'
                            : 'border-amber-800/60 bg-amber-950/40 text-amber-300'
                        }`}
                      >
                        {supabaseStatus.message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <h4 className="text-xs font-semibold text-rose-400">Danger Zone</h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={onClearHistory}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-900/50 bg-rose-950/30 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/60 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Clear Chat History</span>
                    </button>

                    <button
                      onClick={onWipeAllData}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-800 bg-rose-900/50 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-800 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete All Local Data</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABOUT */}
            {activeSection === 'about' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <PandappaLogo size="lg" />
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs space-y-2 text-slate-300 leading-relaxed">
                  <p className="font-semibold text-white">
                    PANDAPPA AI Version 1.0.0
                  </p>
                  <p>
                    A modern, intelligent, fast, mobile-first personal AI assistant engineered for high-precision natural language understanding, multimodal document & image comprehension, interactive study workflows, and coding assistance.
                  </p>
                  <p className="text-slate-400">
                    Engineered with Gemini 3.8 Flash multimodal reasoning and modern Web Speech APIs.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-800 px-6 py-3.5 bg-slate-950">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
