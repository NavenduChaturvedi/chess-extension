/**
 * Background service worker for the Chess Game Review extension.
 * Minimal relay between popup and content scripts on Chess.com tabs.
 */

import { GameData } from './types';

// Handle messages from popup
chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender, sendResponse) => {
    if (message.type === 'REQUEST_GAME_DATA') {
      // Find the active Chess.com game tab and ask its content script for data
      handleRequestGameData(sendResponse);
      return true; // Keep channel open for async
    }

    if (message.type === 'GET_STORED_GAME') {
      // Return the last stored game data from storage
      chrome.storage.local.get(['lastGameData'], (result) => {
        if (result.lastGameData) {
          sendResponse({ success: true, data: result.lastGameData });
        } else {
          sendResponse({ success: false, error: 'No stored game data found.' });
        }
      });
      return true;
    }

    return false;
  }
);

/** Forward a game data request to the active Chess.com tab's content script */
async function handleRequestGameData(
  sendResponse: (response: { success: boolean; data?: GameData; error?: string }) => void
): Promise<void> {
  try {
    // Find a Chess.com game tab
    const tabs = await chrome.tabs.query({
      url: ['*://*.chess.com/game/*'],
    });

    // Filter for tabs that likely have a game loaded (game/live or game/daily URLs)
    const gameTabs = tabs.filter(
      (tab) =>
        tab.url &&
        (tab.url.includes('/game/live/') || tab.url.includes('/game/daily/'))
    );

    if (gameTabs.length === 0) {
      // Fall back to any chess.com/game tab
      if (tabs.length === 0) {
        sendResponse({
          success: false,
          error: 'No Chess.com game tab found. Open a completed game first.',
        });
        return;
      }
    }

    const targetTab = gameTabs[0] || tabs[0];
    if (!targetTab.id) {
      sendResponse({ success: false, error: 'Could not identify the target tab.' });
      return;
    }

    // Send message to content script
    chrome.tabs.sendMessage(
      targetTab.id,
      { type: 'GET_GAME_DATA' },
      (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: `Tab error: ${chrome.runtime.lastError.message}`,
          });
          return;
        }
        if (response?.success) {
          sendResponse({ success: true, data: response.data });
        } else {
          sendResponse({
            success: false,
            error: response?.error || 'Content script returned no data.',
          });
        }
      }
    );
  } catch (err) {
    sendResponse({
      success: false,
      error: `Service worker error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
