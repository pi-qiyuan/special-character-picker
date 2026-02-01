/**
 * Service for core actions like copying and inserting text
 */
import { getMessage } from '../utils/i18n.js';
import { Toast } from '../ui/toast.js';

export const ActionService = {
  /**
   * Copy text to clipboard and show feedback on the button
   */
  async copyToClipboard(text, copyBtn) {
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('success');
      Toast.show(getMessage('copied'), 'success');
      setTimeout(() => {
        copyBtn.classList.remove('success');
      }, 1500);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  },

  /**
   * Insert text into the active tab's input/textarea
   */
  async insertIntoActiveInput(text, insertBtn) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return false;

    // Block on restricted URLs
    if (tab.url?.startsWith('chrome://')) {
      insertBtn.classList.add('error');
      Toast.show(getMessage('blocked'), 'error');
      setTimeout(() => {
        insertBtn.classList.remove('error');
      }, 1500);
      return false;
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
        insertBtn.classList.add('success');
        Toast.show(getMessage('inserted'), 'success');
        setTimeout(() => {
          insertBtn.classList.remove('success');
        }, 1500);
        return true;
      } else {
        alert(getMessage('insertError'));
        return false;
      }
    } catch (err) {
      console.error('Failed to insert character:', err);
      return false;
    }
  }
};
