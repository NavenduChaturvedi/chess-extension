/** Evaluation returned from Stockfish for a single position */
export interface EngineEval {
  /** Best move in UCI notation (e.g. "e2e4") */
  bestMove: string;
  /** Evaluation in centipawns from the side to move's perspective */
  score: number;
  /** Depth reached */
  depth: number;
  /** Principal variation moves in UCI notation */
  pv: string[];
}

/** Classification for a single move */
export type MoveCategory =
  | 'book'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

/** Result for a single ply (half-move) */
export interface MoveAnalysis {
  /** Move number (1-indexed) */
  moveNumber: number;
  /** "w" for white's turn, "b" for black's turn */
  color: 'w' | 'b';
  /** Move in SAN notation (e.g. "e4") */
  san: string;
  /** Move in UCI notation (e.g. "e2e4") */
  uci: string;
  /** FEN before this move was played */
  fenBefore: string;
  /** FEN after this move was played */
  fenAfter: string;
  /** Evaluation of the position before the move (side-to-move perspective) */
  evalBefore: number;
  /** Evaluation of the position after the move (opponent's perspective) */
  evalAfter: number;
  /** Centipawn loss = how much worse the position became */
  cpl: number;
  /** Classification of the move */
  category: MoveCategory;
}

/** Overall analysis result for a full game */
export interface GameAnalysis {
  /** Individual move analyses */
  moves: MoveAnalysis[];
  /** Average centipawn loss across all moves */
  acpl: number;
  /** Overall accuracy percentage (sigmoid) */
  accuracy: number;
  /** Count of each move category */
  categoryCounts: Record<MoveCategory, number>;
}

/** Game data scraped from Chess.com */
export interface GameData {
  /** Standard PGN string */
  pgn: string;
  /** White player name */
  white: string;
  /** Black player name */
  black: string;
  /** Game result: "1-0", "0-1", "1/2-1/2", "*" */
  result: string;
  /** Date of the game */
  date: string;
  /** Chess.com URL of the game */
  url: string;
  /** Timestamp when data was stored */
  timestamp: number;
}

/** Progress callback during analysis */
export interface AnalysisProgress {
  /** Current move index (0-indexed) */
  currentMove: number;
  /** Total number of half-moves */
  totalMoves: number;
  /** The latest completed move analysis */
  latestMove?: MoveAnalysis;
  /** Current phase description */
  phase: 'initializing' | 'analyzing' | 'complete';
}
