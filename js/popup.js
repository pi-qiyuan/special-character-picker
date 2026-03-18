import { characterCategories, categoryConfig } from './characters.js';
import { applyI18n, getMessage } from './utils/i18n.js';
import { StorageService } from './services/storage.js';
import { ActionService } from './services/actions.js';
import { SearchService } from './services/search.js';
import { MilestoneService } from './services/milestones.js';
import { View } from './ui/view.js';
import { Toast } from './ui/toast.js';
import { PopupState } from './popup/state.js';

document.addEventListener('DOMContentLoaded', () => {
  const { elements } = View;
  let searchTimeout = null;

  // --- Logic Helpers ---

  const saveCurrentState = () => {
    StorageService.saveAppState({
      lastMode: PopupState.currentMode,
      lastCategory: elements.categorySelect.value,
      lastActiveBtnId: document.querySelector('.quick-access-buttons .action-btn.active')?.id || 'common-btn',
      editorContent: elements.editorInput.value
    });
  };

  const refreshData = async () => {
    PopupState.favoriteCategories = await StorageService.getFavoriteCategories();
    PopupState.favoritesData = await StorageService.getFavorites();
    characterCategories.recent = await StorageService.getRecent();
    
    // Update characterCategories with dynamic favorites categories
    for (const cat of PopupState.favoriteCategories) {
      characterCategories[cat.id] = PopupState.favoritesData[cat.id] || [];
    }

    if (PopupState.isSearching) {
      handleSearch(elements.searchInput.value);
      return;
    }

    const currentCat = elements.categorySelect.value;
    const inFavMode = PopupState.isFavoritesMode(elements.favoritesBtn);
    
    if (inFavMode) {
      View.populateCategorySelect(PopupState.favoriteCategories, true);
      if (!PopupState.favoriteCategories.find(c => c.id === currentCat)) {
        PopupState.currentCategory = 'default';
      } else {
        PopupState.currentCategory = currentCat;
      }
      elements.categorySelect.value = PopupState.currentCategory;
    } else {
      View.populateCategorySelect(categoryConfig, false);
      elements.categorySelect.value = currentCat;
    }

    View.renderCharGrid(PopupState.currentCategory, characterCategories[PopupState.currentCategory], PopupState.currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, SearchService.getUserTagsCache(), inFavMode);
    elements.charGrid.scrollTop = PopupState.getScrollPosition(PopupState.currentCategory);
  };

  const handleCharClick = async (char) => {
    if (PopupState.currentMode === 'directCopy') {
      const success = await ActionService.copyToClipboard(char, elements.copyBtn);
      if (success) {
        await StorageService.addToRecent(char);
        const stats = await StorageService.updateStats('normal', char);
        await MilestoneService.check(stats, PopupState.favoritesData);
        await refreshData();
        if (elements.editorInput.value) {
          View.updateEditorButtonsState();
          saveCurrentState();
        }
      }
    } else if (PopupState.currentMode === 'directInsert') {
      const success = await ActionService.insertIntoActiveInput(char, elements.insertBtn);
      if (success) {
        await StorageService.addToRecent(char);
        const stats = await StorageService.updateStats('normal', char);
        await MilestoneService.check(stats, PopupState.favoritesData);
        await refreshData();
        if (elements.editorInput.value) {
          View.updateEditorButtonsState();
          saveCurrentState();
        }
      }
    } else if (PopupState.currentMode === 'appendEdit') {
      elements.editorInput.value += char;
      elements.editorInput.focus();
      View.updateEditorButtonsState();
      saveCurrentState();
    }
  };

  const handleCharContextMenu = (char, event) => {
    PopupState.contextChar = char;
    const currentCat = PopupState.isSearching ? 'search' : elements.categorySelect.value;
    View.showContextMenu(event.clientX, event.clientY, char, currentCat);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      PopupState.isSearching = false;
      elements.searchClearBtn.style.display = 'none';
      const currentCat = elements.categorySelect.value;
      View.renderCharGrid(currentCat, characterCategories[currentCat], PopupState.currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      }, SearchService.getUserTagsCache(), PopupState.isFavoritesMode(elements.favoritesBtn));
      elements.charGrid.scrollTop = PopupState.getScrollPosition(currentCat);
      return;
    }

    PopupState.isSearching = true;
    elements.searchClearBtn.style.display = 'block';
    const results = await SearchService.search(query);
    
    View.renderSearchResults(results, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, SearchService.getUserTagsCache());
  };

  // --- Event Listeners ---

  const catManagerCallbacks = {
    onRename: async (id, newName) => {
      await StorageService.renameCategory(id, newName);
      await refreshData();
      View.showCatManager(PopupState.favoriteCategories, catManagerCallbacks);
    },
    onDelete: async (id) => {
      await StorageService.deleteCategory(id);
      await refreshData();
      View.showCatManager(PopupState.favoriteCategories, catManagerCallbacks);
    }
  };

  elements.manageCatsBtn.addEventListener('click', () => {
    View.showCatManager(PopupState.favoriteCategories, catManagerCallbacks);
  });

  elements.addCatBtn.addEventListener('click', async () => {
    const name = elements.newCatInput.value.trim();
    if (name) {
      await StorageService.addCategory(name);
      await refreshData();
      elements.newCatInput.value = '';
      View.showCatManager(PopupState.favoriteCategories, catManagerCallbacks);
    }
  });

  elements.closeCatManagerBtn.addEventListener('click', () => View.hideCatManager());
  
  elements.catManagerOverlay.addEventListener('click', (e) => {
    if (e.target === elements.catManagerOverlay) View.hideCatManager();
  });

  elements.cancelCatSelectorBtn.addEventListener('click', () => View.hideCatSelector());
  
  elements.catSelectorOverlay.addEventListener('click', (e) => {
    if (e.target === elements.catSelectorOverlay) View.hideCatSelector();
  });

  elements.milestoneRateBtn.addEventListener('click', () => {
    const milestoneId = elements.milestoneBanner.dataset.activeId;
    MilestoneService.dismiss(milestoneId);
    window.open('https://chromewebstore.google.com/detail/special-character-picker/ejofkafmbaaipjkegidfegeilldhcacm', '_blank');
  });

  elements.milestoneCoffeeBtn.addEventListener('click', () => {
    const milestoneId = elements.milestoneBanner.dataset.activeId;
    MilestoneService.dismiss(milestoneId);
    window.open('https://ko-fi.com/qiyuanyang', '_blank');
  });

  elements.milestoneCloseBtn.addEventListener('click', () => {
    const milestoneId = elements.milestoneBanner.dataset.activeId;
    MilestoneService.dismiss(milestoneId);
  });

  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleSearch(e.target.value), 200);
  });

  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    handleSearch('');
    elements.searchInput.focus();
  });

  elements.commonBtn.addEventListener('click', async () => {
    if (PopupState.isSearching) {
      elements.searchInput.value = '';
      PopupState.isSearching = false;
      elements.searchClearBtn.style.display = 'none';
    }
    PopupState.saveScrollPosition(PopupState.currentCategory, elements.charGrid.scrollTop);
    View.updateQuickAccessActiveState('common-btn');
    View.populateCategorySelect(categoryConfig, false);
    
    const savedState = await StorageService.getAppState();
    const targetCat = (savedState?.lastActiveBtnId === 'common-btn' ? savedState.lastCategory : null) || categoryConfig[0].id;
    PopupState.currentCategory = targetCat;
    elements.categorySelect.value = targetCat;
    View.renderCharGrid(targetCat, characterCategories[targetCat], PopupState.currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, SearchService.getUserTagsCache(), false);
    elements.charGrid.scrollTop = PopupState.getScrollPosition(targetCat);
    View.updateUIForMode(PopupState.currentMode);
    saveCurrentState();
  });

  elements.favoritesBtn.addEventListener('click', async () => {
    if (PopupState.isSearching) {
      elements.searchInput.value = '';
      PopupState.isSearching = false;
      elements.searchClearBtn.style.display = 'none';
    }
    PopupState.saveScrollPosition(PopupState.currentCategory, elements.charGrid.scrollTop);
    View.updateQuickAccessActiveState('favorites-btn');
    View.populateCategorySelect(PopupState.favoriteCategories, true);
    
    const savedState = await StorageService.getAppState();
    const targetCat = (savedState?.lastActiveBtnId === 'favorites-btn' ? savedState.lastCategory : null) || 'default';
    PopupState.currentCategory = targetCat;
    elements.categorySelect.value = targetCat;
    View.renderCharGrid(targetCat, characterCategories[targetCat], PopupState.currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, SearchService.getUserTagsCache(), true);
    elements.charGrid.scrollTop = PopupState.getScrollPosition(targetCat);
    View.updateUIForMode(PopupState.currentMode);
    saveCurrentState();
  });

  elements.modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      PopupState.currentMode = e.target.value;
      View.updateUIForMode(PopupState.currentMode);
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
      const stats = await StorageService.updateStats(PopupState.currentMode === 'appendEdit' ? 'append' : 'normal');
      await MilestoneService.check(stats, PopupState.favoritesData);
      await refreshData();
      View.updateEditorButtonsState();
      saveCurrentState();
    }
  });

  elements.insertBtn.addEventListener('click', async () => {
    const content = elements.editorInput.value;
    const success = await ActionService.insertIntoActiveInput(content, elements.insertBtn);
    if (success && content) {
      await StorageService.addToRecent(content);
      const stats = await StorageService.updateStats(PopupState.currentMode === 'appendEdit' ? 'append' : 'normal');
      await MilestoneService.check(stats, PopupState.favoritesData);
      await refreshData();
      View.updateEditorButtonsState();
      saveCurrentState();
    }
  });

  elements.categorySelect.addEventListener('change', (e) => {
    if (PopupState.isSearching) {
      elements.searchInput.value = '';
      PopupState.isSearching = false;
      elements.searchClearBtn.style.display = 'none';
    }
    const category = e.target.value;
    if (category) {
      PopupState.saveScrollPosition(PopupState.currentCategory, elements.charGrid.scrollTop);
      PopupState.currentCategory = category;
      View.renderCharGrid(category, characterCategories[category], PopupState.currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      }, SearchService.getUserTagsCache(), PopupState.isFavoritesMode(elements.favoritesBtn));
      elements.charGrid.scrollTop = PopupState.getScrollPosition(category);
      View.updateUIForMode(PopupState.currentMode);
      saveCurrentState();
    }
  });

  document.addEventListener('click', () => View.hideContextMenu());

  elements.contextMenu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const action = e.target.dataset.action;
    
    if (action === 'edit-tags') {
      const { defaultTags, userTags } = await SearchService.getTagsForChar(PopupState.contextChar);
      View.showTagEditor(PopupState.contextChar, defaultTags, userTags);
      View.hideContextMenu();
      return;
    }

    if (action === 'add') {
      if (PopupState.favoriteCategories.length > 1) {
        View.showCatSelector(PopupState.favoriteCategories, async (catId) => {
          await StorageService.addToFavorites(PopupState.contextChar, catId);
          await refreshData();
          Toast.show(getMessage('addedToFavorites'));
          const stats = await StorageService.getStats();
          await MilestoneService.check(stats, PopupState.favoritesData);
        });
      } else {
        await StorageService.addToFavorites(PopupState.contextChar, 'default');
        await refreshData();
        Toast.show(getMessage('addedToFavorites'));
        const stats = await StorageService.getStats();
        await MilestoneService.check(stats, PopupState.favoritesData);
      }
    } else if (action === 'remove') {
      await StorageService.removeFromFavorites(PopupState.contextChar, PopupState.currentCategory);
      await refreshData();
    } else if (action === 'delete') {
      await StorageService.removeFromRecent(PopupState.contextChar);
      await refreshData();
    }
    
    View.hideContextMenu();
  });

  elements.userTagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.saveTagsBtn.click();
    }
  });

  elements.cancelTagsBtn.addEventListener('click', () => View.hideTagEditor());

  elements.saveTagsBtn.addEventListener('click', async () => {
    await SearchService.saveUserTag(PopupState.contextChar, elements.userTagsInput.value);
    
    if (PopupState.isSearching) {
      handleSearch(elements.searchInput.value);
    } else {
      const currentCat = elements.categorySelect.value;
      View.renderCharGrid(currentCat, characterCategories[currentCat], PopupState.currentMode, {
        onCharClick: handleCharClick,
        onCharContextMenu: handleCharContextMenu
      }, SearchService.getUserTagsCache(), PopupState.isFavoritesMode(elements.favoritesBtn));
      elements.charGrid.scrollTop = PopupState.getScrollPosition(currentCat);
    }
    View.hideTagEditor();
  });

  elements.tagEditorOverlay.addEventListener('click', (e) => {
    if (e.target === elements.tagEditorOverlay) View.hideTagEditor();
  });
  
  const initialize = async () => {
    applyI18n();
    
    PopupState.favoriteCategories = await StorageService.getFavoriteCategories();
    PopupState.favoritesData = await StorageService.getFavorites();
    characterCategories.recent = await StorageService.getRecent();
    for (const cat of PopupState.favoriteCategories) {
      characterCategories[cat.id] = PopupState.favoritesData[cat.id] || [];
    }

    const userTags = await SearchService.refreshUserTags();
    const savedState = await StorageService.getAppState();
    
    const defaultCommonCat = categoryConfig[0].id;
    let targetMode = 'directCopy', targetCategory = defaultCommonCat, targetActiveBtn = 'common-btn', targetEditorContent = '';

    if (savedState) {
      targetMode = savedState.lastMode || 'directCopy';
      targetActiveBtn = savedState.lastActiveBtnId || 'common-btn';
      targetEditorContent = savedState.editorContent || '';
      targetCategory = savedState.lastCategory || (targetActiveBtn === 'favorites-btn' ? 'default' : defaultCommonCat);
    }

    PopupState.currentMode = targetMode;
    PopupState.currentCategory = targetCategory;
    elements.editorInput.value = targetEditorContent;

    const targetRadio = document.querySelector(`input[value="${PopupState.currentMode}"]`);
    if (targetRadio) targetRadio.checked = true;
    
    const inFavMode = targetActiveBtn === 'favorites-btn';
    View.populateCategorySelect(inFavMode ? PopupState.favoriteCategories : categoryConfig, inFavMode);
    elements.categorySelect.value = PopupState.currentCategory;

    View.updateUIForMode(PopupState.currentMode);
    View.updateQuickAccessActiveState(targetActiveBtn);
    View.updateEditorButtonsState();
    View.renderCharGrid(PopupState.currentCategory, characterCategories[PopupState.currentCategory], PopupState.currentMode, {
      onCharClick: handleCharClick,
      onCharContextMenu: handleCharContextMenu
    }, userTags, inFavMode);
    elements.charGrid.scrollTop = PopupState.getScrollPosition(PopupState.currentCategory);

    const stats = await StorageService.getStats();
    await MilestoneService.check(stats, PopupState.favoritesData);

    requestAnimationFrame(() => {
      const container = document.querySelector('.container');
      if (container) container.style.opacity = '1';
    });
  };

  initialize();
});
