import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, Cpu, Bell, Volume2, Mic, Code2, Check, ArrowRight } from 'lucide-react';

interface NativeAndroidModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NativeAndroidModal: React.FC<NativeAndroidModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'kotlin' | 'manifest'>('architecture');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kotlinServiceSnippet = `// PandappaWakeWordService.kt
// Native Android Foreground Service for 24/7 "Hey Pandappa" Wake-Word Detection
package ai.pandappa.assistant.service

import android.app.*
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import ai.pandappa.assistant.R
import ai.pandappa.assistant.ui.VoiceAssistantActivity

class PandappaWakeWordService : Service() {
    private val CHANNEL_ID = "pandappa_hotword_channel"
    private val NOTIFICATION_ID = 1001

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        initializeWakeWordEngine()
    }

    private fun initializeWakeWordEngine() {
        // High-efficiency, battery-conscious local on-device wake-word model (e.g. Porcupine / Vosk)
        // Listens for "Hey Pandappa" keyword locally with < 2% battery drain per day
        WakeWordDetector.init(this) { keyword ->
            if (keyword == "Hey Pandappa") {
                triggerAssistantInteraction()
            }
        }
    }

    private fun triggerAssistantInteraction() {
        // Launch Voice Assistant overlay or full screen
        val intent = Intent(this, VoiceAssistantActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("AUTO_LISTEN", true)
            putExtra("SOURCE", "WAKE_WORD")
        }
        startActivity(intent)
    }

    private fun buildForegroundNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, VoiceAssistantActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PANDAPPA AI Active")
            .setContentText("Listening for \\"Hey Pandappa\\" wake-word")
            .setSmallIcon(R.drawable.ic_pandappa_mic)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`;

  const manifestSnippet = `<!-- AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="ai.pandappa.assistant">

    <!-- Audio & Foreground Service Permissions -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:label="PANDAPPA AI"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/Theme.PandappaAI">

        <!-- Continuous Wake-Word Detection Service -->
        <service
            android:name=".service.PandappaWakeWordService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="microphone" />

        <!-- Deep links & Voice Interaction Activity -->
        <activity
            android:name=".ui.VoiceAssistantActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.VOICE_COMMAND" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.VOICE" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="pandappa" android:host="assistant" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Android Native Architecture</h2>
              <p className="text-xs text-slate-400">
                PANDAPPA AI Foreground Wake-Word & Native Integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 pt-2">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'architecture'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Web vs Native Reality
          </button>
          <button
            onClick={() => setActiveTab('kotlin')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'kotlin'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Kotlin Service (Foreground)
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'manifest'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            AndroidManifest.xml
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-slate-300">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <h4 className="font-semibold text-cyan-300 flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  Honest Technical Boundary
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Web browsers (Chrome, Safari, Firefox) restrict continuous background audio recording when tabs are in the background or the screen is locked to protect user privacy and battery life.
                  In PANDAPPA AI Web, the <strong>"Hey Pandappa"</strong> wake word functions actively while this tab is open and focused.
                </p>
              </div>

              <h4 className="font-semibold text-white pt-2">Complete Native Android Flow:</h4>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                  <div className="flex items-center gap-2 font-semibold text-cyan-400 mb-1">
                    <Bell className="h-4 w-4" />
                    1. Foreground Service
                  </div>
                  <p className="text-slate-400">
                    Runs persistent <code className="text-slate-200">PandappaWakeWordService</code> with an ongoing low-priority status notification.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                  <div className="flex items-center gap-2 font-semibold text-cyan-400 mb-1">
                    <Mic className="h-4 w-4" />
                    2. Local Hotword Model
                  </div>
                  <p className="text-slate-400">
                    On-device acoustic neural net (Porcupine/Vosk) filters ambient sound offline without draining battery.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                  <div className="flex items-center gap-2 font-semibold text-cyan-400 mb-1">
                    <Cpu className="h-4 w-4" />
                    3. Gemini Cloud Pipeline
                  </div>
                  <p className="text-slate-400">
                    Once awakened, audio streams to Gemini 3.8 Flash for intelligent natural language reasoning.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                  <div className="flex items-center gap-2 font-semibold text-cyan-400 mb-1">
                    <Volume2 className="h-4 w-4" />
                    4. Instant Speech Output
                  </div>
                  <p className="text-slate-400">
                    Native Android TextToSpeech engine or Gemini Flash Lite TTS speaks back in Kannada or English.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3.5 text-xs text-slate-300">
                <span className="font-semibold text-slate-100">Deep Link Support:</span>
                <p className="mt-1 font-mono text-[11px] text-cyan-400 bg-slate-900 px-2 py-1 rounded">
                  pandappa://assistant?mode=voice&autoListen=true
                </p>
              </div>
            </div>
          )}

          {activeTab === 'kotlin' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">PandappaWakeWordService.kt</span>
                <button
                  onClick={() => copyCode(kotlinServiceSnippet)}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Kotlin Code'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 border border-slate-800 leading-relaxed">
                {kotlinServiceSnippet}
              </pre>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">AndroidManifest.xml</span>
                <button
                  onClick={() => copyCode(manifestSnippet)}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy XML'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 border border-slate-800 leading-relaxed">
                {manifestSnippet}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
