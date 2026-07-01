// Achievements API Functions
import { supabase } from './supabase';
import type {
  AchievementsResult,
  AchievementCheckResult,
  AchievementNotification,
  UserAchievement,
} from './types';

// Initialize user stats on first login
export async function initializeUserStats(): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('initialize_user_stats');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Initialize user stats error:', err);
    return { success: false };
  }
}

// Increment user stat
export async function incrementStat(
  statName: string,
  value: number = 1
): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('increment_user_stat', {
      p_stat_name: statName,
      p_value: value,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Increment stat error:', err);
    return { success: false };
  }
}

// Add explored category
export async function addExploredCategory(
  category: string
): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('add_explored_category', {
      p_category: category,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Add explored category error:', err);
    return { success: false };
  }
}

// Check and unlock achievements
export async function checkAchievements(): Promise<AchievementCheckResult> {
  try {
    const { data, error } = await supabase.rpc('check_achievements');
    if (error) throw error;
    return data as AchievementCheckResult;
  } catch (err) {
    console.error('Check achievements error:', err);
    return { success: false, error: 'Помилка перевірки досягнень', unlocked: [] };
  }
}

// Get all achievements with progress
export async function getMyAchievements(): Promise<AchievementsResult> {
  try {
    const { data, error } = await supabase.rpc('get_my_achievements');
    if (error) throw error;
    return data as AchievementsResult;
  } catch (err) {
    console.error('Get achievements error:', err);
    return {
      success: false,
      error: 'Помилка завантаження досягнень',
      achievements: [],
      total_count: 0,
      unlocked_count: 0,
    };
  }
}

// Get pending notifications
export async function getAchievementNotifications(): Promise<{
  success: boolean;
  notifications: AchievementNotification[];
}> {
  try {
    const { data, error } = await supabase.rpc('get_achievement_notifications');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Get notifications error:', err);
    return { success: false, notifications: [] };
  }
}

// Mark notification as shown
export async function markNotificationShown(
  achievementId: string
): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('mark_notification_shown', {
      p_achievement_id: achievementId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Mark notification shown error:', err);
    return { success: false };
  }
}

// Subscribe to new achievements
export function subscribeToAchievements(
  onAchievementUnlocked: (achievement: AchievementNotification) => void
): () => void {
  const subscription = supabase
    .channel('achievements-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_achievements',
      },
      async () => {
        // Check for newly unlocked achievements
        const result = await checkAchievements();
        if (result.unlocked.length > 0) {
          result.unlocked.forEach((achievement) => {
            onAchievementUnlocked(achievement);
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// Format unlock date
export function formatUnlockDate(dateString: string | null): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Get category display info
export function getCategoryInfo(category: string): { label: string; color: string } {
  switch (category) {
    case 'events':
      return { label: 'Події', color: '#667eea' };
    case 'social':
      return { label: 'Соціальні', color: '#f093fb' };
    case 'premium':
      return { label: 'Premium', color: '#ffd700' };
    case 'exploration':
      return { label: 'Дослідження', color: '#4facfe' };
    default:
      return { label: 'Інше', color: '#a0aec0' };
  }
}

// Calculate total progress
export function calculateTotalProgress(achievements: UserAchievement[]): {
  percentage: number;
  unlocked: number;
  total: number;
} {
  const visible = achievements.filter(a => !a.is_hidden);
  const unlocked = visible.filter(a => a.is_unlocked).length;
  const total = visible.length;
  const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  
  return { percentage, unlocked, total };
}