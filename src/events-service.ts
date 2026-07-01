// Sprint 2.2: EventsService - Backend for Nearby Events
// Production-ready service with retry, loading, and error handling

import { supabase } from './supabase';
import type { Location, EventCategory, MapEvent } from './types';

export interface NearbyEventsParams {
  location: Location;
  radiusKm?: number;
  category?: EventCategory | null;
  limit?: number;
}

export interface NearbyEventsResult {
  success: boolean;
  events: MapEvent[];
  total: number;
  error?: string;
}

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class EventsService {
  private static async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries) {
          await new Promise(resolve => 
            setTimeout(resolve, RETRY_DELAY_MS * attempt)
          );
        }
      }
    }

    throw lastError;
  }

  static async getEventById(eventId: string): Promise<{ success: boolean; event?: MapEvent; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        event: this.mapDbEventToMapEvent(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async refreshEvents(
    params: NearbyEventsParams
  ): Promise<NearbyEventsResult> {
    return this.getNearbyEvents(params);
  }

  static async getNearbyEvents(
    params: NearbyEventsParams
  ): Promise<NearbyEventsResult> {
    const {
      location,
      radiusKm = DEFAULT_RADIUS_KM,
      category = null,
      limit = DEFAULT_LIMIT,
    } = params;

    try {
      const data = await this.executeWithRetry(async () => {
        const { data, error } = await supabase.rpc('get_events_nearby', {
          p_latitude: location.latitude,
          p_longitude: location.longitude,
          p_radius_km: radiusKm,
          p_category: category,
          p_limit: limit,
        });

        if (error) {
          throw new Error(error.message);
        }

        return data;
      });

      const events = (data || []).map((item: { event: MapEvent }) => item.event);

      return {
        success: true,
        events,
        total: events.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('EventsService.getNearbyEvents error:', errorMessage);
      
      return {
        success: false,
        events: [],
        total: 0,
        error: errorMessage,
      };
    }
  }

  static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  }

  static formatEventTime(dateString: string): string {
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

  static formatEventDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('uk-UA', options);
  }

  private static mapDbEventToMapEvent(event: Record<string, unknown>): MapEvent {
    return {
      id: event.id as string,
      title: event.title as string,
      description: (event.description as string) || null,
      category: event.category as MapEvent['category'],
      event_type: 'in_person',
      latitude: event.latitude as number,
      longitude: event.longitude as number,
      location_name: (event.location_name as string) || null,
      location_address: (event.location_address as string) || null,
      event_date: event.event_date as string,
      event_end_date: (event.event_end_date as string) || null,
      max_participants: event.max_participants as number,
      current_participants: event.current_participants as number,
      price: event.price as number,
      currency: (event.currency as string) || 'UAH',
      photo_url: (event.photo_url as string) || null,
      status: (event.status as string) || 'active',
      requires_approval: event.requires_approval as boolean,
      is_premium_only: event.is_premium_only as boolean,
      organizer: {
        id: event.organizer_id as string,
        username: null,
        first_name: null,
        avatar_url: null,
      },
      distance: 0,
      created_at: event.created_at as string,
    };
  }
}

export default EventsService;
