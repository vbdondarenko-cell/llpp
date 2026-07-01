// Join Request Service - Production Implementation
import { supabase } from '../supabase';
import type { RequestState, JoinResult, EventRequestStats, RequestStateResult } from './types';
import type { RequestResult, EventRequestsResponse, UserRequestStatus } from '../types';

// Event Requests API
export class JoinRequestService {
  /**
   * Join an event - sends a request to the organizer
   */
  static async join(eventId: string): Promise<JoinResult> {
    try {
      const { data, error } = await supabase.rpc('join_event', {
        p_event_id: eventId,
      });

      if (error) {
        console.error('Join event error:', error);
        return { success: false, error: this.getErrorMessage(error.message) };
      }

      const result = data as RequestResult;
      if (!result.success) {
        return { success: false, error: result.error || 'Помилка приєднання' };
      }

      return {
        success: true,
        state: 'pending',
        message: result.message,
        requestId: result.request_id,
      };
    } catch (err) {
      console.error('Join event exception:', err);
      return { success: false, error: 'Помилка приєднання' };
    }
  }

  /**
   * Cancel a pending request
   */
  static async cancel(eventId: string): Promise<JoinResult> {
    try {
      const { data, error } = await supabase.rpc('cancel_request', {
        p_event_id: eventId,
      });

      if (error) {
        console.error('Cancel request error:', error);
        return { success: false, error: this.getErrorMessage(error.message) };
      }

      const result = data as RequestResult;
      if (!result.success) {
        return { success: false, error: result.error || 'Помилка скасування' };
      }

      return {
        success: true,
        state: 'cancelled',
        message: result.message,
      };
    } catch (err) {
      console.error('Cancel request exception:', err);
      return { success: false, error: 'Помилка скасування' };
    }
  }

  /**
   * Leave an event (for accepted participants)
   */
  static async leave(eventId: string): Promise<JoinResult> {
    try {
      const { data, error } = await supabase.rpc('leave_event', {
        p_event_id: eventId,
      });

      if (error) {
        console.error('Leave event error:', error);
        return { success: false, error: this.getErrorMessage(error.message) };
      }

      const result = data as RequestResult;
      if (!result.success) {
        return { success: false, error: result.error || 'Помилка виходу' };
      }

      return {
        success: true,
        state: 'none',
        message: result.message,
      };
    } catch (err) {
      console.error('Leave event exception:', err);
      return { success: false, error: 'Помилка виходу' };
    }
  }

  /**
   * Get current user's request state for an event
   */
  static async getMyRequestStatus(eventId: string): Promise<RequestStateResult> {
    try {
      const { data, error } = await supabase.rpc('get_my_request_status', {
        p_event_id: eventId,
      });

      if (error) {
        console.error('Get request status error:', error);
        return { state: 'none' };
      }

      const result = data as UserRequestStatus;
      if (!result.has_request || !result.status) {
        return { state: 'none' };
      }

      return {
        state: result.status as RequestState,
        createdAt: result.created_at,
      };
    } catch (err) {
      console.error('Get request status exception:', err);
      return { state: 'none' };
    }
  }

  /**
   * Get event request stats (for organizers)
   */
  static async getEventRequestStats(eventId: string): Promise<EventRequestStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_event_requests', {
        p_event_id: eventId,
      });

      if (error) {
        console.error('Get event requests error:', error);
        return null;
      }

      const result = data as EventRequestsResponse;
      if (!result.success) {
        return null;
      }

      return {
        pendingCount: result.pending?.length || 0,
        acceptedCount: result.accepted?.length || 0,
        totalParticipants: result.event?.current_participants || 0,
        maxParticipants: result.event?.max_participants || 0,
        isOrganizer: true, // Only called by organizers
      };
    } catch (err) {
      console.error('Get event requests exception:', err);
      return null;
    }
  }

  /**
   * Accept a join request (organizer only)
   */
  static async acceptRequest(eventId: string, userId: string): Promise<JoinResult> {
    try {
      const { data, error } = await supabase.rpc('accept_request', {
        p_event_id: eventId,
        p_user_id: userId,
      });

      if (error) {
        console.error('Accept request error:', error);
        return { success: false, error: this.getErrorMessage(error.message) };
      }

      const result = data as RequestResult;
      if (!result.success) {
        return { success: false, error: result.error || 'Помилка схвалення' };
      }

      return {
        success: true,
        state: 'accepted',
        message: result.message,
        requestId: result.request_id,
      };
    } catch (err) {
      console.error('Accept request exception:', err);
      return { success: false, error: 'Помилка схвалення' };
    }
  }

  /**
   * Decline a join request (organizer only)
   */
  static async declineRequest(eventId: string, userId: string): Promise<JoinResult> {
    try {
      const { data, error } = await supabase.rpc('decline_request', {
        p_event_id: eventId,
        p_user_id: userId,
      });

      if (error) {
        console.error('Decline request error:', error);
        return { success: false, error: this.getErrorMessage(error.message) };
      }

      const result = data as RequestResult;
      if (!result.success) {
        return { success: false, error: result.error || 'Помилка відхилення' };
      }

      return {
        success: true,
        state: 'declined',
        message: result.message,
      };
    } catch (err) {
      console.error('Decline request exception:', err);
      return { success: false, error: 'Помилка відхилення' };
    }
  }

  /**
   * Get all requests for an event (organizer only)
   */
  static async getEventRequests(eventId: string): Promise<EventRequestsResponse | null> {
    try {
      const { data, error } = await supabase.rpc('get_event_requests', {
        p_event_id: eventId,
      });

      if (error) {
        console.error('Get event requests error:', error);
        return null;
      }

      return data as EventRequestsResponse;
    } catch (err) {
      console.error('Get event requests exception:', err);
      return null;
    }
  }

  /**
   * Convert error messages to Ukrainian
   */
  private static getErrorMessage(error: string): string {
    if (error.includes('already requested') || error.includes('вже подано')) {
      return 'Ви вже подали заявку на цю подію';
    }
    if (error.includes('already joined') || error.includes('вже учасник')) {
      return 'Ви вже є учасником цієї події';
    }
    if (error.includes('event is full') || error.includes('заповнена')) {
      return 'Подія вже заповнена';
    }
    if (error.includes('organizer') || error.includes('організатор')) {
      return 'Ви не можете приєднатися до власної події';
    }
    if (error.includes('blocked') || error.includes('заблоковано')) {
      return 'Вас заблоковано організатором';
    }
    if (error.includes('not found') || error.includes('не знайдено')) {
      return 'Подію не знайдено';
    }
    return 'Сталася помилка. Спробуйте пізніше.';
  }
}

export default JoinRequestService;
