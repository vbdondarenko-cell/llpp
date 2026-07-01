// Sprint 3.5: Event Sync - Event Synchronization and Realtime
// Handles event refresh, marker insertion, and Supabase Realtime subscription

import type { MapEvent, Location } from '../types';
import { supabase } from '../supabase';
import { EventsService } from '../events-service';
import { MapSync, injectMarkerAnimationStyles } from './map-sync';
import { showSuccessToast, showErrorToast } from './event-toast';

export interface EventSyncCallbacks {
  onEventsLoaded?: (events: MapEvent[]) => void;
  onEventAdded?: (event: MapEvent) => void;
  onEventUpdated?: (event: MapEvent) => void;
  onEventRemoved?: (eventId: string) => void;
  onError?: (error: string) => void;
}

export interface EventSyncOptions {
  userLocation: Location;
  radiusKm?: number;
  enableRealtime?: boolean;
  mapSync?: MapSync;
}

export class EventSync {
  private callbacks: EventSyncCallbacks = {};
  private options: Required<EventSyncOptions>;
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  private isSubscribed = false;

  constructor(options: EventSyncOptions) {
    this.options = {
      userLocation: options.userLocation,
      radiusKm: options.radiusKm ?? 10,
      enableRealtime: options.enableRealtime ?? true,
      mapSync: options.mapSync!,
    };
  }

  /**
   * Set callbacks for event changes
   */
  setCallbacks(callbacks: EventSyncCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Load events from Supabase
   */
  async loadEvents(): Promise<MapEvent[]> {
    try {
      const result = await EventsService.getNearbyEvents({
        location: this.options.userLocation,
        radiusKm: this.options.radiusKm,
      });

      if (result.success) {
        this.callbacks.onEventsLoaded?.(result.events);
        return result.events;
      } else {
        this.callbacks.onError?.(result.error || 'Failed to load events');
        showErrorToast('Не вдалося завантажити події');
        return [];
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.callbacks.onError?.(message);
      showErrorToast('Помилка мережі');
      return [];
    }
  }

  /**
   * Add a single event (after creation)
   * Returns the new marker element for animation
   */
  async addEvent(eventId: string): Promise<MapEvent | null> {
    try {
      const result = await EventsService.getEventById(eventId);

      if (result.success && result.event) {
        // Check for duplicate
        if (this.options.mapSync.hasMarker(eventId)) {
          console.warn('EventSync: Marker already exists for', eventId);
          return result.event;
        }

        this.callbacks.onEventAdded?.(result.event);
        return result.event;
      } else {
        this.callbacks.onError?.(result.error || 'Failed to fetch new event');
        return null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.callbacks.onError?.(message);
      showErrorToast('Не вдалося додати подію на карту');
      return null;
    }
  }

  /**
   * Refresh events from Supabase
   */
  async refreshEvents(): Promise<MapEvent[]> {
    return this.loadEvents();
  }

  /**
   * Subscribe to realtime changes
   */
  subscribeToRealtime(): void {
    if (this.isSubscribed) return;

    try {
      this.realtimeChannel = supabase
        .channel('events-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'events',
          },
          async (payload) => {
            console.log('EventSync: New event from realtime', payload);
            
            // Fetch full event data
            const eventId = payload.new?.id;
            if (eventId) {
              const event = await this.addEvent(eventId);
              if (event) {
                // Only show toast if it's not our own event (created locally)
                showSuccessToast('Нова подія на карті!');
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'events',
          },
          (payload) => {
            console.log('EventSync: Event updated via realtime', payload);
            const event = payload.new as MapEvent;
            this.callbacks.onEventUpdated?.(event);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'events',
          },
          (payload) => {
            console.log('EventSync: Event deleted via realtime', payload);
            const eventId = payload.old?.id;
            if (eventId) {
              this.callbacks.onEventRemoved?.(eventId);
            }
          }
        )
        .subscribe((status) => {
          console.log('EventSync: Realtime status', status);
          this.isSubscribed = status === 'SUBSCRIBED';
        });
    } catch (error) {
      console.error('EventSync: Failed to subscribe to realtime', error);
    }
  }

  /**
   * Unsubscribe from realtime
   */
  unsubscribeFromRealtime(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isSubscribed = false;
    }
  }

  /**
   * Check if realtime is subscribed
   */
  isRealtimeSubscribed(): boolean {
    return this.isSubscribed;
  }

  /**
   * Update user location
   */
  updateUserLocation(location: Location): void {
    this.options.userLocation = location;
  }

  /**
   * Get current events
   */
  getCurrentLocation(): Location {
    return this.options.userLocation;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.unsubscribeFromRealtime();
    this.callbacks = {};
  }
}

// Global event sync instance
let eventSyncInstance: EventSync | null = null;

export function getEventSync(options: EventSyncOptions): EventSync {
  if (!eventSyncInstance) {
    eventSyncInstance = new EventSync(options);
  }
  return eventSyncInstance;
}

export function initEventSync(options: EventSyncOptions): EventSync {
  // Inject animation styles
  injectMarkerAnimationStyles();

  // Create or update instance
  if (eventSyncInstance) {
    eventSyncInstance.destroy();
  }
  
  eventSyncInstance = new EventSync(options);
  
  // Auto-subscribe if enabled
  if (options.enableRealtime) {
    eventSyncInstance.subscribeToRealtime();
  }
  
  return eventSyncInstance;
}

export function destroyEventSync(): void {
  if (eventSyncInstance) {
    eventSyncInstance.destroy();
    eventSyncInstance = null;
  }
}

// Helper function to sync after event creation
export async function syncNewEvent(
  eventId: string,
  mapSync: MapSync,
  callbacks: EventSyncCallbacks
): Promise<MapEvent | null> {
  const eventSync = getEventSync({
    userLocation: callbacks.onEventsLoaded ? { latitude: 0, longitude: 0 } : { latitude: 0, longitude: 0 },
    mapSync,
  });
  eventSync.setCallbacks(callbacks);

  const event = await eventSync.addEvent(eventId);

  if (event) {
    // Fly to new event
    mapSync.flyToEvent(event);
    
    // Success toast
    showSuccessToast('Подію створено!');
  }

  return event;
}
