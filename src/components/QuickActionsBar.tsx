import React from 'react';
import {
  MessageSquare,
  GraduationCap,
  Code2,
  PenTool,
  FileText,
  Languages,
  HelpCircle,
  Lightbulb,
  FileSearch,
  Image as ImageIcon,
  Calculator,
  Compass,
} from 'lucide-react';
import { AssistantMode } from '../types/assistant';

interface QuickActionsBarProps {
  currentMode: AssistantMode;
  onSelectMode: (mode: AssistantMode) => void;
  onOpenStudyModeView?: () => void;
  onOpenCodingModeView?: () => void;
  onOpenWritingModeView?: () => void;
  onOpenSummarizerModeView?: () => void;
  onOpenTranslationModeView?: () => void;
  onOpenResearchModeView?: () => void;
}

export const QUICK_ACTIONS: Array<{
  id: AssistantMode;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  promptSuggestion?: string;
  isSpecialView?: boolean;
}> = [
  {
    id: 'general',
    name: 'Ask PANDAPPA AI',
    desc: 'General Q&A and assistance',
    icon: MessageSquare,
  },
  {
    id: 'study',
    name: 'Study Assistant',
    desc: 'Quizzes, flashcards & notes',
    icon: GraduationCap,
    isSpecialView: true,
  },
  {
    id: 'coding',
    name: 'Coding Assistant',
    desc: 'Code, debug & algorithms',
    icon: Code2,
    isSpecialView: true,
  },
  {
    id: 'writer',
    name: 'Write & Draft',
    desc: 'Articles, essays & emails',
    icon: PenTool,
    promptSuggestion: 'Help me draft a well-structured article on...',
  },
  {
    id: 'summarizer',
    name: 'Summarize',
    desc: 'Condense documents & text',
    icon: FileText,
    promptSuggestion: 'Please summarize the following text into key bullet points:\n',
  },
  {
    id: 'translator',
    name: 'Translate',
    desc: 'Kannada, English & Hindi',
    icon: Languages,
    promptSuggestion: 'Translate the following into fluent Kannada (ಕನ್ನಡ):\n',
  },
  {
    id: 'explain',
    name: 'Explain Simply',
    desc: 'Complex concepts simplified',
    icon: HelpCircle,
    promptSuggestion: 'Explain this concept to me simply like I am 12 years old:\n',
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    desc: 'Generate novel ideas',
    icon: Lightbulb,
    promptSuggestion: 'Brainstorm 10 creative ideas for...',
  },
  {
    id: 'doc_analyzer',
    name: 'Document Analyzer',
    desc: 'Deep document comprehension',
    icon: FileSearch,
    promptSuggestion: 'Analyze this uploaded document and extract critical findings.',
  },
  {
    id: 'image_analyzer',
    name: 'Image Analyzer',
    desc: 'Diagrams & visual Q&A',
    icon: ImageIcon,
    promptSuggestion: 'Please analyze this image, diagram, or chart in detail.',
  },
  {
    id: 'math',
    name: 'Math Helper',
    desc: 'Calculations & formulas',
    icon: Calculator,
    promptSuggestion: 'Solve and show step-by-step working for:\n',
  },
  {
    id: 'research',
    name: 'Research Assistant',
    desc: 'In-depth academic synthesis',
    icon: Compass,
    promptSuggestion: 'Conduct an in-depth research breakdown on:\n',
  },
];

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  currentMode,
  onSelectMode,
  onOpenStudyModeView,
  onOpenCodingModeView,
  onOpenWritingModeView,
  onOpenSummarizerModeView,
  onOpenTranslationModeView,
  onOpenResearchModeView,
}) => {
  return (
    <div className="w-full overflow-x-auto py-2 px-1 scrollbar-none">
      <div className="flex items-center gap-2 min-w-max">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isActive = currentMode === action.id;

          const handleClick = () => {
            if (action.id === 'study' && onOpenStudyModeView) {
              onOpenStudyModeView();
            } else if (action.id === 'coding' && onOpenCodingModeView) {
              onOpenCodingModeView();
            } else if (action.id === 'writer' && onOpenWritingModeView) {
              onOpenWritingModeView();
            } else if (action.id === 'summarizer' && onOpenSummarizerModeView) {
              onOpenSummarizerModeView();
            } else if (action.id === 'translator' && onOpenTranslationModeView) {
              onOpenTranslationModeView();
            } else if (action.id === 'research' && onOpenResearchModeView) {
              onOpenResearchModeView();
            } else {
              onSelectMode(action.id);
            }
          };

          return (
            <button
              key={action.id}
              onClick={handleClick}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? 'border-cyan-500/80 bg-cyan-950/40 text-cyan-200 shadow-sm shadow-cyan-900/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <div className="text-left">
                <span className="block leading-tight font-semibold">{action.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
