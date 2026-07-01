// Event Mapper - Converts EventDraft to Supabase RPC payload
// Maps frontend draft to database format

import type { EventDraft } from '../create-event/types';

export interface CreateEventPayload {
  p_title: string;
  p_description: string | null;
  p_category: string;
  p_event_type: string;
  p_latitude: number | null;
  p_longitude: number | null;
  p_location_name: string | null;
  p_location_address: string | null;
  p_event_date: string;
  p_event_end_date: string | null;
  p_max_participants: number;
  p_price: number;
  p_photo_url: string | null;
  p_requires_approval: boolean;
  p_is_premium_only: boolean;
}

export function mapDraftToPayload(
  draft: EventDraft,
  imageUrl: string | null
): CreateEventPayload {
  // Combine date and time into ISO timestamp
  const eventDate = combineDateAndTime(draft.date, draft.time);
  const eventEndDate = draft.duration > 0 
    ? calculateEndDate(draft.date, draft.time, draft.duration)
    : null;

  return {
    p_title: draft.title.trim(),
    p_description: draft.description?.trim() || null,
    p_category: draft.category || 'other',
    p_event_type: 'in_person',
    p_latitude: draft.location?.latitude || null,
    p_longitude: draft.location?.longitude || null,
    p_location_name: draft.location?.name || null,
    p_location_address: draft.location?.formattedAddress || draft.location?.address || null,
    p_event_date: eventDate,
    p_event_end_date: eventEndDate,
    p_max_participants: draft.maxParticipants,
    p_price: draft.isPaid ? draft.price : 0,
    p_photo_url: imageUrl,
    p_requires_approval: draft.requiresApproval,
    p_is_premium_only: draft.premiumOnly,
  };
}

function combineDateAndTime(date: Date | null, time: string): string {
  if (!date) {
    throw new Error('Date is required');
  }

  const [hours, minutes] = time.split(':').map(Number);
  
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  
  return combined.toISOString();
}

function calculateEndDate(date: Date | null, time: string, durationMinutes: number): string | null {
  if (!date) return null;
  
  const [hours, minutes] = time.split(':').map(Number);
  const endTime = new Date(date);
  endTime.setHours(hours, minutes, 0, 0);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);
  
  return endTime.toISOString();
}

export function mapEventToMapFormat(event: Record<string, unknown>): Record<string, unknown> {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    latitude: event.latitude,
    longitude: event.longitude,
    locationName: event.location_name,
    locationAddress: event.location_address,
    eventDate: event.event_date,
    eventEndDate: event.event_end_date,
    maxParticipants: event.max_participants,
    currentParticipants: event.current_participants || 0,
    price: event.price,
    currency: event.currency || 'UAH',
    photoUrl: event.photo_url,
    status: event.status || 'active',
    requiresApproval: event.requires_approval,
    isPremiumOnly: event.is_premium_only,
    organizerId: event.organizer_id,
    distance: event.distance,
  };
}
