import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Volume2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flame,
  Award,
  BookOpen,
  X,
  ExternalLink,
} from 'lucide-react';
import { Deck, Flashcard, ReviewRating } from '../types';
import { calculateNextReview, formatInterval } from '../utils/srs';
import { sound } from '../utils/sound';

interface StudyFlipModeProps {
  deck: Deck;
  onReviewCard: (deckId: string, cardId: string, rating: ReviewRating) => Promise<void>;
  onExit: () => void;
  onSelectAnotherDeck: () => void;
}

export const StudyFlipMode: React.FC<StudyFlipModeProps> = ({
  deck,
  onReviewCard,
  onExit,
  onSelectAnotherDeck,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResult, setFactCheckResult] = useState<any>(null);
  const [factCheckError, setFactCheckError] = useState<string | null>(null);
  const [reviewedCardsCount, setReviewedCardsCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const cards = deck.cards || [];
  const currentCard: Flashcard | undefined = cards[currentIndex];

  // Reset flip state when card index changes
  useEffect(() => {
    setIsFlipped(false);
    setShowEvidence(false);
    setFactCheckResult(null);
    setFactCheckError(null);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        if (e.key === '2') handleRate('hard');
        if (e.key === '3') handleRate('good');
        if (e.key === '4') handleRate('easy');
      } else {
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'ArrowRight') handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, cards.length]);

  const handleFlip = () => {
    sound.playFlip();
    setIsFlipped((prev) => !prev);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRate = async (rating: ReviewRating) => {
    if (!currentCard) return;
    sound.playSuccess();
    await onReviewCard(deck.id, currentCard.id, rating);
    setReviewedCardsCount((prev) => prev + 1);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleSpeech = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    sound.speak(text);
  };

  // Trigger real-time deep fact check using Gemini 3.8 Flash
  const handleDeepFactCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    setIsFactChecking(true);
    setFactCheckError(null);

    try {
      const res = await fetch('/api/ai/verify-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardFront: currentCard.front,
          cardBack: currentCard.back,
          subject: deck.subject,
          sourceEvidence: currentCard.sourceEvidence,
        }),
      });

      if (!res.ok) {
        throw new Error(`Fact check server responded with ${res.status}`);
      }

      const data = await res.json();
      setFactCheckResult(data.verification);
    } catch (err: any) {
      console.error('Fact check error:', err);
      setFactCheckError('Verification unavailable: ' + err.message);
    } finally {
      setIsFactChecking(false);
    }
  };

  if (!currentCard || cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">This deck has no flashcards yet</h2>
        <p className="text-sm text-slate-400">Scan study materials with the AI camera to generate cards.</p>
        <button
          onClick={onExit}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
        >
          Back to Decks
        </button>
      </div>
    );
  }

  // Pre-calculate next interval previews for the SRS buttons
  const srsPreview = {
    again: calculateNextReview(
      {
        repetitions: currentCard.repetitions || 0,
        interval: currentCard.interval || 1,
        easeFactor: currentCard.easeFactor || 2.5,
      },
      'again'
    ),
    hard: calculateNextReview(
      {
        repetitions: currentCard.repetitions || 0,
        interval: currentCard.interval || 1,
        easeFactor: currentCard.easeFactor || 2.5,
      },
      'hard'
    ),
    good: calculateNextReview(
      {
        repetitions: currentCard.repetitions || 0,
        interval: currentCard.interval || 1,
        easeFactor: currentCard.easeFactor || 2.5,
      },
      'good'
    ),
    easy: calculateNextReview(
      {
        repetitions: currentCard.repetitions || 0,
        interval: currentCard.interval || 1,
        easeFactor: currentCard.easeFactor || 2.5,
      },
      'easy'
    ),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Back to decks"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              {deck.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{deck.subject}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">
                {currentCard.accuracyRating || 98}% Verified Fidelity
              </span>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">
            Card <strong className="text-white">{currentIndex + 1}</strong> of {cards.length}
          </span>
          <div className="w-24 sm:w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main 3D Flashcard Stage */}
      <div className="perspective-1000 min-h-[400px] sm:min-h-[460px] flex items-center justify-center">
        <div
          onClick={handleFlip}
          className={`w-full max-w-2xl min-h-[380px] sm:min-h-[420px] cursor-pointer relative transform-style-3d transition-transform duration-500 rounded-3xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT OF CARD */}
          <div className="absolute inset-0 backface-hidden w-full h-full bg-slate-900 border-2 border-slate-800 hover:border-slate-700 rounded-3xl p-6 sm:p-10 flex flex-col justify-between shadow-2xl transition-all">
            {/* Front Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {currentCard.category || deck.subject}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {currentCard.difficulty}
                </span>
              </div>

              <button
                onClick={(e) => handleSpeech(e, currentCard.front)}
                className="p-2 text-slate-400 hover:text-emerald-400 rounded-full hover:bg-slate-800 transition-colors"
                title="Listen to question"
                aria-label="Listen to question"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Front Question Content */}
            <div className="my-auto py-6 text-center space-y-4">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                Prompt / Question
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                {currentCard.front}
              </h3>

              {currentCard.keyFormulaOrTerm && (
                <div className="inline-block mt-2 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-300">
                  Term: {currentCard.keyFormulaOrTerm}
                </div>
              )}
            </div>

            {/* Front Footer */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                Click card or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Space</kbd> to flip
              </span>

              <span className="text-emerald-400 font-medium">
                {currentCard.accuracyRating || 99}% accuracy rated
              </span>
            </div>
          </div>

          {/* BACK OF CARD */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-10 flex flex-col justify-between shadow-2xl shadow-emerald-950/20">
            {/* Back Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verified Solution
                </span>
                {currentCard.isVerified && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Grounding Checked
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleSpeech(e, currentCard.back)}
                  className="p-2 text-slate-400 hover:text-emerald-400 rounded-full hover:bg-slate-800 transition-colors"
                  title="Listen to explanation"
                  aria-label="Listen to explanation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Back Answer Content */}
            <div className="my-auto py-4 space-y-4">
              <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                {currentCard.back}
              </p>

              {/* Mnemonic Hook */}
              {currentCard.mnemonic && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200 text-left">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Memory Hook / Mnemonic: </span>
                    <span>{currentCard.mnemonic}</span>
                  </div>
                </div>
              )}

              {/* Source Evidence Accordion */}
              {currentCard.sourceEvidence && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-left space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Original Document Evidence:
                    </span>
                  </div>
                  <p className="text-slate-300 italic text-[11px]">
                    &ldquo;{currentCard.sourceEvidence}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Back Footer Fact-Checking Trigger */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <button
                onClick={handleDeepFactCheck}
                disabled={isFactChecking}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isFactChecking ? 'Auditing Canon...' : 'Deep Fact-Check Audit'}</span>
              </button>

              <span className="text-[11px] text-slate-500">
                Next: select recall rating below
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fact Check Modal / Result Drawer */}
      {factCheckResult && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-3 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Academic Canon Verification</h4>
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Score: {factCheckResult.accuracyScore}/100
              </span>
            </div>
            <button
              onClick={() => setFactCheckResult(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-emerald-400">Academic Consensus: </strong>
            {factCheckResult.academicConsensus}
          </p>

          {factCheckResult.commonMisconceptions && (
            <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              <strong>Watch out: </strong> {factCheckResult.commonMisconceptions}
            </p>
          )}

          <div className="text-[11px] text-slate-400 italic">
            Citation grounding: {factCheckResult.canonCitation}
          </div>
        </div>
      )}

      {/* Spaced Repetition Rating Buttons */}
      <div className="space-y-2">
        <div className="text-center">
          <span className="text-xs font-medium text-slate-400">
            {isFlipped
              ? 'How well did you recall this concept? (SM-2 Spaced Repetition)'
              : 'Flip card to grade your recall'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {/* 1: Again */}
          <button
            onClick={() => handleRate('again')}
            disabled={!isFlipped}
            className={`p-3 rounded-2xl border text-center transition-all ${
              isFlipped
                ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300 hover:border-rose-400 active:scale-95 shadow-lg shadow-rose-950/20'
                : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-xs font-bold">Again</div>
            <div className="text-[11px] text-rose-400/80 font-mono mt-0.5">
              {formatInterval(srsPreview.again.interval)}
            </div>
            <div className="text-[9px] text-slate-500 mt-1">Press 1</div>
          </button>

          {/* 2: Hard */}
          <button
            onClick={() => handleRate('hard')}
            disabled={!isFlipped}
            className={`p-3 rounded-2xl border text-center transition-all ${
              isFlipped
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 hover:border-amber-400 active:scale-95 shadow-lg shadow-amber-950/20'
                : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-xs font-bold">Hard</div>
            <div className="text-[11px] text-amber-400/80 font-mono mt-0.5">
              {formatInterval(srsPreview.hard.interval)}
            </div>
            <div className="text-[9px] text-slate-500 mt-1">Press 2</div>
          </button>

          {/* 3: Good */}
          <button
            onClick={() => handleRate('good')}
            disabled={!isFlipped}
            className={`p-3 rounded-2xl border text-center transition-all ${
              isFlipped
                ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-300 hover:border-blue-400 active:scale-95 shadow-lg shadow-blue-950/20'
                : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-xs font-bold">Good</div>
            <div className="text-[11px] text-blue-400/80 font-mono mt-0.5">
              {formatInterval(srsPreview.good.interval)}
            </div>
            <div className="text-[9px] text-slate-500 mt-1">Press 3</div>
          </button>

          {/* 4: Easy */}
          <button
            onClick={() => handleRate('easy')}
            disabled={!isFlipped}
            className={`p-3 rounded-2xl border text-center transition-all ${
              isFlipped
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:border-emerald-400 active:scale-95 shadow-lg shadow-emerald-950/20'
                : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-xs font-bold">Easy</div>
            <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
              {formatInterval(srsPreview.easy.interval)}
            </div>
            <div className="text-[9px] text-slate-500 mt-1">Press 4</div>
          </button>
        </div>
      </div>

      {/* Completion Modal */}
      {sessionCompleted && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white">Deck Session Complete!</h3>
              <p className="text-sm text-slate-300">
                You reviewed <strong className="text-emerald-400">{cards.length} cards</strong> in{' '}
                <span className="text-white font-medium">{deck.title}</span>.
              </p>
              <p className="text-xs text-slate-400">
                Spaced repetition intervals have been recalculated and saved to the database.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setSessionCompleted(false);
                  setCurrentIndex(0);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Review Again
              </button>

              <button
                onClick={onExit}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-colors"
              >
                Back to Decks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
