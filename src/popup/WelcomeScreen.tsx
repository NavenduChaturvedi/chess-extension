import { ChessKnight } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-move-best/10 flex items-center justify-center mb-5">
        <ChessKnight className="w-9 h-9 text-move-best" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Chess Game Review</h1>
      <p className="text-sm text-panel-text-dim mb-6 max-w-[280px]">
        Analyze your completed Chess.com games locally with Stockfish. Get move-by-move accuracy scoring, centipawn loss tracking, and an overall accuracy percentage.
      </p>
      <button
        onClick={onStart}
        className="px-6 py-2.5 bg-move-best text-white rounded-lg hover:bg-move-best/90 transition font-medium text-sm shadow-lg shadow-move-best/20"
      >
        Analyze Current Game
      </button>
      <p className="text-xs text-panel-text-dim mt-4">
        Open a completed Chess.com game, then click this button.
      </p>
    </div>
  );
}
