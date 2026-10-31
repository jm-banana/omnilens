import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  BookOpen,
} from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { sound } from '../utils/sound';

interface QuizModeProps {
  decks: Deck[];
  initialDeckId?: string;
  onExit: () => void;
}

interface QuizQuestion {
  cardId: string;
  question: string;
  correctAnswer: string;
  options: string[];
  keyFormulaOrTerm?: string;
  sourceEvidence?: string;
}

export const QuizMode: React.FC<QuizModeProps> = ({ decks, initialDeckId, onExit }) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    initialDeckId || (decks[0] ? decks[0].id : '')
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const activeDeck = useMemo(() => {
    return decks.find((d) => d.id === selectedDeckId) || decks[0];
  }, [decks, selectedDeckId]);

  // Generate randomized quiz questions with distractors
  const questions: QuizQuestion[] = useMemo(() => {
    if (!activeDeck || !activeDeck.cards || activeDeck.cards.length === 0) return [];

    const cards = activeDeck.cards;
    return cards.map((card, i) => {
      // Gather wrong answers from other cards in this or other decks
      const otherAnswers = decks
        .flatMap((d) => d.cards)
        .filter((c) => c.id !== card.id && c.back !== card.back)
        .map((c) => c.back);

      // Pick 3 distractors
      const shuffledOthers = [...otherAnswers].sort(() => 0.5 - Math.random());
      const distractors = shuffledOthers.slice(0, 3);

      // If we don't have enough distractors, generate generic plausible alternatives
      while (distractors.length < 3) {
        distractors.push(
          `Inverse mechanism: variable rates decrease proportionally as concentration shifts.`
        );
      }

      const allOptions = [card.back, ...distractors].sort(() => 0.5 - Math.random());

      return {
        cardId: card.id,
        question: card.front,
        correctAnswer: card.back,
        options: allOptions,
        keyFormulaOrTerm: card.keyFormulaOrTerm,
        sourceEvidence: card.sourceEvidence,
      };
    });
  }, [activeDeck, decks]);

  const currentQ = questions[questionIndex];

  const handleSelectOption = (option: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !currentQ || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);

    if (selectedOption === currentQ.correctAnswer) {
      sound.playSuccess();
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setCorrectCount(0);
    setIsQuizFinished(false);
  };

  if (!activeDeck || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">No flashcards available for quiz</h2>
        <p className="text-sm text-slate-400">
          Create or scan a deck with at least 2 cards to unlock quiz mode.
        </p>
        <button
          onClick={onExit}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
        >
          Back to Decks
        </button>
      </div>
    );
  }

  const accuracyPct = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Deck Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Active Recall Challenge</span>
            </h2>
            <p className="text-xs text-slate-400">
              Testing accuracy on verified card concepts.
            </p>
          </div>
        </div>

        {/* Deck Dropdown Selector */}
        <div className="w-full sm:w-auto">
          <select
            value={selectedDeckId}
            onChange={(e) => {
              setSelectedDeckId(e.target.value);
              handleRestartQuiz();
            }}
            className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.cards.length} cards)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quiz Body */}
      {!isQuizFinished && currentQ ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl">
          {/* Header Progress */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Question {questionIndex + 1} of {questions.length}
            </span>

            <span className="text-xs font-semibold text-slate-400">
              Score: <strong className="text-white">{correctCount}</strong> / {questionIndex + (isAnswerSubmitted ? 1 : 0)}
            </span>
          </div>

          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <div className="py-2 space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
              {currentQ.question}
            </h3>
            {currentQ.keyFormulaOrTerm && (
              <span className="inline-block px-2.5 py-0.5 rounded bg-slate-950 text-emerald-400 text-xs font-mono border border-slate-800">
                Context: {currentQ.keyFormulaOrTerm}
              </span>
            )}
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === currentQ.correctAnswer;

              let optionStyle =
                'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40 text-slate-200';

              if (isAnswerSubmitted) {
                if (isCorrect) {
                  optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-medium';
                } else if (isSelected && !isCorrect) {
                  optionStyle = 'border-rose-500 bg-rose-500/10 text-rose-300';
                } else {
                  optionStyle = 'border-slate-800/60 bg-slate-950/30 text-slate-500';
                }
              } else if (isSelected) {
                optionStyle = 'border-emerald-400 bg-emerald-500/20 text-white font-medium';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswerSubmitted}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${optionStyle}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0 font-bold ${
                      isAnswerSubmitted && isCorrect
                        ? 'bg-emerald-500 text-slate-950'
                        : isAnswerSubmitted && isSelected && !isCorrect
                        ? 'bg-rose-500 text-white'
                        : isSelected
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm leading-relaxed">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation and Citations after submitting */}
          {isAnswerSubmitted && (
            <div
              className={`p-4 rounded-2xl border space-y-2 animate-in fade-in ${
                selectedOption === currentQ.correctAnswer
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {selectedOption === currentQ.correctAnswer ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-sm font-bold text-emerald-300">
                      Accurate & Correct!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="text-sm font-bold text-rose-300">
                      Incorrect. Academic Answer:
                    </span>
                  </>
                )}
              </div>

              {selectedOption !== currentQ.correctAnswer && (
                <p className="text-xs text-slate-200 pl-7">{currentQ.correctAnswer}</p>
              )}

              {currentQ.sourceEvidence && (
                <div className="text-[11px] text-slate-400 pl-7 italic">
                  Grounding evidence: &ldquo;{currentQ.sourceEvidence}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2 flex justify-end">
            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedOption}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>{questionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Final Score Board */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-white">Quiz Completed!</h3>
            <p className="text-sm text-slate-400">
              Deck: <strong className="text-slate-200">{activeDeck.title}</strong>
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Accuracy Score
              </span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1">{accuracyPct}%</div>
            </div>

            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Correct Answers
              </span>
              <div className="text-3xl font-extrabold text-white mt-1">
                {correctCount} / {questions.length}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleRestartQuiz}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Quiz</span>
            </button>

            <button
              onClick={onExit}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-colors"
            >
              Back to Decks
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
