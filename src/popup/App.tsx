import { useState, useCallback } from 'react';
import { GameAnalysis, GameData, AnalysisProgress } from '../types';
import { StockfishEngine } from '../engine/stockfish';
import { analyzeGame } from '../analysis/analyzer';
import AnalysisProgressView from './AnalysisProgress';
import Dashboard from './Dashboard';
import WelcomeScreen from './WelcomeScreen';

type AppState =
  | { phase: 'idle' }
  | { phase: 'fetching' }
  | { phase: 'analyzing'; progress: AnalysisProgress }
  | { phase: 'complete'; analysis: GameAnalysis; game: GameData }
  | { phase: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'idle' });

  /** Fetch game data from Chess.com via background/content script */
  const fetchGameData = useCallback(async (): Promise<GameData | null> => {
    // First try: ask content script via background service worker
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REQUEST_GAME_DATA',
      });
      if (response?.success && response.data) {
        return response.data as GameData;
      }
    } catch {
      // Service worker may not be reachable
    }

    // Second try: get stored game data directly
    try {
      const result = await chrome.storage.local.get(['lastGameData']);
      if (result.lastGameData) {
        return result.lastGameData as GameData;
      }
    } catch {
      // Storage may not be accessible
    }

    return null;
  }, []);

  /** Start the full analysis pipeline */
  const startAnalysis = useCallback(async () => {
    setState({ phase: 'fetching' });

    try {
      // 1. Fetch game data
      const game = await fetchGameData();
      if (!game || !game.pgn) {
        setState({
          phase: 'error',
          message: 'Could not find a game to analyze. Open a completed Chess.com game first.',
        });
        return;
      }

      // 2. Initialize Stockfish engine
      const engine = new StockfishEngine();

      setState({ phase: 'analyzing', progress: { currentMove: 0, totalMoves: 0, phase: 'initializing' } });

      try {
        await engine.init();
      } catch (err) {
        engine.quit();
        setState({
          phase: 'error',
          message: `Failed to start Stockfish engine: ${err instanceof Error ? err.message : String(err)}`,
        });
        return;
      }

      // 3. Analyze the game
      try {
        const analysis = await analyzeGame(game.pgn, engine, (progress) => {
          setState({ phase: 'analyzing', progress });
        });

        engine.quit();
        setState({ phase: 'complete', analysis, game });
      } catch (err) {
        engine.quit();
        setState({
          phase: 'error',
          message: `Analysis error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    } catch (err) {
      setState({
        phase: 'error',
        message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [fetchGameData]);

  /** Reset to idle state */
  const reset = useCallback(() => {
    setState({ phase: 'idle' });
  }, []);

  switch (state.phase) {
    case 'idle':
      return <WelcomeScreen onStart={startAnalysis} />;

    case 'fetching':
      return (
        <AnalysisProgressView
          currentMove={0}
          totalMoves={0}
          phase="initializing"
          label="Fetching game data..."
        />
      );

    case 'analyzing':
      return (
        <AnalysisProgressView
          currentMove={state.progress.currentMove}
          totalMoves={state.progress.totalMoves}
          phase={state.progress.phase}
          label={
            state.progress.phase === 'initializing'
              ? 'Initializing Stockfish engine...'
              : 'Analyzing moves...'
          }
        />
      );

    case 'complete':
      return (
        <Dashboard
          analysis={state.analysis}
          game={state.game}
          onReset={reset}
          onReanalyze={startAnalysis}
        />
      );

    case 'error':
      return (
        <ErrorView message={state.message} onRetry={startAnalysis} onReset={reset} />
      );
  }
}

/** Error display component */
function ErrorView({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-semibold text-move-blunder mb-2">Error</h2>
      <p className="text-sm text-panel-text-dim mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-move-best/20 text-move-best rounded-lg hover:bg-move-best/30 transition text-sm font-medium"
        >
          Retry
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-panel-surface text-panel-text rounded-lg hover:bg-panel-border transition text-sm"
        >
          Back
        </button>
      </div>
    </div>
  );
}
