import { MoveAnalysis } from '../types';

interface EvalGraphProps {
  moves: MoveAnalysis[];
}

const GRAPH_WIDTH = 380;
const GRAPH_HEIGHT = 120;
const PADDING = { top: 10, bottom: 20, left: 35, right: 10 };
const PLOT_WIDTH = GRAPH_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = GRAPH_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * SVG line chart showing evaluation over the course of the game.
 * White advantage goes up, black advantage goes down.
 * A center line represents 0.0 eval.
 */
export default function EvalGraph({ moves }: EvalGraphProps) {
  if (moves.length === 0) return null;

  // Build eval data points — one per half-move
  // The eval is from white's perspective (negate for black's moves)
  const evalPoints: number[] = [0]; // Starting position is 0.0

  for (const move of moves) {
    // Convert centipawn eval from side-to-move to white's perspective
    const whiteEval = move.color === 'w' ? move.evalBefore : -move.evalBefore;
    evalPoints.push(clampEval(whiteEval));
  }

  // Also add eval after the last move
  const lastMove = moves[moves.length - 1];
  const finalEval = lastMove.color === 'w'
    ? -(lastMove.evalAfter)
    : lastMove.evalAfter;
  evalPoints.push(clampEval(finalEval));

  const maxEval = 800; // Clamp display to ±8 pawns
  const yScale = (cp: number): number => {
    const normalized = (clamp(cp, -maxEval, maxEval) + maxEval) / (2 * maxEval);
    return PADDING.top + PLOT_HEIGHT * (1 - normalized);
  };

  const xStep = moves.length > 0 ? PLOT_WIDTH / (evalPoints.length - 1) : PLOT_WIDTH;
  const xScale = (i: number): number => PADDING.left + i * xStep;

  // Build path
  const pathD = evalPoints
    .map((cp, i) => {
      const x = xScale(i);
      const y = yScale(cp);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Y-axis labels
  const yLabels = [
    { value: maxEval / 100, label: `+${(maxEval / 100).toFixed(0)}` },
    { value: 0, label: '0.0' },
    { value: -maxEval / 100, label: `-${(maxEval / 100).toFixed(0)}` },
  ];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yLabels.map(({ value, label }) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              y1={yScale(value * 100)}
              x2={PADDING.left + PLOT_WIDTH}
              y2={yScale(value * 100)}
              stroke="#3d3b38"
              strokeWidth={0.5}
            />
            <text
              x={PADDING.left - 4}
              y={yScale(value * 100) + 3}
              textAnchor="end"
              fill="#8b8988"
              fontSize="9"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Center line (thicker) */}
        <line
          x1={PADDING.left}
          y1={yScale(0)}
          x2={PADDING.left + PLOT_WIDTH}
          y2={yScale(0)}
          stroke="#3d3b38"
          strokeWidth={1}
        />

        {/* Fill area under/over the line */}
        <path
          d={`${pathD} L ${xScale(evalPoints.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`}
          fill="url(#evalGradient)"
          opacity={0.3}
        />

        {/* Eval line */}
        <path
          d={pathD}
          fill="none"
          stroke="#67b8a0"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Gradient for fill */}
        <defs>
          <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67b8a0" />
            <stop offset="50%" stopColor="#67b8a0" stopOpacity={0} />
            <stop offset="50%" stopColor="#e8863a" stopOpacity={0} />
            <stop offset="100%" stopColor="#e8863a" />
          </linearGradient>
        </defs>

        {/* Move number labels on x-axis */}
        {moves
          .filter((_, i) => i % 10 === 0 || i === moves.length - 1)
          .map((move) => {
            const idx = moves.indexOf(move) + 1;
            return (
              <text
                key={idx}
                x={xScale(idx)}
                y={GRAPH_HEIGHT - 4}
                textAnchor="middle"
                fill="#8b8988"
                fontSize="8"
              >
                {move.moveNumber}
              </text>
            );
          })}
      </svg>
    </div>
  );
}

/** Clamp an eval value to reasonable display range */
function clampEval(cp: number): number {
  return clamp(cp, -100000, 100000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
