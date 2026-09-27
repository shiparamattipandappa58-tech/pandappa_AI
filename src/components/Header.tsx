import React, { useState } from 'react';
import {
  Menu,
  Plus,
  Radio,
  Settings,
  Sun,
  Moon,
  Mic,
  Smartphone,
  Edit3,
  Check,
  GraduationCap,
  Code2,
} from 'lucide-react';
import { PandappaLogo } from './PandappaLogo';
import { AssistantMode, UserSettings } from '../types/assistant';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenVoiceMode: () => void;
  onOpenSettings: () => void;
  onOpenAndroidBlueprint: () => void;
  conversationTitle?: string;
  onRenameConversation?: (newTitle: string) => void;
  currentMode: AssistantMode;
  onSelectMode: (mode: AssistantMode) => void;
  settings: UserSettings;
  onToggleTheme: () => void;
  isWakeWordActive: boolean;
  onToggleWakeWord: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onNewChat,
  onOpenVoiceMode,
  onOpenSettings,
  onOpenAndroidBlueprint,
  conversationTitle = 'New Chat',
  onRenameConversation,
  currentMode,
  onSelectMode,
  settings,
  onToggleTheme,
  isWakeWordActive,
  onToggleWakeWord,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(conversationTitle);

  const handleSaveTitle = () => {
    if (titleInput.trim() && onRenameConversation) {
      onRenameConversation(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-3 md:px-5 backdrop-blur-md select-none">
      {/* Left side: Hamburger, Logo, Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
          title="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <PandappaLogo size="sm" showText={false} className="hidden sm:flex" />

        {/* Conversation Title / Editable */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="rounded-lg border border-cyan-500 bg-slate-900 px-2 py-0.5 text-xs text-white focus:outline-none"
              />
              <button
                onClick={handleSaveTitle}
                className="text-cyan-400 hover:text-cyan-300"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <h1
                onClick={() => {
                  setTitleInput(conversationTitle);
                  setIsEditingTitle(true);
                }}
                className="cursor-pointer truncate text-xs font-semibold text-slate-200 hover:text-white transition"
                title="Click to rename chat"
              >
                {conversationTitle}
              </h1>
              <button
                onClick={() => {
                  setTitleInput(conversationTitle);
                  setIsEditingTitle(true);
                }}
                className="text-slate-500 hover:text-slate-300 transition"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* "Hey Pandappa" Voice Session Launcher */}
        <button
          onClick={onToggleWakeWord}
          className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 transition"
          title='Start "Hey Pandappa" Voice Session'
        >
          <Mic className="h-3.5 w-3.5 text-cyan-400" />
          <span className="hidden lg:inline text-[11px]">Hey Pandappa</span>
        </button>

        {/* Android Architecture Blueprint Button */}
        <button
          onClick={onOpenAndroidBlueprint}
          className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:text-cyan-300 hover:border-slate-700 transition"
          title="Native Android 24/7 Wake-Word & Background Service Architecture"
        >
          <Smartphone className="h-4 w-4" />
        </button>

        {/* Voice Mode Button */}
        <button
          onClick={onOpenVoiceMode}
          className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/50 to-blue-950/50 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:from-cyan-900/60 hover:to-blue-900/60 transition shadow-sm"
          title="Open Voice Assistant Mode"
        >
          <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">Voice Mode</span>
        </button>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-1 rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          title="Start a new chat"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
          title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {settings.theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-cyan-400" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
