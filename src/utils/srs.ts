import { Flashcard, ReviewRating } from '../types';

/**
 * SM-2 inspired Spaced Repetition Scheduling algorithm
 * Ratings:
 * - 'again' (grade 1): Reset interval to 0 or 1, ease factor reduced
 * - 'hard'  (grade 2): Interval slightly increased, ease factor slightly decreased
 * - 'good'  (grade 3): Standard interval increase (interval * easeFactor)
 * - 'easy'  (grade 4): Substantial interval bonus (interval * easeFactor * 1.3)
 */
export function calculateNextReview(
  card: {
    repetitions: number;
    interval: number;
    easeFactor: number;
  },
  rating: ReviewRating,
  baseDate: Date = new Date()
): {
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: string;
} {
  let { repetitions, interval, easeFactor } = card;

  // Ensure reasonable bounds for easeFactor
  if (!easeFactor || easeFactor < 1.3) {
    easeFactor = 2.5;
  }

  let nextInterval: number;
  let nextRepetitions: number;
  let nextEaseFactor: number;

  switch (rating) {
    case 'again':
      nextRepetitions = 0;
      nextInterval = 0.04; // ~1 hour
      nextEaseFactor = Math.max(1.3, easeFactor - 0.2);
      break;

    case 'hard':
      nextRepetitions = repetitions + 1;
      nextInterval = repetitions === 0 ? 0.5 : Math.max(1, Math.round(interval * 1.2));
      nextEaseFactor = Math.max(1.3, easeFactor - 0.15);
      break;

    case 'good':
      nextRepetitions = repetitions + 1;
      if (repetitions === 0) {
        nextInterval = 1;
      } else if (repetitions === 1) {
        nextInterval = 3;
      } else {
        nextInterval = Math.round(interval * easeFactor);
      }
      nextEaseFactor = easeFactor;
      break;

    case 'easy':
      nextRepetitions = repetitions + 1;
      if (repetitions === 0) {
        nextInterval = 4;
      } else if (repetitions === 1) {
        nextInterval = 7;
      } else {
        nextInterval = Math.round(interval * easeFactor * 1.3);
      }
      nextEaseFactor = Math.min(3.0, easeFactor + 0.15);
      break;
  }

  const nextDate = new Date(baseDate.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    repetitions: nextRepetitions,
    interval: nextInterval,
    easeFactor: Number(nextEaseFactor.toFixed(2)),
    nextReviewDate: nextDate.toISOString(),
  };
}

/**
 * Human-readable interval string
 */
export function formatInterval(days: number): string {
  if (days < 0.1) return '< 1 hr';
  if (days < 1) return `${Math.round(days * 24)} hrs`;
  if (days === 1) return '1 day';
  if (days < 30) return `${Math.round(days)} days`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 mo' : `${months} mos`;
}

/**
 * Filter cards currently due for review
 */
export function filterCardsDue(cards: Flashcard[], now: Date = new Date()): Flashcard[] {
  const nowTime = now.getTime();
  return cards.filter((card) => {
    if (!card.nextReviewDate) return true;
    return new Date(card.nextReviewDate).getTime() <= nowTime;
  });
}

/**
 * Calculate average accuracy score across cards
 */
export function calculateDeckAccuracy(cards: Flashcard[]): number {
  if (!cards || cards.length === 0) return 100;
  const sum = cards.reduce((acc, curr) => acc + (curr.accuracyRating || 95), 0);
  return Math.round(sum / cards.length);
}

/**
 * Calculate deck mastery level (0-100%)
 */
export function calculateMasteryRate(cards: Flashcard[]): number {
  if (!cards || cards.length === 0) return 0;
  const masteredCount = cards.filter(
    (c) => c.repetitions >= 3 && c.interval >= 5
  ).length;
  return Math.round((masteredCount / cards.length) * 100);
}

/**
 * Export deck to Anki-compatible TSV format
 */
export function exportToAnkiTSV(deckTitle: string, cards: Flashcard[]): string {
  const header = `# Deck: ${deckTitle}\n# Front\tBack\tTags\tSource_Evidence\n`;
  const rows = cards.map((c) => {
    const cleanFront = c.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const cleanBack = c.back.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const tags = c.category ? c.category.replace(/\s+/g, '_') : 'OmniLens';
    const evidence = (c.sourceEvidence || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    return `${cleanFront}\t${cleanBack}\t${tags}\t${evidence}`;
  });
  return header + rows.join('\n');
}

/**
 * Export deck to standard JSON backup
 */
export function exportToJSON(deck: any): string {
  return JSON.stringify(deck, null, 2);
}
