/**
 * Search Service - Handles indexing, tag loading, and matching logic
 */
import { characterCategories } from '../characters.js';
import { StorageService } from './storage.js';

let searchIndexInitialized = false;
let searchTags = {};    // System tags from files
let userTags = {};      // Custom tags from storage
let allCharacters = []; // Unique pool of all characters

export const SearchService = {
  /**
   * Lazy initialization of the search engine
   */
  async initialize() {
    if (searchIndexInitialized) return;

    const lang = chrome.i18n.getUILanguage().replace('-', '_');
    
    try {
      // 1. Always load English as base/fallback
      const enModule = await import('../data/search/en.js');
      searchTags = { ...enModule.search_tags_en };

      // 2. If not English, merge current language tags
      if (!['en', 'en_US', 'en_GB'].includes(lang)) {
        let langModule;
        let tags;
        
        if (lang === 'zh_CN') {
          langModule = await import('../data/search/zh_CN.js');
          tags = langModule.search_tags_zh;
        } else if (lang.startsWith('de')) {
          langModule = await import('../data/search/de.js');
          tags = langModule.search_tags_de;
        } else if (lang.startsWith('es')) {
          langModule = await import('../data/search/es.js');
          tags = langModule.search_tags_es;
        } else if (lang.startsWith('fr')) {
          langModule = await import('../data/search/fr.js');
          tags = langModule.search_tags_fr;
        } else if (lang.startsWith('ja')) {
          langModule = await import('../data/search/ja.js');
          tags = langModule.search_tags_ja;
        } else if (lang.startsWith('ko')) {
          langModule = await import('../data/search/ko.js');
          tags = langModule.search_tags_ko;
        }

        if (tags) {
          Object.keys(tags).forEach(char => {
            if (searchTags[char]) {
              searchTags[char] += ',' + tags[char];
            } else {
              searchTags[char] = tags[char];
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to load search tags:', e);
    }

    // 3. Build unique character pool from all categories
    const charSet = new Set();
    Object.values(characterCategories).forEach(chars => {
      if (Array.isArray(chars)) {
        chars.forEach(c => charSet.add(c));
      }
    });
    allCharacters = Array.from(charSet);

    // 4. Load initial user tags
    userTags = await StorageService.getUserTags();
    
    searchIndexInitialized = true;
  },

  /**
   * Core search algorithm
   */
  async search(query) {
    await this.initialize();
    
    query = query.trim().toLowerCase();
    if (!query) return [];

    const keywords = query.split(/[\s,，]+/).filter(k => k);
    const highPriority = []; // User tag matches
    const normalPriority = []; // System tag or char matches

    allCharacters.forEach(char => {
      const uTags = (userTags[char] || '').toLowerCase();
      const sTags = (searchTags[char] || '').toLowerCase();
      
      const isUserMatch = keywords.every(k => uTags.includes(k));
      const isSystemMatch = keywords.every(k => sTags.includes(k) || char.toLowerCase().includes(k));

      if (isUserMatch) {
        highPriority.push(char);
      } else if (isSystemMatch) {
        normalPriority.push(char);
      }
    });

    // Merge and limit to 50
    return [...highPriority, ...normalPriority].slice(0, 50);
  },

  /**
   * Get combined tags for a character (used by editor)
   */
  async getTagsForChar(char) {
    await this.initialize();
    return {
      defaultTags: searchTags[char] || '',
      userTags: userTags[char] || ''
    };
  },

  /**
   * Update user tags and refresh local cache
   */
  async saveUserTag(char, tags) {
    await StorageService.saveUserTag(char, tags);
    userTags = await StorageService.getUserTags(); // Sync local cache
  },

  /**
   * Force refresh user tags (e.g. on start)
   */
  async refreshUserTags() {
    userTags = await StorageService.getUserTags();
    return userTags;
  },

  getUserTagsCache() {
    return userTags;
  }
};
