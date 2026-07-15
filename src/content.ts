/**
 * Content script for Chess.com game pages.
 * Scrapes PGN and game metadata from completed games.
 * Listens for messages from the popup/background service worker.
 */

import { GameData } from './types';

/** Try to extract game data from the Chess.com page */
function scrapeGameData(): GameData | null {
  try {
    // Chess.com embeds game data in a <script> tag with type="application/ld+json"
    // or in window.__NEXT_DATA__, or in a data attribute
    const gameData = tryScrapeFromNextData()
      || tryScrapeFromScriptTag()
      || tryScrapeFromDom();

    return gameData;
  } catch (err) {
    console.error('[ChessReview] Failed to scrape game data:', err);
    return null;
  }
}

/** Try to get data from __NEXT_DATA__ or window variables */
function tryScrapeFromNextData(): GameData | null {
  const scripts = document.querySelectorAll('script[id="__NEXT_DATA__"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      if (data.props?.pageProps) {
        const pageProps = data.props.pageProps;
        // Chess.com game data may be nested here
        return extractFromPageProps(pageProps);
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Try to scrape from embedded JSON in script tags */
function tryScrapeFromScriptTag(): GameData | null {
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent || '';
    // Look for PGN-like content embedded in JSON
    if (text.includes('[Event "') || text.includes('1. ')) {
      try {
        // Try to extract PGN block
        const pgnMatch = text.match(
          /(\[Event\s+"[^"]*"\]\s*\n(?:\["[A-Za-z]+"\s+"[^"]*"\]\s*\n)*\n(?:1\.\s+[^\]]*)+)/
        );
        if (pgnMatch) {
          const pgn = pgnMatch[1].trim();
          return buildGameData(pgn);
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

/** Try to scrape from the DOM move list */
function tryScrapeFromDom(): GameData | null {
  // Chess.com has a move list in the game view
  // We reconstruct a minimal PGN from the page elements
  const moveElements = document.querySelectorAll(
    '[class*="move"] [class*="san"]'
  );
  if (moveElements.length === 0) return null;

  // Try to get player names
  const whiteEl = document.querySelector('[class*="player"] [class*="username"]');
  const blackEl = document.querySelectorAll('[class*="player"] [class*="username"]');

  const white = whiteEl?.textContent?.trim() || 'White';
  const black = blackEl[1]?.textContent?.trim() || 'Black';

  // Build move list
  const moves: string[] = [];
  moveElements.forEach((el) => {
    const san = el.textContent?.trim();
    if (san) moves.push(san);
  });

  if (moves.length === 0) return null;

  // Build a basic PGN
  const moveText = moves
    .map((m, i) => {
      if (i % 2 === 0) return `${Math.floor(i / 2) + 1}. ${m}`;
      return m;
    })
    .join(' ');

  const result = getGameResult();
  const date = new Date().toISOString().split('T')[0];

  const pgn = [
    `[Event "Chess.com Game"]`,
    `[Site "${location.href}"]`,
    `[Date "${date}"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${result}"]`,
    ``,
    moveText + (result !== '*' ? ` ${result}` : ''),
  ].join('\n');

  return buildGameData(pgn);
}

/** Try to extract from Next.js page props */
function extractFromPageProps(props: Record<string, unknown>): GameData | null {
  // This handles various Chess.com data layouts
  const jsonStr = JSON.stringify(props);

  // Look for a PGN string in the props
  const pgnMatch = jsonStr.match(/"(1\. [A-Za-z0-9.+\-\s]+(?:\s*\d+\.\s+[A-Za-z0-9.+\-\s]+)*)"/);
  if (pgnMatch) {
    return buildGameData(pgnMatch[1].replace(/\\"/g, '"'));
  }

  return null;
}

/** Build a GameData object from a PGN string */
function buildGameData(pgn: string): GameData {
  // Extract header values from PGN
  const white = extractPgnHeader(pgn, 'White') || 'White';
  const black = extractPgnHeader(pgn, 'Black') || 'Black';
  const result = extractPgnHeader(pgn, 'Result') || '*';
  const date = extractPgnHeader(pgn, 'Date') || new Date().toISOString().split('T')[0];

  return {
    pgn,
    white,
    black,
    result,
    date,
    url: location.href,
    timestamp: Date.now(),
  };
}

/** Extract a header value from a PGN string */
function extractPgnHeader(pgn: string, header: string): string | null {
  const match = pgn.match(new RegExp(`\\[${header}\\s+"([^"]*)"\\]`));
  return match ? match[1] : null;
}

/** Detect game result from page elements */
function getGameResult(): string {
  // Look for result indicators in the DOM
  const resultEl = document.querySelector(
    '[class*="result"], [class*="game-result"], [data-result]'
  );
  if (resultEl) {
    const text = resultEl.textContent?.trim().toLowerCase();
    if (text?.includes('white') || text?.includes('1-0')) return '1-0';
    if (text?.includes('black') || text?.includes('0-1')) return '0-1';
    if (text?.includes('draw') || text?.includes('½')) return '1/2-1/2';
  }
  return '*';
}

// ---- Message Handlers ----

chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender, sendResponse) => {
    if (message.type === 'GET_GAME_DATA') {
      const gameData = scrapeGameData();
      if (gameData) {
        // Also persist to chrome.storage for popup access
        chrome.storage.local.set({ lastGameData: gameData });
        sendResponse({ success: true, data: gameData });
      } else {
        sendResponse({ success: false, error: 'No game data found on this page.' });
      }
      return true; // Keep message channel open for async response
    }

    if (message.type === 'PING') {
      sendResponse({ pong: true, url: location.href });
      return true;
    }

    return false;
  }
);

// Log that content script is loaded
console.log('[ChessReview] Content script loaded on:', location.href);
