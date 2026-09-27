import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Edit2,
  Share2,
  Volume2,
  VolumeX,
  User,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Message } from '../types/assistant';
import { MarkdownView } from './MarkdownView';
import { FileAttachmentPreview } from './FileAttachmentPreview';
import { PandappaLogo } from './PandappaLogo';
import { voiceService } from '../services/voiceService';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  speechRate?: number;
  preferredVoice?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  onEdit,
  speechRate = 1.0,
  preferredVoice,
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PANDAPPA AI Response',
          text: message.content,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // Fallback to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      voiceService.speak({
        text: message.content,
        rate: speechRate,
        voiceName: preferredVoice,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(message.id, editText.trim());
      setIsEditing(false);
    }
  };

  const formattedTime = new Intl.DateTimeFormat('default', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(message.timestamp));

  return (
    <div
      className={`group relative flex gap-3 px-3 py-4 md:px-6 transition-colors ${
        isUser ? 'bg-slate-900/30' : 'bg-slate-900/70 border-y border-slate-800/40'
      }`}
    >
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-300 ring-1 ring-slate-700">
            <User className="h-4 w-4" />
          </div>
        ) : (
          <PandappaLogo size="sm" showText={false} />
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header Metadata (Zero-pill discipline: quiet inline text with dot separator) */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {isUser ? 'You' : 'PANDAPPA AI'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Attachments if any */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="pt-1">
            <FileAttachmentPreview attachments={message.attachments} readOnly />
          </div>
        )}

        {/* Content or Edit Mode */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
              >
                Save & Regenerate
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-0.5">
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm text-slate-100 leading-relaxed break-words">
                {message.content}
              </p>
            ) : (
              <div>
                <MarkdownView content={message.content} />
                {isStreaming && (
                  <span className="inline-block h-4 w-1.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Error notice if message failed */}
        {message.status === 'error' && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{message.errorMessage || 'Failed to complete response.'}</span>
          </div>
        )}

        {/* Action Controls Toolbar */}
        {!isStreaming && !isEditing && (
          <div className="flex items-center gap-1 pt-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-[11px] sr-only sm:not-sr-only">Copy</span>
                </>
              )}
            </button>

            {!isUser && (
              <>
                <button
                  onClick={handleToggleSpeak}
                  className={`flex items-center gap-1 rounded-lg p-1.5 text-xs transition ${
                    isSpeaking
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                >
                  {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span className="text-[11px] sr-only sm:not-sr-only">
                    {isSpeaking ? 'Stop' : 'Listen'}
                  </span>
                </button>

                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1 rounded-lg p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                    title="Regenerate response"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="text-[11px] sr-only sm:not-sr-only">Regenerate</span>
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 rounded-lg p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Share response"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="text-[11px] sr-only sm:not-sr-only">
                    {shared ? 'Shared' : 'Share'}
                  </span>
                </button>
              </>
            )}

            {isUser && onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 rounded-lg p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                title="Edit message"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span className="text-[11px] sr-only sm:not-sr-only">Edit</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
