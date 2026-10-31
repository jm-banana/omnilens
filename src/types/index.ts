export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  keyFormulaOrTerm?: string;
  mnemonic?: string;
  category: string;
  difficulty: Difficulty;
  accuracyRating: number; // 0-100
  sourceEvidence: string; // Direct evidence/quote/element from scan
  verifiedFactCheck?: string; // Academic grounding or cross-verification note
  isVerified: boolean;
  flaggedForReview?: boolean;
  
  // Spaced Repetition (SM-2 Algorithm parameters)
  repetitions: number;
  interval: number; // in days
  easeFactor: number; // default 2.5
  nextReviewDate: string; // ISO date string
  lastReviewed?: string; // ISO date string
  history?: Array<{
    date: string;
    rating: ReviewRating;
  }>;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  cards: Flashcard[];
  cardsCount?: number;
  averageAccuracy?: number;
  scanImageUrl?: string;
}

export interface AccuracyAssessment {
  groundingConfidence: 'High' | 'Medium' | 'Low';
  clarityNotes: string;
  potentialAmbiguities: string[];
  hallucinationRisk: 'Minimal' | 'Moderate' | 'High';
  verifiedSourceCitations: string[];
}

export interface ScanResult {
  deckTitle: string;
  subject: string;
  summary: string;
  overallAccuracyScore: number;
  accuracyAssessment: AccuracyAssessment;
  flashcards: Array<Omit<Flashcard, 'repetitions' | 'interval' | 'easeFactor' | 'nextReviewDate'>>;
  extractedTextSnippet?: string;
}

export interface SampleScanPreset {
  id: string;
  title: string;
  subject: string;
  description: string;
  previewUrl: string;
  cardsCount: number;
  tags: string[];
}
