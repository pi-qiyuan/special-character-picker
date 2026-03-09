import { characterCategories, categoryConfig } from './characters.js';
import { applyI18n } from './utils/i18n.js';
import { StorageService } from './services/storage.js';
import { ActionService } from './services/actions.js';
import { SearchService } from './services/search.js';
import { View } from './ui/view.js';

document.addEventListener('DOMContentLoaded', () => {
  let currentMode = 'directCopy';
  let contextChar = '';
  let currentCategory = categoryConfig[0].id;
  const categoryScrollPositions = {};
  
  let searchTimeout = null;
  let isSearching = false;

  const { elements } = View;

  // --- Logic Helpers ---

  const saveCurrentScrollPosition = () => {
    if (isSearching) return;
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
      lastCategory: elements.categorySelect.value,
      lastActiveBtnId: document.querySelector('.quick-access-buttons .action-btn.active')?.id || 'common-btn',
      editorContent: elements.editorInput.value
    });
  };

  const refreshRecentData = async () => {
    characterCategories.recent = await StorageService.getRecent();
    if (isSearching) {
      handleSearch(elements.searchInput.value);
      return;
    }
    const currentCat = elements.categorySelect.disabled ? 'favorites' : elements.categorySelect.value;
    if (currentCat === 'recent') {
      View.renderCharGrid('recent', characterCategories.recent, currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      }, SearchService.getUserTagsCache());
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
    const currentCat = isSearching ? 'search' : (elements.categorySelect.disabled ? 'favorites' : elements.categorySelect.value);
    View.showContextMenu(event.clientX, event.clientY, char, currentCat);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      isSearching = false;
      elements.searchClearBtn.style.display = 'none';
      const currentCat = elements.categorySelect.disabled ? 'favorites' : elements.categorySelect.value;
      View.renderCharGrid(currentCat, characterCategories[currentCat], currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      }, SearchService.getUserTagsCache());
      restoreScrollPosition(currentCat);
      return;
    }

    isSearching = true;
    elements.searchClearBtn.style.display = 'block';
    const results = await SearchService.search(query);
    
    View.renderSearchResults(results, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, SearchService.getUserTagsCache());
  };

  // --- Event Listeners ---

  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleSearch(e.target.value), 200);
  });

  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    handleSearch('');
    elements.searchInput.focus();
  });

  elements.commonBtn.addEventListener('click', () => {
    if (isSearching) {
      elements.searchInput.value = '';
      isSearching = false;
      elements.searchClearBtn.style.display = 'none';
    }
    saveCurrentScrollPosition();
    const targetCat = elements.categorySelect.value || categoryConfig[0].id;
    currentCategory = targetCat;
    View.updateQuickAccessActiveState('common-btn');
    elements.categorySelect.disabled = false;
    View.renderCharGrid(targetCat, characterCategories[targetCat], currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, SearchService.getUserTagsCache());
    restoreScrollPosition(targetCat);
    View.updateUIForMode(currentMode);
    saveCurrentState();
  });

  elements.favoritesBtn.addEventListener('click', () => {
    if (isSearching) {
      elements.searchInput.value = '';
      isSearching = false;
      elements.searchClearBtn.style.display = 'none';
    }
    saveCurrentScrollPosition();
    currentCategory = 'favorites';
    View.updateQuickAccessActiveState('favorites-btn');
    elements.categorySelect.disabled = true;
    View.renderCharGrid('favorites', characterCategories.favorites, currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, SearchService.getUserTagsCache());
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
    if (isSearching) {
      elements.searchInput.value = '';
      isSearching = false;
      elements.searchClearBtn.style.display = 'none';
    }
    const category = e.target.value;
    if (category) {
      saveCurrentScrollPosition();
      currentCategory = category;
      View.updateQuickAccessActiveState('common-btn');
      View.renderCharGrid(category, characterCategories[category], currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      }, SearchService.getUserTagsCache());
      restoreScrollPosition(category);
      View.updateUIForMode(currentMode);
      saveCurrentState();
    }
  });

  document.addEventListener('click', () => View.hideContextMenu());

  elements.contextMenu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const action = e.target.dataset.action;
    
    if (action === 'edit-tags') {
      const { defaultTags, userTags } = await SearchService.getTagsForChar(contextChar);
      View.showTagEditor(contextChar, defaultTags, userTags);
      View.hideContextMenu();
      return;
    }

    if (action === 'add') {
      await StorageService.addToFavorites(contextChar);
    } else if (action === 'remove') {
      await StorageService.removeFromFavorites(contextChar);
    } else if (action === 'delete') {
      await StorageService.removeFromRecent(contextChar);
    }
    
    characterCategories.favorites = await StorageService.getFavorites();
    characterCategories.recent = await StorageService.getRecent();
    
    if (isSearching) {
      handleSearch(elements.searchInput.value);
    } else {
      const currentCat = elements.categorySelect.disabled ? 'favorites' : elements.categorySelect.value;
      if (currentCat === 'favorites' || currentCat === 'recent') {
        View.renderCharGrid(currentCat, characterCategories[currentCat], currentMode, {
          onCharClick: handleCharClick,
          onCharContextMenu: handleCharContextMenu
        }, SearchService.getUserTagsCache());
        restoreScrollPosition(currentCat);
      }
    }
    View.hideContextMenu();
  });

  // --- Tag Editor Listeners ---

  elements.userTagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.saveTagsBtn.click();
    }
  });

  elements.cancelTagsBtn.addEventListener('click', () => View.hideTagEditor());

  elements.saveTagsBtn.addEventListener('click', async () => {
    await SearchService.saveUserTag(contextChar, elements.userTagsInput.value);
    
    if (isSearching) {
      handleSearch(elements.searchInput.value);
    } else {
      const currentCat = elements.categorySelect.disabled ? 'favorites' : elements.categorySelect.value;
      View.renderCharGrid(currentCat, characterCategories[currentCat], currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      }, SearchService.getUserTagsCache());
      restoreScrollPosition(currentCat);
    }
    View.hideTagEditor();
  });

  elements.tagEditorOverlay.addEventListener('click', (e) => {
    if (e.target === elements.tagEditorOverlay) View.hideTagEditor();
  });
  
  // --- Initialization ---

  const initialize = async () => {
    applyI18n();
    View.populateCategorySelect(categoryConfig);
    
    characterCategories.favorites = await StorageService.getFavorites();
    characterCategories.recent = await StorageService.getRecent();
    const userTags = await SearchService.refreshUserTags();
    
    const savedState = await StorageService.getAppState();
    const defaultCat = categoryConfig[0].id;
    
    let targetMode = 'directCopy', targetCategory = defaultCat, targetActiveBtn = 'common-btn', targetEditorContent = '';

    if (savedState) {
      targetMode = savedState.lastMode || 'directCopy';
      targetActiveBtn = savedState.lastActiveBtnId || 'common-btn';
      targetEditorContent = savedState.editorContent || '';
      targetCategory = targetActiveBtn === 'favorites-btn' ? 'favorites' : (savedState.lastCategory || defaultCat);
    }

    currentMode = targetMode;
    currentCategory = targetCategory;
    elements.editorInput.value = targetEditorContent;

    const targetRadio = document.querySelector(`input[value="${currentMode}"]`);
    if (targetRadio) targetRadio.checked = true;
    
    elements.categorySelect.value = (savedState?.lastCategory) || defaultCat;
    elements.categorySelect.disabled = (targetActiveBtn === 'favorites-btn');

    View.updateUIForMode(currentMode);
    View.updateQuickAccessActiveState(targetActiveBtn);
    View.updateEditorButtonsState();
    View.renderCharGrid(currentCategory, characterCategories[currentCategory], currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, userTags);
    restoreScrollPosition(currentCategory);

    requestAnimationFrame(() => {
      const container = document.querySelector('.container');
      if (container) container.style.opacity = '1';
    });
  };

  initialize();
});
