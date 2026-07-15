import { Chess, Move } from 'chess.js';
import { StockfishEngine } from '../engine/stockfish';
import {
  MoveAnalysis,
  GameAnalysis,
  MoveCategory,
  AnalysisProgress,
} from '../types';
import {
  classifyMove,
  CATEGORY_THRESHOLDS,
  ANALYSIS_DEPTH,
  MATE_SCORE,
} from './categories';

/**
 * Analyze a chess game move-by-move using Stockfish.
 * Evaluates each position, computes centipawn loss per move,
 * classifies moves, and calculates overall accuracy.
 */
export async function analyzeGame(
  pgn: string,
  engine: StockfishEngine,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<GameAnalysis> {
  // Parse PGN and replay the game
  const chess = new Chess();
  const pgnLoadResult = chess.loadPgn(pgn);

  if (!pgnLoadResult) {
    throw new Error('Failed to parse PGN. The PGN string may be invalid.');
  }

  // Get the full move history from the loaded PGN
  // We need to replay to get FEN at each step
  chess.reset();

  const moves: MoveAnalysis[] = [];
  const halfMoves: { move: Move; fenBefore: string }[] = [];

  // Collect all moves with their starting FENs
  const history = chess.history({ verbose: true });
  chess.reset();

  for (const move of history) {
    const fenBefore = chess.fen();
    chess.move(move);
    halfMoves.push({ move, fenBefore });
  }

  if (halfMoves.length === 0) {
    throw new Error('No moves found in the PGN.');
  }

  const totalMoves = halfMoves.length;

  // Report initialization phase
  onProgress?.({
    currentMove: 0,
    totalMoves,
    phase: 'initializing',
  });

  // Analyze each position
  for (let i = 0; i < totalMoves; i++) {
    const { move, fenBefore } = halfMoves[i];

    // Evaluate the position before the move
    const evalBeforeResult = await engine.analyze(fenBefore, ANALYSIS_DEPTH);
    const evalBefore = evalBeforeResult.score;
    const bestMoveUci = evalBeforeResult.bestMove;
    const isBestMove = moveToUci(move) === bestMoveUci;

    let evalAfter = 0;
    let cpl = 0;

    if (isBestMove) {
      // Played the engine's best move — CPL is approximately 0
      cpl = 0;
      evalAfter = evalBefore; // Position doesn't change (it's the best)
    } else {
      // Need to evaluate the position after the move to compute CPL
      const chessAfter = new Chess(fenBefore);
      chessAfter.move(move.san);
      const fenAfter = chessAfter.fen();

      const evalAfterResult = await engine.analyze(fenAfter, ANALYSIS_DEPTH);
      // evalAfter is from the opponent's perspective
      // Negate to get it from the current player's perspective
      evalAfter = -evalAfterResult.score;

      // CPL = how much worse the position got for the side to move
      // Loss = E_best - E_played (both from side-to-move perspective)
      cpl = Math.max(0, evalBefore - evalAfter);
    }

    // Cap CPL for mate positions
    if (Math.abs(evalBefore) >= MATE_SCORE - 100) {
      cpl = 0; // Don't penalize moves in forced mate positions
    }

    // Classify the move
    const category = classifyMove(cpl);

    // Determine move number and color
    const moveNumber = Math.floor(i / 2) + 1;
    const color: 'w' | 'b' = i % 2 === 0 ? 'w' : 'b';

    const chessAfter = new Chess(fenBefore);
    chessAfter.move(move.san);

    const analysis: MoveAnalysis = {
      moveNumber,
      color,
      san: move.san,
      uci: moveToUci(move),
      fenBefore,
      fenAfter: chessAfter.fen(),
      evalBefore,
      evalAfter,
      cpl,
      category: category.category,
    };

    moves.push(analysis);

    // Report progress
    onProgress?.({
      currentMove: i + 1,
      totalMoves,
      latestMove: analysis,
      phase: 'analyzing',
    });
  }

  // Calculate overall accuracy
  const { acpl, accuracy, categoryCounts } = computeOverallStats(moves);

  onProgress?.({
    currentMove: totalMoves,
    totalMoves,
    phase: 'complete',
  });

  return { moves, acpl, accuracy, categoryCounts };
}

/** Convert a chess.js Move to UCI notation (e.g. "e2e4") */
function moveToUci(move: Move): string {
  return move.from + move.to + (move.promotion || '');
}

/** Compute ACPL, accuracy percentage, and category counts from move analyses */
function computeOverallStats(moves: MoveAnalysis[]): {
  acpl: number;
  accuracy: number;
  categoryCounts: Record<MoveCategory, number>;
} {
  if (moves.length === 0) {
    return {
      acpl: 0,
      accuracy: 100,
      categoryCounts: Object.fromEntries(
        CATEGORY_THRESHOLDS.map((t) => [t.category, 0])
      ) as Record<MoveCategory, number>,
    };
  }

  // Calculate average centipawn loss
  const totalCpl = moves.reduce((sum, m) => sum + m.cpl, 0);
  const acpl = totalCpl / moves.length;

  // Sigmoid accuracy: 100 * e^(-k * ACPL)
  const k = 0.07;
  const accuracy = 100 * Math.exp(-k * acpl);

  // Count categories
  const categoryCounts = Object.fromEntries(
    CATEGORY_THRESHOLDS.map((t) => [t.category, 0])
  ) as Record<MoveCategory, number>;

  for (const move of moves) {
    categoryCounts[move.category] = (categoryCounts[move.category] || 0) + 1;
  }

  return { acpl: Math.round(acpl), accuracy: Math.round(accuracy * 10) / 10, categoryCounts };
}
