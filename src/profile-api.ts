// Profile API Functions
import { supabase } from './supabase';
import type {
  UserProfile,
  ProfileResult,
  StatisticsResult,
  FriendsResult,
  FriendRequestsResult,
} from './types';

// Get user profile
export async function getUserProfile(userId?: string): Promise<ProfileResult> {
  try {
    const { data, error } = await supabase.rpc('get_user_profile', {
      p_user_id: userId || null,
    });
    if (error) throw error;
    return data as ProfileResult;
  } catch (err) {
    console.error('Get profile error:', err);
    return { success: false, error: 'Помилка завантаження профілю', profile: null as any };
  }
}

// Update profile
export async function updateProfile(data: {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  interests?: string[];
  location?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.rpc('update_my_profile', {
      p_display_name: data.display_name || null,
      p_bio: data.bio || null,
      p_avatar_url: data.avatar_url || null,
      p_interests: data.interests || null,
      p_location: data.location || null,
    });
    if (error) throw error;
    return result;
  } catch (err) {
    console.error('Update profile error:', err);
    return { success: false, error: 'Помилка оновлення профілю' };
  }
}

// Update privacy settings
export async function updatePrivacySettings(data: {
  show_online?: boolean;
  show_events?: boolean;
  allow_messages?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.rpc('update_privacy_settings', {
      p_show_online: data.show_online ?? null,
      p_show_events: data.show_events ?? null,
      p_allow_messages: data.allow_messages ?? null,
    });
    if (error) throw error;
    return result;
  } catch (err) {
    console.error('Update privacy error:', err);
    return { success: false, error: 'Помилка оновлення налаштувань' };
  }
}

// Update app settings
export async function updateAppSettings(data: {
  language?: string;
  notifications_enabled?: boolean;
  dark_mode?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.rpc('update_app_settings', {
      p_language: data.language || null,
      p_notifications_enabled: data.notifications_enabled ?? null,
      p_dark_mode: data.dark_mode ?? null,
    });
    if (error) throw error;
    return result;
  } catch (err) {
    console.error('Update settings error:', err);
    return { success: false, error: 'Помилка оновлення налаштувань' };
  }
}

// Get user statistics
export async function getMyStatistics(): Promise<StatisticsResult> {
  try {
    const { data, error } = await supabase.rpc('get_my_statistics');
    if (error) throw error;
    return data as StatisticsResult;
  } catch (err) {
    console.error('Get statistics error:', err);
    return {
      success: false,
      error: 'Помилка завантаження статистики',
      statistics: {
        events_created: 0,
        events_joined: 0,
        completed_events: 0,
        messages_sent: 0,
        chats_joined: 0,
        friends_added: 0,
        achievements_count: 0,
        categories_explored_count: 0,
        is_premium: false,
        premium_expires_at: null,
        average_rating: 0,
        rating_count: 0,
      },
    };
  }
}

// Get friends list
export async function getMyFriends(): Promise<FriendsResult> {
  try {
    const { data, error } = await supabase.rpc('get_my_friends');
    if (error) throw error;
    return data as FriendsResult;
  } catch (err) {
    console.error('Get friends error:', err);
    return { success: false, error: 'Помилка завантаження друзів', friends: [] };
  }
}

// Get friend requests
export async function getFriendRequests(): Promise<FriendRequestsResult> {
  try {
    const { data, error } = await supabase.rpc('get_friend_requests');
    if (error) throw error;
    return data as FriendRequestsResult;
  } catch (err) {
    console.error('Get friend requests error:', err);
    return { success: false, error: 'Помилка завантаження', incoming: [], outgoing: [] };
  }
}

// Send friend request
export async function sendFriendRequest(addresseeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('send_friend_request', {
      p_addressee_id: addresseeId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Send friend request error:', err);
    return { success: false, error: 'Помилка відправки запиту' };
  }
}

// Respond to friend request
export async function respondFriendRequest(
  friendshipId: string,
  accept: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('respond_friend_request', {
      p_friendship_id: friendshipId,
      p_accept: accept,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Respond friend request error:', err);
    return { success: false, error: 'Помилка обробки запиту' };
  }
}

// Rate a user
export async function rateUser(
  eventId: string,
  ratedUserId: string,
  rating: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('rate_user', {
      p_event_id: eventId,
      p_rated_user_id: ratedUserId,
      p_rating: rating,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Rate user error:', err);
    return { success: false, error: 'Помилка оцінювання' };
  }
}

// Get avatar initials
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Format number
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Get member since date
export function formatMemberSince(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
}

// Subscribe to profile updates
export function subscribeToProfile(
  onUpdate: (profile: UserProfile) => void
): () => void {
  const subscription = supabase
    .channel('profile-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      },
      async () => {
        const result = await getUserProfile();
        if (result.success) {
          onUpdate(result.profile);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}