import { EngineEval } from '../types';

/** Promise-based wrapper around Stockfish WASM running in a Web Worker */
export class StockfishEngine {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingResolvers = new Map<
    number,
    {
      resolve: (value: EngineEval) => void;
      reject: (reason: Error) => void;
      isReady: boolean;
    }
  >();
  private bestLines = new Map<number, EngineEval>();
  private initPromise: Promise<void> | null = null;
  private isReady = false;

  /** Initialize the Stockfish engine by spawning a Web Worker */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // Locate the Stockfish worker script from the extension's bundled files
        const stockfishUrl = chrome.runtime.getURL('vendor/stockfish.js');
        this.worker = new Worker(stockfishUrl);

        this.worker.onmessage = (e: MessageEvent) => {
          const line: string =
            typeof e.data === 'string' ? e.data : e.data?.data ?? '';

          // Handle UCI protocol lines
          if (line === 'uciok') {
            // Engine acknowledged UCI mode
            return;
          }

          if (line === 'readyok') {
            this.isReady = true;
            return;
          }

          if (line.startsWith('info') && line.includes('score')) {
            this.parseInfoLine(line);
            return;
          }

          if (line.startsWith('bestmove')) {
            this.handleBestMove(line);
            return;
          }
        };

        this.worker.onerror = (err) => {
          reject(new Error(`Stockfish worker error: ${err.message}`));
        };

        // Send UCI initialization sequence
        this.send('uci');
        await this.waitForLine('uciok', 5000);

        // Configure for single-threaded, limited hash
        this.send('setoption name Threads value 1');
        this.send('setoption name Hash value 16');

        // Wait for engine to be ready
        this.send('isready');
        await this.waitForLine('readyok', 10000);

        resolve();
      } catch (err) {
        this.initPromise = null;
        reject(
          err instanceof Error ? err : new Error('Failed to init Stockfish')
        );
      }
    });

    return this.initPromise;
  }

  /**
   * Analyze a position and return the engine evaluation.
   * @param fen - FEN string of the position to analyze
   * @param depth - Analysis depth (default 14)
   */
  async analyze(fen: string, depth: number = 14): Promise<EngineEval> {
    if (!this.worker || !this.isReady) {
      throw new Error('Engine not initialized. Call init() first.');
    }

    return new Promise<EngineEval>((resolve, reject) => {
      const id = ++this.messageId;

      // Clear previous best line tracking for this request
      this.bestLines.set(id, {
        bestMove: '',
        score: 0,
        depth: 0,
        pv: [],
      });

      const timeout = setTimeout(() => {
        this.pendingResolvers.delete(id);
        this.bestLines.delete(id);
        reject(new Error(`Analysis timeout for position: ${fen}`));
      }, 120_000); // 2 minute timeout per position

      this.pendingResolvers.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          this.bestLines.delete(id);
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timeout);
          this.bestLines.delete(id);
          reject(reason);
        },
        isReady: true,
      });

      // Tell engine to forget previous position
      this.send('ucinewgame');
      this.send('isready');

      // Set position and start analysis
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  /** Terminate the Stockfish worker and clean up */
  quit(): void {
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.initPromise = null;
    }
    // Reject any pending promises
    for (const [, resolver] of this.pendingResolvers) {
      resolver.reject(new Error('Engine shut down'));
    }
    this.pendingResolvers.clear();
    this.bestLines.clear();
  }

  /** Send a UCI command to the worker */
  private send(command: string): void {
    this.worker?.postMessage(command);
  }

  /** Wait for a specific UCI response line */
  private waitForLine(
    target: string,
    timeoutMs: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for "${target}"`));
      }, timeoutMs);

      const handler = (e: MessageEvent) => {
        const line: string =
          typeof e.data === 'string' ? e.data : e.data?.data ?? '';
        if (line.trim() === target) {
          clearTimeout(timer);
          this.worker?.removeEventListener('message', handler);
          resolve(line);
        }
      };

      this.worker?.addEventListener('message', handler);
    });
  }

  /** Parse an `info depth ... score ...` line from Stockfish output */
  private parseInfoLine(line: string): void {
    if (this.pendingResolvers.size === 0) return;

    // Parse depth and score from the line
    const depthMatch = line.match(/\bdepth (\d+)/);
    const scoreMatch = line.match(
      /\bscore (cp (-?\d+)|mate (-?\d+))/
    );
    const pvMatch = line.match(/\bpv (.+)/);
    const multipvMatch = line.match(/\bmultipv (\d+)/);

    if (!depthMatch || !scoreMatch) return;

    // Only use multipv 1 (main line)
    if (multipvMatch && multipvMatch[1] !== '1') return;

    const depth = parseInt(depthMatch[1], 10);
    let score: number;

    if (scoreMatch[2] !== undefined) {
      // Centipawn score
      score = parseInt(scoreMatch[2], 10);
    } else {
      // Mate score — convert to large centipawn value
      const mateMoves = parseInt(scoreMatch[3], 10);
      score = mateMoves > 0 ? 100000 - mateMoves : -100000 - mateMoves;
    }

    const pv = pvMatch ? pvMatch[1].split(' ') : [];

    // Update the most recent request's best line
    // We use the highest messageId as the "current" request
    const maxId = Math.max(...this.pendingResolvers.keys());
    const current = this.bestLines.get(maxId);
    if (current && depth >= current.depth) {
      current.depth = depth;
      current.score = score;
      current.pv = pv;
      current.bestMove = pv[0] || '';
    }
  }

  /** Handle a `bestmove` line — resolve the pending promise */
  private handleBestMove(line: string): void {
    if (this.pendingResolvers.size === 0) return;

    const match = line.match(/bestmove (\S+)/);
    const bestMove = match ? match[1] : '';

    // Resolve the oldest pending request
    const oldestId = Math.min(...this.pendingResolvers.keys());
    const resolver = this.pendingResolvers.get(oldestId);
    if (resolver) {
      const best = this.bestLines.get(oldestId);
      resolver.resolve({
        bestMove: bestMove || best?.bestMove || '',
        score: best?.score ?? 0,
        depth: best?.depth ?? 0,
        pv: best?.pv ?? [],
      });
      this.pendingResolvers.delete(oldestId);
    }
  }
}
