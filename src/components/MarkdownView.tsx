import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse code blocks vs regular text
  const renderFormattedContent = () => {
    // Split content by triple-backtick code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Code block
        const lines = part.slice(3, -3).trim().split('\n');
        const firstLine = lines[0].trim();
        const hasLang = /^[a-zA-Z0-9_+#.-]+$/.test(firstLine);
        const language = hasLang ? firstLine : 'code';
        const codeText = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

        const isCopied = copiedIndex === index;

        return (
          <div
            key={index}
            className="my-3 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 text-sm shadow-md"
          >
            <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/80 px-3.5 py-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 font-mono font-medium text-cyan-400">
                <Terminal className="h-3.5 w-3.5" />
                <span>{language.toUpperCase()}</span>
              </div>
              <button
                onClick={() => copyToClipboard(codeText, index)}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                title="Copy code"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-slate-100">
              <pre className="m-0 whitespace-pre">
                <code>{codeText}</code>
              </pre>
            </div>
          </div>
        );
      }

      // Render regular paragraphs, lists, bold, headers
      return (
        <div key={index} className="space-y-2">
          {part.split('\n\n').map((paragraph, pIdx) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;

            // Headers
            if (trimmed.startsWith('### ')) {
              return (
                <h4 key={pIdx} className="text-base font-bold text-slate-100 pt-2 pb-0.5">
                  {renderInlineFormatting(trimmed.replace(/^### /, ''))}
                </h4>
              );
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h3 key={pIdx} className="text-lg font-bold text-cyan-300 pt-3 pb-1 border-b border-slate-800">
                  {renderInlineFormatting(trimmed.replace(/^## /, ''))}
                </h3>
              );
            }
            if (trimmed.startsWith('# ')) {
              return (
                <h2 key={pIdx} className="text-xl font-black text-slate-100 pt-4 pb-1">
                  {renderInlineFormatting(trimmed.replace(/^# /, ''))}
                </h2>
              );
            }

            // Blockquote
            if (trimmed.startsWith('> ')) {
              return (
                <blockquote
                  key={pIdx}
                  className="border-l-4 border-cyan-500/70 bg-cyan-950/20 py-1 px-3 text-slate-300 italic rounded-r my-2"
                >
                  {renderInlineFormatting(trimmed.replace(/^>\s*/, ''))}
                </blockquote>
              );
            }

            // Bullet or numbered lists
            const lines = trimmed.split('\n');
            const isBulletList = lines.every((l) => /^\s*[-*]\s+/.test(l));
            const isNumberedList = lines.every((l) => /^\s*\d+\.\s+/.test(l));

            if (isBulletList) {
              return (
                <ul key={pIdx} className="list-disc pl-5 space-y-1.5 text-slate-200">
                  {lines.map((l, lIdx) => (
                    <li key={lIdx} className="leading-relaxed">
                      {renderInlineFormatting(l.replace(/^\s*[-*]\s+/, ''))}
                    </li>
                  ))}
                </ul>
              );
            }

            if (isNumberedList) {
              return (
                <ol key={pIdx} className="list-decimal pl-5 space-y-1.5 text-slate-200">
                  {lines.map((l, lIdx) => (
                    <li key={lIdx} className="leading-relaxed">
                      {renderInlineFormatting(l.replace(/^\s*\d+\.\s+/, ''))}
                    </li>
                  ))}
                </ol>
              );
            }

            // Normal paragraph with line breaks
            return (
              <p key={pIdx} className="leading-relaxed text-slate-200 break-words">
                {lines.map((line, lIdx) => (
                  <React.Fragment key={lIdx}>
                    {renderInlineFormatting(line)}
                    {lIdx < lines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Helper for inline bold, italic, inline code
  const renderInlineFormatting = (text: string) => {
    // Split by inline code: `code`
    const codeTokens = text.split(/(`[^`]+`)/g);

    return codeTokens.map((token, i) => {
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={i}
            className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[13px] text-cyan-300 border border-slate-700/50"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      // Parse bold **text**
      const boldTokens = token.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {boldTokens.map((bToken, bI) => {
            if (bToken.startsWith('**') && bToken.endsWith('**')) {
              return (
                <strong key={bI} className="font-semibold text-slate-100">
                  {bToken.slice(2, -2)}
                </strong>
              );
            }

            // Parse italic *text*
            const italicTokens = bToken.split(/(\*[^*]+\*)/g);
            return (
              <span key={bI}>
                {italicTokens.map((itToken, itI) => {
                  if (itToken.startsWith('*') && itToken.endsWith('*')) {
                    return (
                      <em key={itI} className="italic text-slate-300">
                        {itToken.slice(1, -1)}
                      </em>
                    );
                  }
                  return itToken;
                })}
              </span>
            );
          })}
        </span>
      );
    });
  };

  return <div className={`markdown-body text-sm ${className}`}>{renderFormattedContent()}</div>;
};
