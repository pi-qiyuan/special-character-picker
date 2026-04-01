/**
 * Background script for Special Character Picker
 * Manages context menu and text insertion
 */
import { StorageService } from './services/storage.js';

const PARENT_MENU_ID = 'recent_chars_parent';
const MAX_RECENT_CONTEXT = 15;

/**
 * Update the context menu with recent characters
 */
async function updateContextMenu() {
  const recent = await StorageService.getRecent();
  const recentChars = recent.slice(0, MAX_RECENT_CONTEXT);

  // Clear existing items under parent
  // Note: It's often safer to remove all and recreate for context menus
  // especially when order matters.
  try {
    await chrome.contextMenus.removeAll();
  } catch (e) {
    console.error('Error clearing context menus:', e);
  }

  // Re-create parent
  chrome.contextMenus.create({
    id: PARENT_MENU_ID,
    title: chrome.i18n.getMessage('recentContext'),
    contexts: ['editable']
  });

  if (recentChars.length === 0) {
    chrome.contextMenus.create({
      id: 'no_recent_chars',
      parentId: PARENT_MENU_ID,
      title: chrome.i18n.getMessage('noCharacters'),
      enabled: false,
      contexts: ['editable']
    });
  } else {
    recentChars.forEach((char, index) => {
      chrome.contextMenus.create({
        id: `recent_char_${index}`,
        parentId: PARENT_MENU_ID,
        title: char,
        contexts: ['editable']
      });
    });
  }
}

/**
 * Insert text into the active tab's input/textarea
 */
async function insertText(tab, text) {
  // Block on restricted URLs
  if (tab.url?.startsWith('chrome://')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (msg) => alert(msg),
      args: [chrome.i18n.getMessage('blocked')]
    });
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (textToInsert) => {
        const activeElement = document.activeElement;
        if (activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
          const start = activeElement.selectionStart;
          const end = activeElement.selectionEnd;
          const value = activeElement.value;
          activeElement.value = value.substring(0, start) + textToInsert + value.substring(end);
          activeElement.selectionStart = activeElement.selectionEnd = start + textToInsert.length;
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      },
      args: [text]
    });

    if (results[0]?.result) {
      // Success: Update stats and move char to top of recent
      await StorageService.addToRecent(text);
      await StorageService.updateStats('normal', text);
      // Note: storage.onChanged will trigger updateContextMenu
    } else {
      // Failure: Show alert in tab
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msg) => alert(msg),
        args: [chrome.i18n.getMessage('insertError')]
      });
    }
  } catch (err) {
    console.error('Failed to insert character:', err);
  }
}

// Initialize on install or startup
chrome.runtime.onInstalled.addListener(updateContextMenu);
chrome.runtime.onStartup.addListener(updateContextMenu);

// Listen for storage changes to keep menu updated
chrome.storage.onChanged.addListener((changes) => {
  if (changes.recent) {
    updateContextMenu();
  }
});

// Handle menu item clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith('recent_char_')) {
    try {
      const index = parseInt(info.menuItemId.replace('recent_char_', ''), 10);
      const recent = await StorageService.getRecent();
      const char = recent[index];
      if (char) {
        await insertText(tab, char);
      }
    } catch (err) {
      console.error('Error handling context menu click:', err);
    }
  }
});
