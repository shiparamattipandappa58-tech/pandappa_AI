/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Conversation, Message, UserSettings, AssistantMode, FileAttachment } from './types/assistant';
import { storageService, DEFAULT_SETTINGS } from './services/storageService';
import { geminiService } from './services/geminiService';
import { voiceService } from './services/voiceService';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { QuickActionsBar } from './components/QuickActionsBar';
import { VoiceModeModal } from './components/VoiceModeModal';
import { StudyModeView } from './components/StudyModeView';
import { CodingModeView } from './components/CodingModeView';
import { WritingModeView } from './components/WritingModeView';
import { SummarizerModeView } from './components/SummarizerModeView';
import { TranslationModeView } from './components/TranslationModeView';
import { ResearchModeView } from './components/ResearchModeView';
import { SettingsModal } from './components/SettingsModal';
import { NativeAndroidModal } from './components/NativeAndroidModal';
import { WifiOff, Wifi } from 'lucide-react';

export default function App() {
  // Persistence state
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    return storageService.getConversations();
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const saved = storageService.getActiveConversationId();
    if (saved) return saved;
    const all = storageService.getConversations();
    return all.length > 0 ? all[0].id : null;
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    return storageService.getSettings();
  });

  // Navigation & Modals
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    'chat' | 'study' | 'coding' | 'writer' | 'summarizer' | 'translator' | 'research'
  >('chat');
  const [currentMode, setCurrentMode] = useState<AssistantMode>('general');

  // Streaming & Voice State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(settings.wakeWordEnabled);
  const [wakeWordAlert, setWakeWordAlert] = useState<string | null>(null);
  const [voiceSessionNotice, setVoiceSessionNotice] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Network offline/online listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Native Android Bridge receiver hook - opens voice session when native wake-word triggers
  useEffect(() => {
    (window as any).__pandappaTriggerVoiceMode = () => {
      setIsVoiceModeOpen(true);
    };
    return () => {
      delete (window as any).__pandappaTriggerVoiceMode;
    };
  }, []);

  // Apply Theme (Dark/Light)
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark');
    }
  }, [settings.theme]);

  // Persist conversations
  useEffect(() => {
    storageService.saveConversations(conversations);
  }, [conversations]);

  // Persist active ID
  useEffect(() => {
    storageService.setActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  // Persist settings
  useEffect(() => {
    storageService.saveSettings(settings);
  }, [settings]);

  // Active conversation helper
  const currentConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = currentConversation?.messages || [];

  // Start a new chat
  const handleNewChat = () => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      mode: currentMode,
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setActiveView('chat');
  };

  // If no conversation exists on load, create initial conversation
  useEffect(() => {
    if (conversations.length === 0) {
      handleNewChat();
    }
  }, []);

  // Send a message & Stream response
  const handleSendMessage = async (text: string, attachments: FileAttachment[] = []) => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;

    let targetConvId = activeConversationId;
    let targetConv = currentConversation;

    if (!targetConvId || !targetConv) {
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newConv: Conversation = {
        id: newId,
        title: text.slice(0, 32) || 'Document Analysis',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        mode: currentMode,
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newId);
      targetConvId = newId;
      targetConv = newConv;
    }

    // User Message
    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Placeholder Assistant Message
    const assistantMessageId = `msg_asst_${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
    };

    // Update conversation title if it's the first message
    const isFirstMessage = targetConv.messages.length === 0;
    const newTitle = isFirstMessage ? text.slice(0, 35) || 'New Conversation' : targetConv.title;

    // Update State
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === targetConvId) {
          return {
            ...c,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...c.messages, userMessage, assistantMessage],
          };
        }
        return c;
      })
    );

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    // Prepare system instructions based on mode & settings
    let modeInstruction = '';
    if (currentMode === 'study') {
      modeInstruction = 'You are in Study Assistant mode. Focus on clear educational explanations, mnemonics, step-by-step breakdowns, and knowledge verification.';
    } else if (currentMode === 'coding') {
      modeInstruction = 'You are in Coding Assistant mode. Provide secure, clean, modern code in requested languages (C, C++, Java, Python, JS, HTML, SQL) with formatted markdown code blocks and time complexity notes.';
    } else if (currentMode === 'translator') {
      modeInstruction = 'You are in Translation mode. Provide natural, idiomatic translations primarily focusing on Kannada (ಕನ್ನಡ), English, and Hindi.';
    } else if (currentMode === 'summarizer') {
      modeInstruction = 'You are in Summarization mode. Provide crisp, structured bullet points highlighting key decisions and conclusions.';
    }

    if (settings.responseLength === 'concise') {
      modeInstruction += ' Be very concise and direct. Keep answers brief unless asked for details.';
    } else if (settings.responseLength === 'comprehensive') {
      modeInstruction += ' Provide an in-depth, comprehensive explanation with background context.';
    }

    if (settings.systemPromptExtra) {
      modeInstruction += `\nUser Preference: ${settings.systemPromptExtra}`;
    }

    // Build history for Gemini
    const historyPayload = [...targetConv.messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments?.map((a) => ({
        mimeType: a.mimeType,
        data: a.data,
        name: a.name,
      })),
    }));

    let accumulatedResponse = '';

    await geminiService.streamChat({
      messages: historyPayload,
      systemInstruction: modeInstruction,
      temperature: 0.7,
      mode: currentMode,
      signal: abortControllerRef.current.signal,
      onChunk: (chunk) => {
        accumulatedResponse += chunk;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === targetConvId) {
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id === assistantMessageId) {
                    return {
                      ...m,
                      content: accumulatedResponse,
                    };
                  }
                  return m;
                }),
              };
            }
            return c;
          })
        );
      },
      onError: (errorMsg) => {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === targetConvId) {
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id === assistantMessageId) {
                    return {
                      ...m,
                      status: 'error',
                      errorMessage: errorMsg,
                    };
                  }
                  return m;
                }),
              };
            }
            return c;
          })
        );
      },
      onDone: () => {
        setIsStreaming(false);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === targetConvId) {
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id === assistantMessageId) {
                    return {
                      ...m,
                      status: 'complete',
                    };
                  }
                  return m;
                }),
              };
            }
            return c;
          })
        );

        // Auto speak if enabled
        if (settings.autoSpeak && accumulatedResponse.trim()) {
          voiceService.speak({
            text: accumulatedResponse,
            rate: settings.speechRate,
            voiceName: settings.preferredVoice,
          });
        }
      },
    });
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  // Regenerate Response
  const handleRegenerate = () => {
    if (!currentConversation || messages.length === 0 || isStreaming) return;

    // Find last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage) return;

    // Remove last assistant message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          const filtered = c.messages.filter(
            (m, i) => !(i === c.messages.length - 1 && m.role === 'assistant')
          );
          return { ...c, messages: filtered };
        }
        return c;
      })
    );

    handleSendMessage(lastUserMessage.content, lastUserMessage.attachments || []);
  };

  // Edit User Message
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!currentConversation || isStreaming) return;

    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Truncate messages after this message
    const preserved = messages.slice(0, msgIndex);

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          return { ...c, messages: preserved };
        }
        return c;
      })
    );

    handleSendMessage(newContent, messages[msgIndex].attachments || []);
  };

  // Delete Conversation
  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (id === activeConversationId) {
        setActiveConversationId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  // Rename Conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Clear chat history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all chat conversations?')) {
      setConversations([]);
      setActiveConversationId(null);
      handleNewChat();
    }
  };

  // Export conversations
  const handleExportData = () => {
    const json = storageService.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pandappa-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import conversations
  const handleImportData = (jsonStr: string) => {
    const res = storageService.importData(jsonStr);
    if (res.success) {
      setConversations(storageService.getConversations());
      setSettings(storageService.getSettings());
      alert(res.message);
    } else {
      alert(`Import failed: ${res.message}`);
    }
  };

  // Wipe all data
  const handleWipeAllData = () => {
    if (
      window.confirm(
        'Warning: This will permanently delete all conversations, settings, and preferences on this device. Continue?'
      )
    ) {
      storageService.clearAllData();
      setSettings(DEFAULT_SETTINGS);
      setConversations([]);
      setActiveConversationId(null);
      handleNewChat();
    }
  };

  // Explicitly activate voice mode session on user action
  const handleToggleWakeWord = () => {
    setIsVoiceModeOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setActiveView('chat');
        }}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onOpenStudyModeView={() => setActiveView('study')}
        onOpenCodingModeView={() => setActiveView('coding')}
        onOpenWritingModeView={() => setActiveView('writer')}
        onOpenSummarizerModeView={() => setActiveView('summarizer')}
        onOpenTranslationModeView={() => setActiveView('translator')}
        onOpenResearchModeView={() => setActiveView('research')}
        onOpenVoiceMode={() => setIsVoiceModeOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Network Offline Alert */}
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 border-b border-amber-600/50 bg-amber-950/90 py-1.5 px-4 text-xs font-medium text-amber-200">
            <WifiOff className="h-3.5 w-3.5" />
            <span>You are currently offline. Responses and speech recognition will resume once connection is restored.</span>
          </div>
        )}

        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewChat={handleNewChat}
          onOpenVoiceMode={() => setIsVoiceModeOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAndroidBlueprint={() => setIsAndroidModalOpen(true)}
          conversationTitle={currentConversation?.title || 'New Chat'}
          onRenameConversation={(title) => {
            if (activeConversationId) handleRenameConversation(activeConversationId, title);
          }}
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          settings={settings}
          onToggleTheme={() =>
            setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
          }
          isWakeWordActive={isWakeWordActive}
          onToggleWakeWord={handleToggleWakeWord}
        />

        {/* Wake-Word Alert Notification Banner */}
        {wakeWordAlert && (
          <div className="flex items-center justify-between border-b border-cyan-500/50 bg-cyan-950/80 px-4 py-2 text-xs font-semibold text-cyan-200 backdrop-blur-sm animate-pulse">
            <span>{wakeWordAlert}</span>
            <button
              onClick={() => setWakeWordAlert(null)}
              className="text-cyan-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Voice Session Ended / Status Notification Banner */}
        {voiceSessionNotice && (
          <div className="flex items-center justify-between border-b border-slate-700/60 bg-slate-900/95 px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              <span>{voiceSessionNotice}</span>
              <span className="text-[11px] text-slate-500">· Microphone off</span>
            </div>
            <button
              onClick={() => setVoiceSessionNotice(null)}
              className="text-slate-400 hover:text-white ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Switching */}
        {activeView === 'study' ? (
          <StudyModeView
            onBackToChat={() => setActiveView('chat')}
            onSendToChat={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt);
            }}
            defaultLanguage={settings.language}
          />
        ) : activeView === 'coding' ? (
          <CodingModeView
            onBackToChat={() => setActiveView('chat')}
            onSendToChat={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt);
            }}
          />
        ) : activeView === 'writer' ? (
          <WritingModeView
            onBackToChat={() => setActiveView('chat')}
            onSendToChat={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt);
            }}
            defaultLanguage={settings.language}
          />
        ) : activeView === 'summarizer' ? (
          <SummarizerModeView
            onBackToChat={() => setActiveView('chat')}
            onSendToChat={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt);
            }}
            defaultLanguage={settings.language}
          />
        ) : activeView === 'translator' ? (
          <TranslationModeView
            onBackToChat={() => setActiveView('chat')}
            onSendToChat={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt);
            }}
          />
        ) : activeView === 'research' ? (
          <ResearchModeView
            onBackToChat={() => setActiveView('chat')}
            onSendToChat={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt);
            }}
            defaultLanguage={settings.language}
          />
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Quick Actions Mode Selector */}
            <div className="border-b border-slate-800/60 bg-slate-950/40 px-3 md:px-5">
              <QuickActionsBar
                currentMode={currentMode}
                onSelectMode={(mode) => setCurrentMode(mode)}
                onOpenStudyModeView={() => setActiveView('study')}
                onOpenCodingModeView={() => setActiveView('coding')}
                onOpenWritingModeView={() => setActiveView('writer')}
                onOpenSummarizerModeView={() => setActiveView('summarizer')}
                onOpenTranslationModeView={() => setActiveView('translator')}
                onOpenResearchModeView={() => setActiveView('research')}
              />
            </div>

            {/* Main Chat Stream */}
            <ChatArea
              messages={messages}
              isStreaming={isStreaming}
              onSendPresetMessage={(prompt) => handleSendMessage(prompt)}
              onRegenerateMessage={handleRegenerate}
              onEditMessage={handleEditMessage}
              currentMode={currentMode}
              onOpenStudyModeView={() => setActiveView('study')}
              onOpenCodingModeView={() => setActiveView('coding')}
              speechRate={settings.speechRate}
              preferredVoice={settings.preferredVoice}
              userName={settings.userName}
            />

            {/* Chat Input Bar */}
            <ChatInput
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              onStopStreaming={handleStopStreaming}
              onOpenVoiceMode={() => setIsVoiceModeOpen(true)}
              preferredLanguage={settings.language}
            />
          </div>
        )}
      </main>

      {/* Voice Mode Modal (Full Screen) */}
      <VoiceModeModal
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        settings={settings}
        conversationHistory={messages}
        onUpdateSpeechRate={(rate) => setSettings((s) => ({ ...s, speechRate: rate }))}
        onSessionEnded={(notice) => {
          setVoiceSessionNotice(notice);
          setTimeout(() => setVoiceSessionNotice(null), 3500);
        }}
        onNewMessage={(userText, assistantText) => {
          if (!activeConversationId) handleNewChat();
          // Append turns to chat history
          const userMsg: Message = {
            id: `msg_voice_u_${Date.now()}`,
            role: 'user',
            content: userText,
            timestamp: Date.now(),
          };
          const asstMsg: Message = {
            id: `msg_voice_a_${Date.now()}`,
            role: 'assistant',
            content: assistantText,
            timestamp: Date.now(),
            status: 'complete',
          };
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === activeConversationId) {
                return {
                  ...c,
                  updatedAt: Date.now(),
                  messages: [...c.messages, userMsg, asstMsg],
                };
              }
              return c;
            })
          );
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onClearHistory={handleClearHistory}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onWipeAllData={handleWipeAllData}
        onOpenAndroidBlueprint={() => {
          setIsSettingsOpen(false);
          setIsAndroidModalOpen(true);
        }}
      />

      {/* Android Native Architecture Blueprint Modal */}
      <NativeAndroidModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />
    </div>
  );
}
