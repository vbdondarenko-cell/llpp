// Supabase client configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Profile, Interest } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Using demo mode.');
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Get stored telegram_id from localStorage
function getStoredTelegramId(): number | null {
  const stored = localStorage.getItem('telegram_id');
  return stored ? parseInt(stored) : null;
}

// Profile API functions
export async function getProfile(): Promise<Profile | null> {
  // Try with auth.uid() first
  let result = await supabase.rpc('get_profile_by_user_id');
  
  if (result.data) {
    return result.data as Profile;
  }
  
  // Fallback: try with telegram_id from localStorage
  const telegramId = getStoredTelegramId();
  if (telegramId) {
    const fallbackResult = await supabase.rpc('get_profile_by_telegram_id', {
      p_telegram_id: telegramId
    });
    
    if (fallbackResult.data) {
      return fallbackResult.data as Profile;
    }
  }
  
  return null;
}

export async function createProfile(
  telegramId: number,
  username: string | null,
  firstName: string,
  lastName: string | null,
  avatarUrl: string | null
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_profile', {
    p_telegram_id: telegramId,
    p_username: username,
    p_first_name: firstName,
    p_last_name: lastName,
    p_avatar_url: avatarUrl,
  });
  if (error) {
    console.error('Error creating profile:', error);
    return null;
  }
  return data as string;
}

export async function updateProfile(
  firstName?: string,
  lastName?: string,
  bio?: string,
  avatarUrl?: string,
  coverUrl?: string,
  city?: string,
  hasCompletedOnboarding?: boolean
): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('update_profile', {
    p_first_name: firstName ?? null,
    p_last_name: lastName ?? null,
    p_bio: bio ?? null,
    p_avatar_url: avatarUrl ?? null,
    p_cover_url: coverUrl ?? null,
    p_city: city ?? null,
    p_has_completed_onboarding: hasCompletedOnboarding ?? null,
  });
  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }
  return data as Profile;
}

// Interests API functions
export async function getInterests(): Promise<Interest[]> {
  const { data, error } = await supabase.rpc('get_interests');
  if (error) {
    console.error('Error fetching interests:', error);
    return [];
  }
  return (data || []) as Interest[];
}

export async function getUserInterests(): Promise<Interest[]> {
  const telegramId = getStoredTelegramId();
  const { data, error } = await supabase.rpc('get_user_interests', {
    p_telegram_id: telegramId
  });
  if (error) {
    console.error('Error fetching user interests:', error);
    return [];
  }
  return (data || []) as Interest[];
}

export async function setUserInterests(interestIds: string[]): Promise<boolean> {
  const telegramId = getStoredTelegramId();
  const { error } = await supabase.rpc('set_user_interests', {
    p_interest_ids: interestIds,
    p_telegram_id: telegramId,
  });
  if (error) {
    console.error('Error setting user interests:', error);
    return false;
  }
  return true;
}
