/**
 * Service for managing chrome.storage.local
 */

/**
 * 开发调试开关 (仅在测试时手工修改)
 */
const ENABLE_STATE_PERSISTENCE = true;     // 是否存取应用状态 (模式、分类、编辑框内容)
const ENABLE_FAVORITES_PERSISTENCE = true; // 是否存取收藏夹
const ENABLE_RECENT_PERSISTENCE = true;    // 是否存取最近使用

export const StorageService = {
  // --- Favorites Management ---
  async getFavorites() {
    if (!ENABLE_FAVORITES_PERSISTENCE) return [];
    return new Promise((resolve) => {
      chrome.storage.local.get({ favorites: [] }, (result) => {
        resolve(result.favorites);
      });
    });
  },

  async saveFavorites(favorites) {
    if (!ENABLE_FAVORITES_PERSISTENCE) return;
    await chrome.storage.local.set({ favorites });
  },

  async addToFavorites(char) {
    const favorites = await this.getFavorites();
    if (!favorites.includes(char)) {
      favorites.push(char);
      await this.saveFavorites(favorites);
      return true;
    }
    return false;
  },

  async removeFromFavorites(char) {
    let favorites = await this.getFavorites();
    const newFavorites = favorites.filter(f => f !== char);
    if (favorites.length !== newFavorites.length) {
      await this.saveFavorites(newFavorites);
      return true;
    }
    return false;
  },

  // --- Recent Management ---
  async getRecent() {
    if (!ENABLE_RECENT_PERSISTENCE) return [];
    return new Promise((resolve) => {
      chrome.storage.local.get({ recent: [] }, (result) => {
        resolve(result.recent);
      });
    });
  },

  async saveRecent(recent) {
    if (!ENABLE_RECENT_PERSISTENCE) return;
    await chrome.storage.local.set({ recent });
  },

  async addToRecent(item) {
    if (!item) return;
    let recent = await this.getRecent();
    // Remove if already exists to move to top
    recent = recent.filter(i => i !== item);
    // Add to front
    recent.unshift(item);
    // Limit to 21 items (3 rows in 7-column layout)
    if (recent.length > 21) {
      recent = recent.slice(0, 21);
    }
    await this.saveRecent(recent);
  },

  async removeFromRecent(item) {
    let recent = await this.getRecent();
    const newRecent = recent.filter(i => i !== item);
    if (recent.length !== newRecent.length) {
      await this.saveRecent(newRecent);
      return true;
    }
    return false;
  },

  // --- App State Management ---
  async saveAppState(state) {
    if (!ENABLE_STATE_PERSISTENCE) return;
    await chrome.storage.local.set({ appState: state });
  },

  async getAppState() {
    if (!ENABLE_STATE_PERSISTENCE) return null;
    return new Promise((resolve) => {
      chrome.storage.local.get({ appState: null }, (result) => {
        resolve(result.appState);
      });
    });
  }
};
