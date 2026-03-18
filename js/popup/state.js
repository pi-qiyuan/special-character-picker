/**
 * Popup State Manager - Centralizes current UI state
 */
export const PopupState = {
  currentMode: 'directCopy',
  contextChar: '',
  currentCategory: '',
  favoriteCategories: [],
  favoritesData: {},
  categoryScrollPositions: {},
  isSearching: false,

  setMode(mode) {
    this.currentMode = mode;
  },

  setCategory(category) {
    this.currentCategory = category;
  },

  saveScrollPosition(category, position) {
    this.categoryScrollPositions[category] = position;
  },

  getScrollPosition(category) {
    return this.categoryScrollPositions[category] || 0;
  },

  isFavoritesMode(favoritesBtn) {
    return favoritesBtn.classList.contains('active');
  }
};
