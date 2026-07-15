interface AnalysisProgressViewProps {
  currentMove: number;
  totalMoves: number;
  phase: 'initializing' | 'analyzing' | 'complete';
  label: string;
}

export default function AnalysisProgressView({
  currentMove,
  totalMoves,
  phase,
  label,
}: AnalysisProgressViewProps) {
  const progress =
    totalMoves > 0 ? Math.round((currentMove / totalMoves) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Spinning loader */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-panel-surface border-t-move-best animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{progress}%</span>
        </div>
      </div>

      <h2 className="text-base font-semibold text-white mb-1">{label}</h2>

      {totalMoves > 0 && (
        <p className="text-sm text-panel-text-dim">
          Move {currentMove} of {totalMoves}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full max-w-xs mt-6">
        <div className="h-2 bg-panel-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-move-best rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-panel-text-dim mt-4">
        Engine is running in the background. Keep this popup open.
      </p>
    </div>
  );
}
