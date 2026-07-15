import { MoveAnalysis } from '../types';
import { CATEGORY_THRESHOLDS } from '../analysis/categories';

interface MoveListProps {
  moves: MoveAnalysis[];
}

/** Get the color and label for a move category */
function getCategoryStyle(category: string): { color: string; bg: string; label: string } {
  const threshold = CATEGORY_THRESHOLDS.find((t) => t.category === category);
  if (threshold) {
    return {
      color: threshold.color,
      bg: `${threshold.color}20`,
      label: threshold.label,
    };
  }
  return { color: '#8b8988', bg: '#3d3b3820', label: 'Unknown' };
}

/**
 * Scrollable list of moves with category badges and CPL values.
 * Moves are grouped in pairs (white + black) per move number.
 */
export default function MoveList({ moves }: MoveListProps) {
  // Group moves into pairs for display
  const pairs: { moveNumber: number; white: MoveAnalysis; black?: MoveAnalysis }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      moveNumber: moves[i].moveNumber,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-3 py-2 border-b border-panel-border text-xs text-panel-text-dim font-medium">
        <span className="w-8 text-center">#</span>
        <span className="flex-1">Move</span>
        <span className="w-12 text-center">CPL</span>
        <span className="w-16 text-center">Eval</span>
      </div>

      {/* Move rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {pairs.map((pair) => (
          <div
            key={pair.moveNumber}
            className="flex border-b border-panel-border/50 hover:bg-panel-surface/50"
          >
            {/* Move number */}
            <div className="w-8 flex items-center justify-center text-xs text-panel-text-dim font-medium">
              {pair.moveNumber}.
            </div>

            {/* White's move */}
            <MoveRow move={pair.white} />

            {/* Black's move */}
            {pair.black && <MoveRow move={pair.black} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Single move row */
function MoveRow({ move }: { move: MoveAnalysis }) {
  const style = getCategoryStyle(move.category);

  const formatEval = (cp: number): string => {
    if (Math.abs(cp) >= 100000) {
      const mateMoves = Math.abs(100000 - Math.abs(cp));
      return cp > 0 ? `M${mateMoves}` : `-M${mateMoves}`;
    }
    const sign = cp > 0 ? '+' : '';
    const pawnVal = cp / 100;
    return `${sign}${pawnVal.toFixed(1)}`;
  };

  return (
    <div className="flex flex-1 items-center px-2 py-1.5 gap-2">
      {/* SAN move */}
      <span className="flex-1 text-sm text-white font-medium truncate">
        {move.san}
      </span>

      {/* Category badge */}
      <span
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
        style={{ color: style.color, backgroundColor: style.bg }}
      >
        {style.label}
      </span>

      {/* CPL */}
      <span className="w-12 text-right text-xs text-panel-text-dim">
        {move.cpl > 0 ? `${move.cpl}` : '—'}
      </span>

      {/* Eval after move */}
      <span className="w-16 text-right text-xs text-panel-text-dim">
        {formatEval(move.evalBefore - move.evalAfter)}
      </span>
    </div>
  );
}
