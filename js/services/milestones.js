/**
 * Milestone Service - Handles usage milestones and engagement banners
 */
import { View } from '../ui/view.js';
import { StorageService } from './storage.js';

export const MilestoneService = {
  /**
   * Check if any milestone has been reached and show the banner if needed
   * @param {Object} stats - Current usage stats
   * @param {Object} favoritesData - Current favorites categorized data
   */
  async check(stats, favoritesData) {
    // 1. Cool down: Don't show if shown in the last 24 hours
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (Date.now() - stats.lastMilestoneShown < ONE_DAY) return;

    // 2. Define Milestones (High priority first)
    const milestones = [
      // M6: Contextual - Late Night
      {
        id: 'milestone_night',
        condition: () => {
          const hour = new Date().getHours();
          return (hour >= 0 && hour < 5) && stats.totalActions >= 20;
        },
        showRate: false, showCoffee: true
      },
      // M4: Loyalty - Favorites
      {
        id: 'milestone_fav_15',
        condition: () => {
          let totalFavs = 0;
          for (const catId in favoritesData) {
            if (Array.isArray(favoritesData[catId])) {
              totalFavs += favoritesData[catId].length;
            }
          }
          return totalFavs >= 15;
        },
        showRate: true, showCoffee: true
      },
      // M2: Depth - Append Mode
      {
        id: 'milestone_append_20',
        condition: () => stats.appendActions >= 20,
        showRate: true, showCoffee: true
      },
      {
        id: 'milestone_append_10',
        condition: () => stats.appendActions >= 10,
        showRate: true, showCoffee: false
      },
      // M3: Breadth - Unique Chars
      {
        id: 'milestone_unique_50',
        condition: () => stats.uniqueChars.length >= 50,
        showRate: true, showCoffee: true
      },
      // M5: Retention - Time
      {
        id: 'milestone_time_100',
        condition: () => (Date.now() - stats.installDate) >= 100 * ONE_DAY,
        showRate: true, showCoffee: true
      },
      {
        id: 'milestone_time_30',
        condition: () => (Date.now() - stats.installDate) >= 30 * ONE_DAY,
        showRate: true, showCoffee: false
      },
      // M1: Usage - Total Actions
      {
        id: 'milestone_usage_100',
        condition: () => stats.totalActions >= 100,
        showRate: true, showCoffee: true
      },
      {
        id: 'milestone_usage_50',
        condition: () => stats.totalActions >= 50,
        showRate: true, showCoffee: true
      },
      {
        id: 'milestone_usage_20',
        condition: () => stats.totalActions >= 20,
        showRate: true, showCoffee: false
      }
    ];

    // 3. Find the first unmet milestone
    for (const m of milestones) {
      if (!stats.dismissedMilestones.includes(m.id) && m.condition()) {
        View.showMilestoneBanner(m.id, m.showRate, m.showCoffee);
        View.elements.milestoneBanner.dataset.activeId = m.id;
        break;
      }
    }
  },

  /**
   * Dismiss current milestone and handle actions
   */
  async dismiss(milestoneId) {
    if (milestoneId) {
      await StorageService.dismissMilestone(milestoneId);
    }
    View.hideMilestoneBanner();
  }
};
