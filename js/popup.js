import { characterCategories, categoryConfig } from './characters.js';
import { applyI18n } from './utils/i18n.js';
import { StorageService } from './services/storage.js';
import { ActionService } from './services/actions.js';
import { View } from './ui/view.js';

document.addEventListener('DOMContentLoaded', () => {
  let currentMode = 'directCopy';
  let contextChar = '';
  let currentCategory = categoryConfig[0].id;
  const categoryScrollPositions = {};

  const { elements } = View;

  // --- Logic Helpers ---

  const saveCurrentScrollPosition = () => {
    if (currentCategory) {
      categoryScrollPositions[currentCategory] = elements.charGrid.scrollTop;
    }
  };

  const restoreScrollPosition = (category) => {
    elements.charGrid.scrollTop = categoryScrollPositions[category] || 0;
  };

  const saveCurrentState = () => {
    StorageService.saveAppState({
      lastMode: currentMode,
      // Always save the value of categorySelect so we remember the last "Common" category 
      // even if we are currently in "Favorites" mode.
      lastCategory: elements.categorySelect.value,
      lastActiveBtnId: document.querySelector('.quick-access-buttons .action-btn.active')?.id || 'common-btn',
      editorContent: elements.editorInput.value
    });
  };

  const refreshRecentData = async () => {
    characterCategories.recent = await StorageService.getRecent();
    const currentCat = elements.categorySelect.disabled ? 'favorites' : elements.categorySelect.value;
    if (currentCat === 'recent') {
      View.renderCharGrid('recent', characterCategories.recent, currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      });
      restoreScrollPosition('recent');
    }
  };

  const handleCharClick = async (char) => {
    if (currentMode === 'directCopy') {
      const success = await ActionService.copyToClipboard(char, elements.copyBtn);
      if (success) {
        await StorageService.addToRecent(char);
        await refreshRecentData();
        if (elements.editorInput.value) {
          View.updateEditorButtonsState();
          saveCurrentState();
        }
      }
    } else if (currentMode === 'directInsert') {
      const success = await ActionService.insertIntoActiveInput(char, elements.insertBtn);
      if (success) {
        await StorageService.addToRecent(char);
        await refreshRecentData();
        if (elements.editorInput.value) {
          View.updateEditorButtonsState();
          saveCurrentState();
        }
      }
    } else if (currentMode === 'appendEdit') {
      elements.editorInput.value += char;
      elements.editorInput.focus();
      View.updateEditorButtonsState();
      saveCurrentState();
    }
  };

  const handleCharContextMenu = (char, event) => {
    contextChar = char;
    const currentCat = elements.categorySelect.disabled ? 'favorites' : elements.categorySelect.value;
    View.showContextMenu(event.clientX, event.clientY, currentCat);
  };

  // --- Event Listeners ---

  elements.commonBtn.addEventListener('click', () => {
    saveCurrentScrollPosition();
    const targetCat = elements.categorySelect.value || categoryConfig[0].id;
    currentCategory = targetCat;
    View.updateQuickAccessActiveState('common-btn');
    elements.categorySelect.disabled = false;
    View.renderCharGrid(targetCat, characterCategories[targetCat], currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    });
    restoreScrollPosition(targetCat);
    View.updateUIForMode(currentMode);
    saveCurrentState();
  });

  elements.favoritesBtn.addEventListener('click', () => {
    saveCurrentScrollPosition();
    currentCategory = 'favorites';
    View.updateQuickAccessActiveState('favorites-btn');
    elements.categorySelect.disabled = true;
    View.renderCharGrid('favorites', characterCategories.favorites, currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    });
    restoreScrollPosition('favorites');
    View.updateUIForMode(currentMode);
    saveCurrentState();
  });

  elements.modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentMode = e.target.value;
      View.updateUIForMode(currentMode);
      saveCurrentState();
    });
  });

  elements.editorInput.addEventListener('input', () => {
    View.updateEditorButtonsState();
    saveCurrentState();
  });

  if (elements.clearBtn) {
    elements.clearBtn.addEventListener('click', () => {
      elements.editorInput.value = '';
      View.updateEditorButtonsState();
      saveCurrentState();
      elements.editorInput.focus();
    });
  }

  elements.copyBtn.addEventListener('click', async () => {
    const content = elements.editorInput.value;
    const success = await ActionService.copyToClipboard(content, elements.copyBtn);
    if (success && content) {
      await StorageService.addToRecent(content);
      await refreshRecentData();
      View.updateEditorButtonsState();
      saveCurrentState();
    }
  });

  elements.insertBtn.addEventListener('click', async () => {
    const content = elements.editorInput.value;
    const success = await ActionService.insertIntoActiveInput(content, elements.insertBtn);
    if (success && content) {
      await StorageService.addToRecent(content);
      await refreshRecentData();
      View.updateEditorButtonsState();
      saveCurrentState();
    }
  });

  elements.categorySelect.addEventListener('change', (e) => {
    const category = e.target.value;
    if (category) {
      saveCurrentScrollPosition();
      currentCategory = category;
      View.updateQuickAccessActiveState('common-btn');
      View.renderCharGrid(category, characterCategories[category], currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      });
      restoreScrollPosition(category);
      View.updateUIForMode(currentMode);
      saveCurrentState();
    }
  });

  document.addEventListener('click', () => View.hideContextMenu());

  elements.contextMenu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const action = e.target.dataset.action;
    if (action === 'add') {
      await StorageService.addToFavorites(contextChar);
    } else if (action === 'remove') {
      await StorageService.removeFromFavorites(contextChar);
    } else if (action === 'delete') {
      await StorageService.removeFromRecent(contextChar);
    }
    
    // Refresh local data
    characterCategories.favorites = await StorageService.getFavorites();
    characterCategories.recent = await StorageService.getRecent();
    
    // Re-render if needed
    const currentCat = elements.categorySelect.disabled ? 'favorites' : elements.categorySelect.value;
    if (currentCat === 'favorites' || currentCat === 'recent') {
      View.renderCharGrid(currentCat, characterCategories[currentCat], currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      });
      restoreScrollPosition(currentCat);
    }
    
    View.hideContextMenu();
  });
  
  // --- Initialization ---

  const initialize = async () => {
    applyI18n();
    View.populateCategorySelect(categoryConfig);
    
    characterCategories.favorites = await StorageService.getFavorites();
    characterCategories.recent = await StorageService.getRecent();
    
    const savedState = await StorageService.getAppState();
    const defaultCat = categoryConfig[0].id;
    
    if (savedState) {
      currentMode = savedState.lastMode || 'directCopy';
      const targetRadio = document.querySelector(`input[value="${currentMode}"]`);
      if (targetRadio) targetRadio.checked = true;
      View.updateUIForMode(currentMode);

      if (savedState.editorContent !== undefined) {
        elements.editorInput.value = savedState.editorContent;
        View.updateEditorButtonsState();
      }

      if (savedState.lastActiveBtnId === 'favorites-btn') {
        const lastCat = savedState.lastCategory || defaultCat;
        elements.categorySelect.value = lastCat;
        elements.favoritesBtn.click();
      } else {
        const lastCat = savedState.lastCategory || defaultCat;
        elements.categorySelect.value = lastCat;
        // Trigger manual change to use our logic
        const event = new Event('change');
        elements.categorySelect.dispatchEvent(event);
      }
    } else {
      View.updateUIForMode(currentMode);
      currentCategory = defaultCat;
      View.renderCharGrid(defaultCat, characterCategories[defaultCat], currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      });
      restoreScrollPosition(defaultCat);
      View.updateQuickAccessActiveState('common-btn');
    }
  };

  initialize();
});