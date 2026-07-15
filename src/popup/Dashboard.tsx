import { GameAnalysis, GameData } from '../types';
import AccuracyGauge from './AccuracyGauge';
import CategoryBar from './CategoryBar';
import MoveList from './MoveList';
import EvalGraph from './EvalGraph';
import { Trophy, BarChart3, RefreshCw } from 'lucide-react';

interface DashboardProps {
  analysis: GameAnalysis;
  game: GameData;
  onReset: () => void;
  onReanalyze: () => void;
}

/**
 * Main dashboard component showing complete analysis results.
 * Two-column layout: left sidebar with summary stats, right with move list and eval graph.
 */
export default function Dashboard({ analysis, game, onReset, onReanalyze }: DashboardProps) {
  const { accuracy, acpl, categoryCounts, moves } = analysis;

  // Key metrics
  const totalMoves = moves.length;
  const blunders = categoryCounts.blunder || 0;
  const mistakes = categoryCounts.mistake || 0;
  const inaccuracies = categoryCounts.inaccuracy || 0;

  return (
    <div className="flex flex-col h-full bg-panel-bg">
      {/* Top bar: game info + actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-4 h-4 text-move-best shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-white font-medium truncate">
              {game.white} vs {game.black}
            </p>
            <p className="text-[10px] text-panel-text-dim">
              {game.result} · {totalMoves} moves
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onReanalyze}
            className="p-1.5 rounded hover:bg-panel-surface transition"
            title="Re-analyze"
          >
            <RefreshCw className="w-3.5 h-3.5 text-panel-text-dim" />
          </button>
          <button
            onClick={onReset}
            className="p-1.5 rounded hover:bg-panel-surface transition"
            title="New game"
          >
            <BarChart3 className="w-3.5 h-3.5 text-panel-text-dim" />
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — stats */}
        <div className="w-[200px] shrink-0 border-r border-panel-border flex flex-col">
          {/* Accuracy gauge */}
          <div className="py-3 flex justify-center">
            <AccuracyGauge accuracy={accuracy} />
          </div>

          {/* ACPL */}
          <div className="px-3 py-2 border-t border-panel-border">
            <p className="text-[10px] text-panel-text-dim uppercase tracking-wider">Avg. Centipawn Loss</p>
            <p className="text-lg font-bold text-white">{acpl}</p>
          </div>

          {/* Category breakdown bar */}
          <div className="px-3 py-3 border-t border-panel-border">
            <p className="text-[10px] text-panel-text-dim uppercase tracking-wider mb-2">Move Quality</p>
            <CategoryBar categoryCounts={categoryCounts} />
          </div>

          {/* Summary counts */}
          <div className="px-3 py-2 border-t border-panel-border flex-1">
            <p className="text-[10px] text-panel-text-dim uppercase tracking-wider mb-2">Summary</p>
            <div className="space-y-1.5">
              {blunders > 0 && (
                <StatRow label="Blunders" count={blunders} color="text-move-blunder" />
              )}
              {mistakes > 0 && (
                <StatRow label="Mistakes" count={mistakes} color="text-move-mistake" />
              )}
              {inaccuracies > 0 && (
                <StatRow label="Inaccuracies" count={inaccuracies} color="text-move-inaccuracy" />
              )}
              {inaccuracies === 0 && mistakes === 0 && blunders === 0 && (
                <p className="text-xs text-move-good">Clean game! No significant errors.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right main area — eval graph + move list */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Evaluation graph */}
          <div className="px-3 py-2 border-b border-panel-border shrink-0">
            <p className="text-[10px] text-panel-text-dim uppercase tracking-wider mb-1">Evaluation</p>
            <EvalGraph moves={moves} />
          </div>

          {/* Move list */}
          <div className="flex-1 overflow-hidden">
            <MoveList moves={moves} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-panel-text-dim">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{count}</span>
    </div>
  );
}
