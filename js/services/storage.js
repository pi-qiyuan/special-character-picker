/**
 * Service for managing chrome.storage.local
 */

/**
 * 开发调试开关 (仅在测试时手工修改)
 */
const ENABLE_STATE_PERSISTENCE = true;     // 是否存取应用状态 (模式、分类、编辑框内容)
const ENABLE_FAVORITES_PERSISTENCE = true; // 是否存取收藏夹
const ENABLE_RECENT_PERSISTENCE = true;    // 是否存取最近使用
const ENABLE_SEARCH_PERSISTENCE = true;    // 是否存取搜索标签

export const StorageService = {
  // --- Search Tags Management ---
  async getUserTags() {
    if (!ENABLE_SEARCH_PERSISTENCE) return {};
    return new Promise((resolve) => {
      chrome.storage.local.get({ user_tags: {} }, (result) => {
        resolve(result.user_tags);
      });
    });
  },

  async saveUserTag(char, tags) {
    if (!ENABLE_SEARCH_PERSISTENCE) return;
    const userTags = await this.getUserTags();
    if (tags && tags.trim()) {
      userTags[char] = tags.trim();
    } else {
      delete userTags[char];
    }
    await chrome.storage.local.set({ user_tags: userTags });
  },

  // --- Favorites Management ---
  async getFavoriteCategories() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ favorite_categories: null }, (result) => {
        if (!result.favorite_categories) {
          const defaultCats = [
            { id: 'default', name: 'Default', isDefault: true }
          ];
          resolve(defaultCats);
        } else {
          resolve(result.favorite_categories);
        }
      });
    });
  },

  async saveFavoriteCategories(categories) {
    await chrome.storage.local.set({ favorite_categories: categories });
  },

  async getFavorites() {
    if (!ENABLE_FAVORITES_PERSISTENCE) return { default: [] };
    return new Promise((resolve) => {
      chrome.storage.local.get({ favorites: [] }, async (result) => {
        // Migration logic: if favorites is an array, it's the old format
        if (Array.isArray(result.favorites)) {
          const oldFavorites = result.favorites;
          const newFavorites = { default: oldFavorites };
          await this.saveFavorites(newFavorites);
          resolve(newFavorites);
        } else {
          resolve(result.favorites || { default: [] });
        }
      });
    });
  },

  async saveFavorites(favorites) {
    if (!ENABLE_FAVORITES_PERSISTENCE) return;
    await chrome.storage.local.set({ favorites });
  },

  async addToFavorites(char, categoryId = 'default') {
    const favorites = await this.getFavorites();
    if (!favorites[categoryId]) {
      favorites[categoryId] = [];
    }
    
    if (!favorites[categoryId].includes(char)) {
      favorites[categoryId].push(char);
      await this.saveFavorites(favorites);
      return true;
    }
    return false;
  },

  async removeFromFavorites(char, categoryId) {
    let favorites = await this.getFavorites();
    if (categoryId) {
      if (favorites[categoryId]) {
        favorites[categoryId] = favorites[categoryId].filter(f => f !== char);
      }
    } else {
      // Remove from all categories if no categoryId provided
      for (const catId in favorites) {
        favorites[catId] = favorites[catId].filter(f => f !== char);
      }
    }
    await this.saveFavorites(favorites);
    return true;
  },

  async addCategory(name) {
    const categories = await this.getFavoriteCategories();
    const id = 'cat_' + Date.now();
    categories.push({ id, name, isDefault: false });
    await this.saveFavoriteCategories(categories);
    return id;
  },

  async renameCategory(id, newName) {
    const categories = await this.getFavoriteCategories();
    const cat = categories.find(c => c.id === id);
    if (cat && !cat.isDefault) {
      cat.name = newName;
      await this.saveFavoriteCategories(categories);
      return true;
    }
    return false;
  },

  async deleteCategory(id) {
    if (id === 'default') return false;
    
    const categories = await this.getFavoriteCategories();
    const newCategories = categories.filter(c => c.id !== id);
    await this.saveFavoriteCategories(newCategories);

    // Move characters to default category
    const favorites = await this.getFavorites();
    if (favorites[id]) {
      if (!favorites.default) favorites.default = [];
      // Merge and remove duplicates
      favorites.default = [...new Set([...favorites.default, ...favorites[id]])];
      delete favorites[id];
      await this.saveFavorites(favorites);
    }
    return true;
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
  },

  // --- Milestone Stats Management ---
  async getStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get({
        stats: {
          installDate: Date.now(),
          totalActions: 0,
          appendActions: 0,
          uniqueChars: [],
          dismissedMilestones: [],
          lastMilestoneShown: 0
        }
      }, (result) => {
        resolve(result.stats);
      });
    });
  },

  async saveStats(stats) {
    await chrome.storage.local.set({ stats });
  },

  async updateStats(actionType, char = null) {
    const stats = await this.getStats();
    stats.totalActions++;
    
    if (actionType === 'append') {
      stats.appendActions++;
    }
    
    if (char && !stats.uniqueChars.includes(char)) {
      stats.uniqueChars.push(char);
    }
    
    await this.saveStats(stats);
    return stats;
  },

  async dismissMilestone(milestoneId) {
    const stats = await this.getStats();
    if (!stats.dismissedMilestones.includes(milestoneId)) {
      stats.dismissedMilestones.push(milestoneId);
    }
    stats.lastMilestoneShown = Date.now();
    await this.saveStats(stats);
  }
};
