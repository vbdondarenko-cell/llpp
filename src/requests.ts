// Event Requests API Functions
import { supabase } from './supabase';
import type {
  RequestResult,
  EventRequestsResponse,
  UserRequestStatus,
} from './types';

// Join Event
export async function joinEvent(eventId: string): Promise<RequestResult> {
  try {
    const { data, error } = await supabase.rpc('join_event', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Join event error:', error);
      return { success: false, error: error.message };
    }

    return data as RequestResult;
  } catch (err) {
    console.error('Join event exception:', err);
    return { success: false, error: 'Помилка приєднання' };
  }
}

// Cancel Request
export async function cancelRequest(eventId: string): Promise<RequestResult> {
  try {
    const { data, error } = await supabase.rpc('cancel_request', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Cancel request error:', error);
      return { success: false, error: error.message };
    }

    return data as RequestResult;
  } catch (err) {
    console.error('Cancel request exception:', err);
    return { success: false, error: 'Помилка скасування' };
  }
}

// Leave Event
export async function leaveEvent(eventId: string): Promise<RequestResult> {
  try {
    const { data, error } = await supabase.rpc('leave_event', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Leave event error:', error);
      return { success: false, error: error.message };
    }

    return data as RequestResult;
  } catch (err) {
    console.error('Leave event exception:', err);
    return { success: false, error: 'Помилка виходу' };
  }
}

// Accept Request (Organizer)
export async function acceptRequest(
  eventId: string,
  userId: string
): Promise<RequestResult> {
  try {
    const { data, error } = await supabase.rpc('accept_request', {
      p_event_id: eventId,
      p_user_id: userId,
    });

    if (error) {
      console.error('Accept request error:', error);
      return { success: false, error: error.message };
    }

    return data as RequestResult;
  } catch (err) {
    console.error('Accept request exception:', err);
    return { success: false, error: 'Помилка схвалення' };
  }
}

// Decline Request (Organizer)
export async function declineRequest(
  eventId: string,
  userId: string
): Promise<RequestResult> {
  try {
    const { data, error } = await supabase.rpc('decline_request', {
      p_event_id: eventId,
      p_user_id: userId,
    });

    if (error) {
      console.error('Decline request error:', error);
      return { success: false, error: error.message };
    }

    return data as RequestResult;
  } catch (err) {
    console.error('Decline request exception:', err);
    return { success: false, error: 'Помилка відхилення' };
  }
}

// Get Event Requests (Organizer)
export async function getEventRequests(
  eventId: string
): Promise<EventRequestsResponse | null> {
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

// Get User's Request Status
export async function getMyRequestStatus(
  eventId: string
): Promise<UserRequestStatus> {
  try {
    const { data, error } = await supabase.rpc('get_my_request_status', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Get request status error:', error);
      return { has_request: false };
    }

    return data as UserRequestStatus;
  } catch (err) {
    console.error('Get request status exception:', err);
    return { has_request: false };
  }
}

// Subscribe to Request Changes (Realtime)
export function subscribeToRequests(
  eventId: string,
  onChange: (requests: EventRequestsResponse) => void
): () => void {
  const subscription = supabase
    .channel(`requests:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'event_requests',
        filter: `event_id=eq.${eventId}`,
      },
      async () => {
        // Refetch requests on any change
        const requests = await getEventRequests(eventId);
        if (requests) {
          onChange(requests);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// Subscribe to Single Request Status (Realtime)
export function subscribeToRequestStatus(
  eventId: string,
  onChange: (status: UserRequestStatus) => void
): () => void {
  const subscription = supabase
    .channel(`request-status:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'event_requests',
        filter: `event_id=eq.${eventId}`,
      },
      async () => {
        const status = await getMyRequestStatus(eventId);
        onChange(status);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// Format relative time for requests
export function formatRequestTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'щойно';
  if (diffMins < 60) return `${diffMins} хв. тому`;
  if (diffHours < 24) return `${diffHours} год. тому`;
  if (diffDays < 7) return `${diffDays} дн. тому`;
  
  return date.toLocaleDateString('uk-UA');
}

// Get status display text
export function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Очікує';
    case 'accepted':
      return 'Прийнято';
    case 'declined':
      return 'Відхилено';
    case 'cancelled':
      return 'Скасовано';
    default:
      return status;
  }
}

// Get status color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'var(--warning)';
    case 'accepted':
      return 'var(--success)';
    case 'declined':
      return 'var(--error)';
    case 'cancelled':
      return 'var(--text-tertiary)';
    default:
      return 'var(--text-secondary)';
  }
}
