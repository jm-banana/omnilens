import React, { useState } from 'react';
import {
  Layers,
  BookOpen,
  Award,
  Plus,
  Download,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Camera,
  FolderOpen,
} from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { calculateDeckAccuracy, calculateMasteryRate, exportToAnkiTSV, exportToJSON, filterCardsDue } from '../utils/srs';

interface DeckViewerProps {
  decks: Deck[];
  onSelectDeckForStudy: (deck: Deck) => void;
  onSelectDeckForQuiz: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onOpenScanner: () => void;
  onOpenNewCardModal: (deck: Deck) => void;
}

export const DeckViewer: React.FC<DeckViewerProps> = ({
  decks,
  onSelectDeckForStudy,
  onSelectDeckForQuiz,
  onDeleteDeck,
  onOpenScanner,
  onOpenNewCardModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Collect unique subjects
  const subjects = ['all', ...Array.from(new Set(decks.map((d) => d.subject).filter(Boolean)))];

  const filteredDecks = decks.filter((deck) => {
    const matchesSubject = selectedSubject === 'all' || deck.subject === selectedSubject;
    const matchesSearch =
      deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  const handleExportAnki = (deck: Deck) => {
    const tsvContent = exportToAnkiTSV(deck.title, deck.cards);
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.title.replace(/\s+/g, '_')}_anki.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = (deck: Deck) => {
    const jsonContent = exportToJSON(deck);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.title.replace(/\s+/g, '_')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Knowledge Decks</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              {decks.length} Decks
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Synthesized and verified study materials with automated Spaced Repetition (SRS).
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onOpenScanner}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Scan New Material</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search decks, tags, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedSubject === sub
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sub === 'all' ? 'All Subjects' : sub}
            </button>
          ))}
        </div>
      </div>

      {/* Decks Grid */}
      {filteredDecks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => {
            const dueCards = filterCardsDue(deck.cards);
            const avgAccuracy = calculateDeckAccuracy(deck.cards);
            const masteryRate = calculateMasteryRate(deck.cards);

            return (
              <div
                key={deck.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all group hover:-translate-y-0.5"
              >
                <div className="space-y-3">
                  {/* Top tags & subject */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                      {deck.subject}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{avgAccuracy}% Accuracy</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {deck.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {deck.description || 'Custom generated study deck.'}
                    </p>
                  </div>

                  {/* Deck Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Cards
                      </span>
                      <span className="text-sm font-bold text-white">{deck.cards.length}</span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Due Now
                      </span>
                      <span className={`text-sm font-bold ${dueCards.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {dueCards.length}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Mastery
                      </span>
                      <span className="text-sm font-bold text-emerald-400">{masteryRate}%</span>
                    </div>
                  </div>

                  {/* Mastery Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${masteryRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions & Footer */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDeckForStudy(deck)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Study Flip Deck</span>
                    </button>

                    <button
                      onClick={() => onSelectDeckForQuiz(deck)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quiz Mode</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={() => onOpenNewCardModal(deck)}
                      className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Card</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleExportAnki(deck)}
                        title="Export to Anki TSV"
                        className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Anki</span>
                      </button>

                      <button
                        onClick={() => handleExportJSON(deck)}
                        title="Backup JSON"
                        className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>JSON</span>
                      </button>

                      <button
                        onClick={() => onDeleteDeck(deck.id)}
                        title="Delete Deck"
                        className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty Search or Decks state */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No decks found</h3>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? `No decks matched "${searchQuery}". Try a different keyword.`
                : 'Start by scanning textbook pages, handwritten notes, or diagrams.'}
            </p>
          </div>
          <button
            onClick={onOpenScanner}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Launch AI Camera</span>
          </button>
        </div>
      )}
    </div>
  );
};
