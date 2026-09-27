import React, { useState } from 'react';
import { BookOpen, GraduationCap, CheckCircle2, XCircle, RotateCcw, ChevronRight, ChevronLeft, HelpCircle, Copy, Check, Sparkles, BrainCircuit } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { QuizQuestion, Flashcard } from '../types/assistant';
import { MarkdownView } from './MarkdownView';

interface StudyModeViewProps {
  onBackToChat: () => void;
  onSendToChat: (prompt: string) => void;
  defaultLanguage?: string;
}

export const StudyModeView: React.FC<StudyModeViewProps> = ({
  onBackToChat,
  onSendToChat,
  defaultLanguage = 'English',
}) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Expert'>('Medium');
  const [language, setLanguage] = useState(defaultLanguage === 'Kannada' ? 'Kannada' : 'English');
  const [activeTab, setActiveTab] = useState<'quiz' | 'flashcards' | 'notes'>('quiz');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Notes state
  const [studyNotes, setStudyNotes] = useState<string>('');
  const [copiedNotes, setCopiedNotes] = useState(false);

  const handleGenerate = async (type: 'quiz' | 'flashcards' | 'notes') => {
    if (!topic.trim()) {
      setErrorMessage('Please enter a study topic or concept first.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (type === 'quiz') {
        const res = await geminiService.generateStudyContent({
          topic,
          difficulty,
          type: 'quiz',
          language,
          count: 5,
        });

        if (res.items && Array.isArray(res.items) && res.items.length > 0) {
          setQuizQuestions(res.items);
          setCurrentQuizIndex(0);
          setSelectedOption(null);
          setShowExplanation(false);
          setScore(0);
          setQuizFinished(false);
        } else {
          setErrorMessage('Could not generate quiz questions. Please try a different topic.');
        }
      } else if (type === 'flashcards') {
        const res = await geminiService.generateStudyContent({
          topic,
          difficulty,
          type: 'flashcards',
          language,
          count: 6,
        });

        if (res.items && Array.isArray(res.items) && res.items.length > 0) {
          setFlashcards(res.items);
          setCurrentCardIndex(0);
          setIsFlipped(false);
          setShowHint(false);
        } else {
          setErrorMessage('Could not generate flashcards. Please try a different topic.');
        }
      } else {
        const res = await geminiService.generateStudyContent({
          topic,
          difficulty,
          type: 'notes',
          language,
        });

        if (res.notes) {
          setStudyNotes(res.notes);
        } else {
          setErrorMessage('Could not generate study notes.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate study materials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null) return; // already answered
    setSelectedOption(index);
    setShowExplanation(true);
    if (index === quizQuestions[currentQuizIndex].correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex((i) => i + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(studyNotes);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  const currentQuestion = quizQuestions[currentQuizIndex];
  const currentCard = flashcards[currentCardIndex];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-950 p-4 md:p-6 text-slate-100">
      {/* Header bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Study Assistant</h2>
              <span className="text-xs text-slate-400 font-medium">· PANDAPPA AI</span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive quizzes, flashcard decks, and revision summaries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSendToChat(`Please explain "${topic || 'photosynthesis'}" simply with real-world examples.`)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Explain in Chat</span>
          </button>
          <button
            onClick={onBackToChat}
            className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            Back to Chat
          </button>
        </div>
      </div>

      {/* Topic & Config Controls */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-4">
        <div className="grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Study Topic or Chapter
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, Newton's Laws, Data Structures, Indian Constitution..."
              className="w-full rounded-xl border border-slate-700/70 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Difficulty Level
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full rounded-xl border border-slate-700/70 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-slate-700/70 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="English">English</option>
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
            </select>
          </div>
        </div>

        {/* Action tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
          <div className="flex items-center gap-1 rounded-lg bg-slate-950 p-1">
            <button
              onClick={() => setActiveTab('quiz')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'quiz' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Interactive MCQs
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'flashcards' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Study Flashcards
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'notes' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Revision Notes
            </button>
          </div>

          <button
            onClick={() => handleGenerate(activeTab)}
            disabled={isLoading || !topic.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                <span>Generating {activeTab}...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="h-3.5 w-3.5" />
                <span>Generate {activeTab === 'quiz' ? 'MCQ Quiz' : activeTab === 'flashcards' ? 'Flashcards' : 'Notes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center">
        {/* QUIZ TAB */}
        {activeTab === 'quiz' && (
          <div className="w-full max-w-2xl">
            {quizQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
                <BookOpen className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <h3 className="font-semibold text-slate-200">No Active Quiz</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Type any subject or topic above (e.g. "Thermodynamics", "Photosynthesis", or "Binary Search Trees") and click Generate MCQ Quiz to start testing your knowledge.
                </p>
              </div>
            ) : quizFinished ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center shadow-lg">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 mb-3 ring-1 ring-cyan-500/30">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-white">Quiz Completed!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  You scored <span className="text-cyan-400 font-bold text-sm">{score}</span> out of{' '}
                  <span className="font-bold">{quizQuestions.length}</span> ({Math.round((score / quizQuestions.length) * 100)}%)
                </p>

                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentQuizIndex(0);
                      setSelectedOption(null);
                      setShowExplanation(false);
                      setScore(0);
                      setQuizFinished(false);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retake Quiz</span>
                  </button>
                  <button
                    onClick={() => handleGenerate('quiz')}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
                  >
                    Generate New Questions
                  </button>
                </div>
              </div>
            ) : (
              currentQuestion && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3">
                    <span>
                      Question {currentQuizIndex + 1} of {quizQuestions.length}
                    </span>
                    <span className="text-cyan-400 font-medium">
                      Current Score: {score}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-100 leading-snug">
                    {currentQuestion.question}
                  </h3>

                  <div className="space-y-2.5 pt-2">
                    {currentQuestion.options.map((opt, oIdx) => {
                      const isSelected = selectedOption === oIdx;
                      const isCorrect = oIdx === currentQuestion.correctIndex;
                      let btnStyle = 'border-slate-800 bg-slate-950/70 hover:border-slate-700 text-slate-200';

                      if (selectedOption !== null) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500/70 bg-emerald-950/30 text-emerald-200';
                        } else if (isSelected) {
                          btnStyle = 'border-rose-500/70 bg-rose-950/30 text-rose-200';
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(oIdx)}
                          disabled={selectedOption !== null}
                          className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs transition ${btnStyle}`}
                        >
                          <span className="font-medium">{opt}</span>
                          {selectedOption !== null && (
                            <span>
                              {isCorrect ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : isSelected ? (
                                <XCircle className="h-4 w-4 text-rose-400" />
                              ) : null}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {showExplanation && (
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 text-xs text-slate-200 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Explanation</span>
                      </div>
                      <p className="leading-relaxed">{currentQuestion.explanation}</p>
                    </div>
                  )}

                  {selectedOption !== null && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleNextQuestion}
                        className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
                      >
                        <span>
                          {currentQuizIndex < quizQuestions.length - 1 ? 'Next Question' : 'View Results'}
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* FLASHCARDS TAB */}
        {activeTab === 'flashcards' && (
          <div className="w-full max-w-lg">
            {flashcards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
                <BookOpen className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <h3 className="font-semibold text-slate-200">No Flashcards Generated</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Enter a topic and click Generate Flashcards to build interactive 3D study cards.
                </p>
              </div>
            ) : (
              currentCard && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Card {currentCardIndex + 1} of {flashcards.length}
                    </span>
                    <span className="italic text-slate-500">Tap card to flip</span>
                  </div>

                  {/* 3D Flip Card */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="relative min-h-[220px] w-full cursor-pointer rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl transition-transform duration-300 hover:border-cyan-500/60 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        {isFlipped ? 'Answer / Concept' : 'Question / Term'}
                      </span>
                      <h3 className="mt-3 text-lg font-bold text-white leading-relaxed">
                        {isFlipped ? currentCard.back : currentCard.front}
                      </h3>
                    </div>

                    {currentCard.hint && !isFlipped && (
                      <div className="mt-4 pt-3 border-t border-slate-800">
                        {showHint ? (
                          <p className="text-xs text-amber-300/90 italic">Hint: {currentCard.hint}</p>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHint(true);
                            }}
                            className="text-[11px] text-slate-400 hover:text-amber-300 transition"
                          >
                            💡 Show Hint
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        if (currentCardIndex > 0) {
                          setCurrentCardIndex((i) => i - 1);
                          setIsFlipped(false);
                          setShowHint(false);
                        }
                      }}
                      disabled={currentCardIndex === 0}
                      className="flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </button>

                    <button
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                    >
                      Flip Card
                    </button>

                    <button
                      onClick={() => {
                        if (currentCardIndex < flashcards.length - 1) {
                          setCurrentCardIndex((i) => i + 1);
                          setIsFlipped(false);
                          setShowHint(false);
                        }
                      }}
                      disabled={currentCardIndex === flashcards.length - 1}
                      className="flex items-center gap-1 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* REVISION NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="w-full max-w-2xl">
            {studyNotes ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <h3 className="font-bold text-white text-base">Revision Summary: {topic}</h3>
                  <button
                    onClick={handleCopyNotes}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
                  >
                    {copiedNotes ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedNotes ? 'Copied' : 'Copy Notes'}</span>
                  </button>
                </div>
                <MarkdownView content={studyNotes} />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
                <BookOpen className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <h3 className="font-semibold text-slate-200">No Revision Notes Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Enter your topic above and click Generate Notes to receive structured high-yield revision summaries.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
