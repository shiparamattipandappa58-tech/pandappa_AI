import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  X,
  Settings,
  GraduationCap,
  Code2,
  PenTool,
  FileText,
  Languages,
  Compass,
  FileSearch,
  Radio,
  Check,
} from 'lucide-react';
import { Conversation } from '../types/assistant';
import { PandappaLogo } from './PandappaLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenStudyModeView: () => void;
  onOpenCodingModeView: () => void;
  onOpenWritingModeView?: () => void;
  onOpenSummarizerModeView?: () => void;
  onOpenTranslationModeView?: () => void;
  onOpenResearchModeView?: () => void;
  onOpenVoiceMode: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onOpenStudyModeView,
  onOpenCodingModeView,
  onOpenWritingModeView,
  onOpenSummarizerModeView,
  onOpenTranslationModeView,
  onOpenResearchModeView,
  onOpenVoiceMode,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter conversations based on search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = c.title.toLowerCase().includes(q);
    const messageMatch = c.messages.some((m) => m.content.toLowerCase().includes(q));
    return titleMatch || messageMatch;
  });

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleConfirmRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <PandappaLogo size="sm" />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-950/30 transition hover:from-cyan-400 hover:to-blue-500"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Quick Tools Shortcuts */}
        <div className="px-3 pb-2 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block">
            Specialized Assistants
          </span>
          <button
            onClick={() => {
              onOpenStudyModeView();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-cyan-300 transition"
          >
            <GraduationCap className="h-4 w-4 text-cyan-400" />
            <span>Study Assistant</span>
          </button>
          <button
            onClick={() => {
              onOpenCodingModeView();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-emerald-300 transition"
          >
            <Code2 className="h-4 w-4 text-emerald-400" />
            <span>Coding Assistant</span>
          </button>
          {onOpenWritingModeView && (
            <button
              onClick={() => {
                onOpenWritingModeView();
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-violet-300 transition"
            >
              <PenTool className="h-4 w-4 text-violet-400" />
              <span>Writing & Rewriting</span>
            </button>
          )}
          {onOpenSummarizerModeView && (
            <button
              onClick={() => {
                onOpenSummarizerModeView();
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-amber-300 transition"
            >
              <FileText className="h-4 w-4 text-amber-400" />
              <span>Summarizer Mode</span>
            </button>
          )}
          {onOpenTranslationModeView && (
            <button
              onClick={() => {
                onOpenTranslationModeView();
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-cyan-300 transition"
            >
              <Languages className="h-4 w-4 text-cyan-400" />
              <span>Translation (ಕನ್ನಡ)</span>
            </button>
          )}
          {onOpenResearchModeView && (
            <button
              onClick={() => {
                onOpenResearchModeView();
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-indigo-300 transition"
            >
              <Compass className="h-4 w-4 text-indigo-400" />
              <span>Research Assistant</span>
            </button>
          )}
          <button
            onClick={() => {
              onOpenVoiceMode();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-cyan-300 transition"
          >
            <Radio className="h-4 w-4 text-cyan-400" />
            <span>Voice Mode</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 border-t border-slate-800/80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Recent Chats</span>
            <span>{filteredConversations.length}</span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-slate-500">
              {searchQuery ? 'No matching conversations' : 'No chats yet. Start a conversation!'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(e as any, conv.id);
                        }}
                        autoFocus
                        className="w-full rounded bg-slate-950 px-1.5 py-0.5 text-xs text-white border border-cyan-500 focus:outline-none"
                      />
                    ) : (
                      <span className="truncate">{conv.title}</span>
                    )}
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditing ? (
                      <button
                        onClick={(e) => handleConfirmRename(e, conv.id)}
                        className="p-1 text-cyan-400 hover:text-cyan-200"
                        title="Save title"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleStartRename(e, conv.id, conv.title)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                        title="Rename chat"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                      title="Delete chat"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Settings */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={() => {
              onOpenSettings();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span>Settings & Preferences</span>
          </button>
        </div>
      </aside>
    </>
  );
};
