// Events API functions
import { supabase } from './supabase';
import type { MapEvent, Location, EventCategory } from './types';

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  party: '#ef4444',
  sport: '#22c55e',
  food: '#f97316',
  music: '#8b5cf6',
  art: '#ec4899',
  nature: '#10b981',
  games: '#3b82f6',
  networking: '#6366f1',
  education: '#f59e0b',
  other: '#6b7280',
};

export const CATEGORIES = [
  { key: 'party', label: 'Party', icon: '🎉', color: CATEGORY_COLORS.party },
  { key: 'sport', label: 'Sport', icon: '⚽', color: CATEGORY_COLORS.sport },
  { key: 'food', label: 'Food', icon: '🍕', color: CATEGORY_COLORS.food },
  { key: 'music', label: 'Music', icon: '🎵', color: CATEGORY_COLORS.music },
  { key: 'art', label: 'Art', icon: '🎨', color: CATEGORY_COLORS.art },
  { key: 'nature', label: 'Nature', icon: '🌿', color: CATEGORY_COLORS.nature },
  { key: 'games', label: 'Games', icon: '🎮', color: CATEGORY_COLORS.games },
  { key: 'networking', label: 'Networking', icon: '🤝', color: CATEGORY_COLORS.networking },
  { key: 'education', label: 'Education', icon: '📚', color: CATEGORY_COLORS.education },
  { key: 'other', label: 'Other', icon: '✨', color: CATEGORY_COLORS.other },
];

export async function getEventsNearby(
  location: Location,
  radiusKm = 10,
  category: EventCategory | null = null,
  limit = 50
): Promise<MapEvent[]> {
  try {
    const { data, error } = await supabase.rpc('get_events_nearby', {
      p_latitude: location.latitude,
      p_longitude: location.longitude,
      p_radius_km: radiusKm,
      p_category: category,
      p_limit: limit,
    });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return (data || []).map((item: { event: MapEvent }) => item.event);
  } catch (err) {
    console.error('Exception fetching events:', err);
    return [];
  }
}

export async function createEvent(eventData: {
  title: string;
  description?: string;
  category: EventCategory;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  eventDate: string;
  maxParticipants?: number;
  price?: number;
  photoUrl?: string;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_event', {
      p_title: eventData.title,
      p_description: eventData.description || null,
      p_category: eventData.category,
      p_latitude: eventData.latitude || null,
      p_longitude: eventData.longitude || null,
      p_location_name: eventData.locationName || null,
      p_location_address: eventData.locationAddress || null,
      p_event_date: eventData.eventDate,
      p_max_participants: eventData.maxParticipants || 10,
      p_price: eventData.price || 0,
      p_photo_url: eventData.photoUrl || null,
    });

    if (error) {
      console.error('Error creating event:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('Exception creating event:', err);
    return null;
  }
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

export function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) {
    return `${diffDays} днів`;
  }
  if (diffDays === 1) {
    return 'Завтра';
  }
  if (diffHours > 1) {
    return `${diffHours} год`;
  }
  return 'Скоро';
}

export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString('uk-UA', options);
}
