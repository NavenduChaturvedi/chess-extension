import { MoveCategory } from '../types';

/** Classification thresholds in centipawns */
interface CategoryThreshold {
  category: MoveCategory;
  minCpl: number;
  maxCpl: number;
  label: string;
  color: string;
}

export const CATEGORY_THRESHOLDS: CategoryThreshold[] = [
  { category: 'book',        minCpl: 0,   maxCpl: 5,   label: 'Book',        color: '#629924' },
  { category: 'best',        minCpl: 0,   maxCpl: 5,   label: 'Best',        color: '#629924' },
  { category: 'excellent',   minCpl: 5,   maxCpl: 25,  label: 'Excellent',   color: '#97b832' },
  { category: 'good',        minCpl: 25,  maxCpl: 75,  label: 'Good',        color: '#67b8a0' },
  { category: 'inaccuracy',  minCpl: 75,  maxCpl: 150, label: 'Inaccuracy',  color: '#f4c542' },
  { category: 'mistake',     minCpl: 150, maxCpl: 300, label: 'Mistake',     color: '#e8863a' },
  { category: 'blunder',     minCpl: 300, maxCpl: Infinity, label: 'Blunder', color: '#d32f2f' },
];

/**
 * Classify a move based on its centipawn loss.
 * Returns the most severe category the CPL falls into.
 */
export function classifyMove(cpl: number): CategoryThreshold {
  // Find the most severe category that applies
  let result = CATEGORY_THRESHOLDS[0]; // default to book/best
  for (const threshold of CATEGORY_THRESHOLDS) {
    if (cpl >= threshold.minCpl && cpl < threshold.maxCpl) {
      result = threshold;
    }
  }
  // Check if CPL exceeds the last threshold
  if (cpl >= 300) {
    return CATEGORY_THRESHOLDS[CATEGORY_THRESHOLDS.length - 1]; // blunder
  }
  return result;
}

/** Sigmoid constant for accuracy calculation */
export const ACCURACY_K = 0.07;

/**
 * Calculate overall accuracy percentage from average centipawn loss.
 * Accuracy = 100 * e^(-k * ACPL)
 */
export function calculateAccuracy(acpl: number): number {
  return 100 * Math.exp(-ACCURACY_K * acpl);
}

/** Default depth for Stockfish analysis */
export const ANALYSIS_DEPTH = 14;

/** Value to represent forced mate in evaluation (centipawns) */
export const MATE_SCORE = 100000;
