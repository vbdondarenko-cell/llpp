// Request Realtime - Handles realtime subscriptions for join requests
import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { EventRequestsResponse, UserRequestStatus, RequestStatus } from '../types';
import { JoinRequestService } from './JoinRequestService';

export interface RealtimeCallbacks {
  onRequestsChange?: (requests: EventRequestsResponse) => void;
  onMyStatusChange?: (status: UserRequestStatus) => void;
  onError?: (error: string) => void;
}

/**
 * Request Realtime Subscription Manager
 */
export class RequestRealtime {
  private eventId: string;
  private userId?: string;
  private callbacks: RealtimeCallbacks;
  private requestsChannel?: RealtimeChannel;
  private statusChannel?: RealtimeChannel;
  private isSubscribed = false;

  constructor(eventId: string, callbacks: RealtimeCallbacks = {}) {
    this.eventId = eventId;
    this.callbacks = callbacks;
  }

  /**
   * Start realtime subscriptions
   */
  async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      console.warn('Already subscribed to request realtime');
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      this.userId = user?.id;

      // Subscribe to event requests (for organizers)
      await this.subscribeToRequests();

      // Subscribe to my request status (for regular users)
      if (this.userId) {
        await this.subscribeToMyStatus();
      }

      this.isSubscribed = true;
    } catch (err) {
      console.error('Failed to subscribe to request realtime:', err);
      this.callbacks.onError?.('Не вдалося підключити реалтайм');
    }
  }

  /**
   * Subscribe to event requests changes
   */
  private async subscribeToRequests(): Promise<void> {
    this.requestsChannel = supabase
      .channel(`requests:${this.eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_requests',
          filter: `event_id=eq.${this.eventId}`,
        },
        async (payload) => {
          console.log('Request change detected:', payload);
          
          // Refetch requests
          const requests = await JoinRequestService.getEventRequests(this.eventId);
          
          if (requests) {
            this.callbacks.onRequestsChange?.(requests);
            
            // Emit specific events based on change type
            if (payload.eventType === 'INSERT') {
              console.log('New request received');
            } else if (payload.eventType === 'UPDATE') {
              console.log('Request updated:', payload.new);
            } else if (payload.eventType === 'DELETE') {
              console.log('Request deleted');
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to requests channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Request channel error');
          this.callbacks.onError?.('Помилка підключення');
        }
      });
  }

  /**
   * Subscribe to user's own request status
   */
  private async subscribeToMyStatus(): Promise<void> {
    if (!this.userId) return;

    this.statusChannel = supabase
      .channel(`my-request:${this.eventId}:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_requests',
          filter: `event_id=eq.${this.eventId}`,
        },
        async (payload) => {
          // Only care about changes to our own request
          if (payload.new && typeof payload.new === 'object') {
            const newRecord = payload.new as Record<string, unknown>;
            if (newRecord.user_id !== this.userId) return;
          }

          console.log('My request status change detected:', payload);

          // Refetch my status
          const status = await JoinRequestService.getMyRequestStatus(this.eventId);
          if (status.state !== 'none') {
            const userStatus: UserRequestStatus = {
              has_request: true,
              status: status.state as RequestStatus,
              created_at: status.createdAt,
            };
            this.callbacks.onMyStatusChange?.(userStatus);
          } else {
            this.callbacks.onMyStatusChange?.({ has_request: false });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to my request status channel');
        }
      });
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribe(): void {
    if (this.requestsChannel) {
      supabase.removeChannel(this.requestsChannel);
      this.requestsChannel = undefined;
    }

    if (this.statusChannel) {
      supabase.removeChannel(this.statusChannel);
      this.statusChannel = undefined;
    }

    this.isSubscribed = false;
    console.log('Unsubscribed from request realtime');
  }

  /**
   * Check if currently subscribed
   */
  isActive(): boolean {
    return this.isSubscribed;
  }

  /**
   * Refresh requests manually
   */
  async refreshRequests(): Promise<EventRequestsResponse | null> {
    try {
      const requests = await JoinRequestService.getEventRequests(this.eventId);
      if (requests) {
        this.callbacks.onRequestsChange?.(requests);
      }
      return requests;
    } catch (err) {
      console.error('Failed to refresh requests:', err);
      return null;
    }
  }

  /**
   * Refresh my status manually
   */
  async refreshMyStatus(): Promise<UserRequestStatus> {
    try {
      const status = await JoinRequestService.getMyRequestStatus(this.eventId);
      this.callbacks.onMyStatusChange?.({ has_request: status.state !== 'none', status: status.state as any });
      if (status.state !== 'none') {
        return {
          has_request: true,
          status: status.state as RequestStatus,
          created_at: status.createdAt,
        } as UserRequestStatus;
      }
      return { has_request: false };
    } catch (err) {
      console.error('Failed to refresh my status:', err);
      return { has_request: false };
    }
  }
}

/**
 * Singleton manager for all request subscriptions
 */
export class RequestSubscriptionManager {
  private static instances: Map<string, RequestRealtime> = new Map();

  /**
   * Get or create subscription for an event
   */
  static getSubscription(eventId: string, callbacks?: RealtimeCallbacks): RequestRealtime {
    if (this.instances.has(eventId)) {
      return this.instances.get(eventId)!;
    }

    const subscription = new RequestRealtime(eventId, callbacks || {});
    this.instances.set(eventId, subscription);
    return subscription;
  }

  /**
   * Remove subscription for an event
   */
  static removeSubscription(eventId: string): void {
    const subscription = this.instances.get(eventId);
    if (subscription) {
      subscription.unsubscribe();
      this.instances.delete(eventId);
    }
  }

  /**
   * Remove all subscriptions
   */
  static removeAll(): void {
    this.instances.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.instances.clear();
  }

  /**
   * Check if has subscription for event
   */
  static hasSubscription(eventId: string): boolean {
    return this.instances.has(eventId);
  }
}

export default RequestRealtime;
