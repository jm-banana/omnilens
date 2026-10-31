import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNextReview,
  formatInterval,
  filterCardsDue,
  calculateDeckAccuracy,
  calculateMasteryRate,
  exportToAnkiTSV,
} from './srs';
import { Flashcard } from '../types';

test('calculateNextReview handles "again" rating by resetting reps and reducing ease', () => {
  const card = { repetitions: 4, interval: 10, easeFactor: 2.5 };
  const fixedDate = new Date('2026-10-28T00:00:00Z');
  const result = calculateNextReview(card, 'again', fixedDate);

  assert.equal(result.repetitions, 0);
  assert.equal(result.interval, 0.04);
  assert.equal(result.easeFactor, 2.3);
  assert.ok(new Date(result.nextReviewDate).getTime() > fixedDate.getTime());
});

test('calculateNextReview handles "good" rating progression', () => {
  const cardR0 = { repetitions: 0, interval: 0, easeFactor: 2.5 };
  const r1 = calculateNextReview(cardR0, 'good');
  assert.equal(r1.repetitions, 1);
  assert.equal(r1.interval, 1);

  const r2 = calculateNextReview({ repetitions: 1, interval: 1, easeFactor: 2.5 }, 'good');
  assert.equal(r2.repetitions, 2);
  assert.equal(r2.interval, 3);

  const r3 = calculateNextReview({ repetitions: 2, interval: 3, easeFactor: 2.5 }, 'good');
  assert.equal(r3.repetitions, 3);
  assert.equal(r3.interval, 8); // Math.round(3 * 2.5) = 8
});

test('calculateNextReview enforces easeFactor floor at 1.3', () => {
  const card = { repetitions: 0, interval: 1, easeFactor: 1.35 };
  const result = calculateNextReview(card, 'again');
  assert.equal(result.easeFactor, 1.3);
});

test('formatInterval outputs concise friendly intervals', () => {
  assert.equal(formatInterval(0.04), '< 1 hr');
  assert.equal(formatInterval(0.5), '12 hrs');
  assert.equal(formatInterval(1), '1 day');
  assert.equal(formatInterval(5), '5 days');
  assert.equal(formatInterval(30), '1 mo');
});

test('filterCardsDue filters correctly based on current timestamp', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  const mockCards: Flashcard[] = [
    {
      id: '1',
      front: 'Q1',
      back: 'A1',
      category: 'Bio',
      difficulty: 'Easy',
      accuracyRating: 98,
      sourceEvidence: 'Section 1',
      isVerified: true,
      repetitions: 1,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: '2026-10-28T10:00:00Z', // due
    },
    {
      id: '2',
      front: 'Q2',
      back: 'A2',
      category: 'Bio',
      difficulty: 'Medium',
      accuracyRating: 95,
      sourceEvidence: 'Section 2',
      isVerified: true,
      repetitions: 2,
      interval: 3,
      easeFactor: 2.5,
      nextReviewDate: '2026-10-29T10:00:00Z', // not due
    },
  ];

  const due = filterCardsDue(mockCards, now);
  assert.equal(due.length, 1);
  assert.equal(due[0].id, '1');
});

test('calculateDeckAccuracy and calculateMasteryRate return expected percentages', () => {
  const cards: Flashcard[] = [
    {
      id: '1',
      front: 'Q1',
      back: 'A1',
      category: 'Bio',
      difficulty: 'Easy',
      accuracyRating: 90,
      sourceEvidence: 'Text',
      isVerified: true,
      repetitions: 3,
      interval: 6,
      easeFactor: 2.5,
      nextReviewDate: '2026-10-28T00:00:00Z',
    },
    {
      id: '2',
      front: 'Q2',
      back: 'A2',
      category: 'Bio',
      difficulty: 'Medium',
      accuracyRating: 100,
      sourceEvidence: 'Text',
      isVerified: true,
      repetitions: 1,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: '2026-10-28T00:00:00Z',
    },
  ];

  assert.equal(calculateDeckAccuracy(cards), 95);
  assert.equal(calculateMasteryRate(cards), 50); // 1 out of 2 is mastered
});

test('exportToAnkiTSV generates clean tab-separated lines', () => {
  const cards: Flashcard[] = [
    {
      id: 'c1',
      front: 'Mitochondria function?',
      back: 'Produces ATP through cellular respiration.',
      category: 'Cell Biology',
      difficulty: 'Easy',
      accuracyRating: 99,
      sourceEvidence: 'Page 44 figure 2.1',
      isVerified: true,
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: '2026-10-28T00:00:00Z',
    },
  ];

  const tsv = exportToAnkiTSV('Biology 101', cards);
  assert.ok(tsv.includes('# Deck: Biology 101'));
  assert.ok(tsv.includes('Mitochondria function?\tProduces ATP through cellular respiration.\tCell_Biology\tPage 44 figure 2.1'));
});
