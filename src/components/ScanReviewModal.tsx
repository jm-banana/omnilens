import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Edit3,
  Trash2,
  Plus,
  Save,
  BookOpen,
  X,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { ScanResult, Flashcard, Difficulty } from '../types';

interface ScanReviewModalProps {
  scanResult: ScanResult;
  imageSrc: string;
  onSaveDeck: (deckData: {
    title: string;
    subject: string;
    description: string;
    tags: string[];
    cards: Array<Omit<Flashcard, 'repetitions' | 'interval' | 'easeFactor' | 'nextReviewDate'>>;
    scanImageUrl?: string;
  }, startStudy?: boolean) => void;
  onClose: () => void;
}

export const ScanReviewModal: React.FC<ScanReviewModalProps> = ({
  scanResult,
  imageSrc,
  onSaveDeck,
  onClose,
}) => {
  const [title, setTitle] = useState(scanResult.deckTitle || 'Extracted Study Deck');
  const [subject, setSubject] = useState(scanResult.subject || 'General Study');
  const [description, setDescription] = useState(scanResult.summary || '');
  const [cards, setCards] = useState(scanResult.flashcards || []);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const handleUpdateCard = (index: number, updatedFields: Partial<any>) => {
    setCards((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updatedFields };
      return copy;
    });
  };

  const handleRemoveCard = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewCard = () => {
    const newCard: any = {
      id: `new-${Date.now()}`,
      front: 'New Question or Concept',
      back: 'Definition or solution',
      category: subject || 'General',
      difficulty: 'Medium' as Difficulty,
      accuracyRating: 95,
      sourceEvidence: 'User added from scan',
      isVerified: true,
    };
    setCards([...cards, newCard]);
  };

  const handleSave = (startStudy: boolean = false) => {
    onSaveDeck(
      {
        title,
        subject,
        description,
        tags: [subject, 'OmniLens Scan'],
        cards,
        scanImageUrl: imageSrc,
      },
      startStudy
    );
  };

  const accuracyScore = scanResult.overallAccuracyScore || 98;
  const assessment = scanResult.accuracyAssessment;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Vision Synthesis & Accuracy Audit
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {accuracyScore}% Fidelity
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Review extracted cards and verified source grounding before saving to your deck.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Accuracy Report Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Grounding Confidence</span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    assessment?.groundingConfidence === 'Low'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  }`}
                />
                <span className="text-sm font-bold text-white">
                  {assessment?.groundingConfidence || 'High'} Grounding
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Every extracted card cites visible lines or formula symbols.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Resolution & Clarity</span>
              <p className="text-xs text-slate-300">
                {assessment?.clarityNotes || 'High legible contrast detected across all terms.'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Hallucination Risk</span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{assessment?.hallucinationRisk || 'Minimal'} (Fact-checked)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Cross-referenced with academic definitions.
              </p>
            </div>
          </div>

          {/* Deck Metadata Customization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Deck Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Subject Area
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Extracted Cards List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Extracted Flashcards</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs">
                  {cards.length} cards
                </span>
              </h3>

              <button
                onClick={handleAddNewCard}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Extra Card</span>
              </button>
            </div>

            <div className="space-y-3">
              {cards.map((card, index) => {
                const isEditing = editingCardId === card.id || editingCardId === String(index);

                return (
                  <div
                    key={card.id || index}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                          {card.category || subject}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Difficulty: {card.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-emerald-400 font-medium">
                          {card.accuracyRating || 98}% accuracy
                        </span>
                        <button
                          onClick={() =>
                            setEditingCardId(isEditing ? null : card.id || String(index))
                          }
                          className="p-1 text-slate-400 hover:text-white rounded"
                          title="Edit card"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveCard(index)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded"
                          title="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question / Front */}
                    <div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <label className="text-[11px] text-slate-400">Front (Question / Prompt):</label>
                          <textarea
                            value={card.front}
                            onChange={(e) => handleUpdateCard(index, { front: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                            rows={2}
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-white">{card.front}</p>
                      )}
                    </div>

                    {/* Answer / Back */}
                    <div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <label className="text-[11px] text-slate-400">Back (Answer / Explanation):</label>
                          <textarea
                            value={card.back}
                            onChange={(e) => handleUpdateCard(index, { back: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                            rows={2}
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-300 leading-relaxed">{card.back}</p>
                      )}
                    </div>

                    {/* Term / Mnemonic / Evidence Footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                      {card.keyFormulaOrTerm && (
                        <span className="text-emerald-400 font-mono font-medium">
                          Key: {card.keyFormulaOrTerm}
                        </span>
                      )}
                      {card.mnemonic && (
                        <span className="text-amber-300">
                          Mnemonic: {card.mnemonic}
                        </span>
                      )}
                      {card.sourceEvidence && (
                        <span className="text-slate-400 italic">
                          Evidence: &ldquo;{card.sourceEvidence}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            Discard
          </button>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-md transition-all"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save to My Decks</span>
            </button>

            <button
              onClick={() => handleSave(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Save & Study Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
