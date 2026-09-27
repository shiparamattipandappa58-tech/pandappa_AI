import React from 'react';
import { FileText, Image as ImageIcon, Code2, X, File, Sparkles } from 'lucide-react';
import { FileAttachment } from '../types/assistant';

interface FileAttachmentPreviewProps {
  attachments: FileAttachment[];
  onRemove?: (id: string) => void;
  onApplyPreset?: (prompt: string) => void;
  readOnly?: boolean;
}

export const FileAttachmentPreview: React.FC<FileAttachmentPreviewProps> = ({
  attachments,
  onRemove,
  onApplyPreset,
  readOnly = false,
}) => {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (mimeType: string, name: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-cyan-400" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="h-4 w-4 text-rose-400" />;
    }
    if (
      mimeType.includes('javascript') ||
      mimeType.includes('typescript') ||
      mimeType.includes('python') ||
      name.endsWith('.ts') ||
      name.endsWith('.js') ||
      name.endsWith('.py') ||
      name.endsWith('.html') ||
      name.endsWith('.css') ||
      name.endsWith('.json')
    ) {
      return <Code2 className="h-4 w-4 text-emerald-400" />;
    }
    return <File className="h-4 w-4 text-amber-400" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      {/* File chips list */}
      <div className="flex flex-wrap gap-2">
        {attachments.map((file) => (
          <div
            key={file.id}
            className="group relative flex items-center gap-2.5 rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 shadow-sm transition hover:border-slate-600"
          >
            {file.previewUrl ? (
              <img
                src={file.previewUrl}
                alt={file.name}
                className="h-8 w-8 rounded object-cover ring-1 ring-slate-700"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900/80">
                {getFileIcon(file.mimeType, file.name)}
              </div>
            )}

            <div className="max-w-[160px] truncate">
              <div className="truncate font-medium text-slate-100" title={file.name}>
                {file.name}
              </div>
              <div className="text-[10px] text-slate-400">
                {formatFileSize(file.size)}
              </div>
            </div>

            {!readOnly && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition"
                title="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Preset Action Suggestions for attached document */}
      {!readOnly && onApplyPreset && attachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            Quick prompt:
          </span>
          <button
            type="button"
            onClick={() => onApplyPreset('Please summarize this document thoroughly, highlighting key conclusions.')}
            className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300 transition hover:bg-slate-700 hover:text-cyan-300"
          >
            Summarize Document
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('Extract the top 5 key takeaways and action points from this file.')}
            className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300 transition hover:bg-slate-700 hover:text-cyan-300"
          >
            Key Takeaways
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('Generate 5 study quiz questions with answers based on this content.')}
            className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300 transition hover:bg-slate-700 hover:text-cyan-300"
          >
            Create Quiz
          </button>
        </div>
      )}
    </div>
  );
};
