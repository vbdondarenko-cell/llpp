// Create Event Service - Production Supabase integration
// Handles image upload, validation, RPC call, and state management

import { supabase } from '../supabase';
import { eventImagesStorage } from '../storage/index';
import type { EventDraft } from '../create-event/types';
import type { MapEvent } from '../types';
import { validateEventDraft, type ValidationResult, getValidationMessage } from './event-validation';
import { mapDraftToPayload, type CreateEventPayload } from './event-mapper';

export interface CreateEventResult {
  success: boolean;
  eventId?: string;
  event?: MapEvent;
  error?: string;
  validationErrors?: ValidationResult;
}

export interface CreateEventOptions {
  draft: EventDraft;
  onProgress?: (stage: string) => void;
  signal?: AbortSignal;
}

const STAGES = {
  VALIDATING: 'Validating...',
  UPLOADING_IMAGE: 'Uploading image...',
  CREATING_EVENT: 'Creating event...',
  FINALIZING: 'Finalizing...',
} as const;

export class CreateEventService {
  private static isCreating = false;
  private static currentAbortController: AbortController | null = null;

  static async createEvent(options: CreateEventOptions): Promise<CreateEventResult> {
    const { draft, onProgress, signal } = options;

    if (this.isCreating) {
      return { success: false, error: 'Event creation already in progress' };
    }

    if (signal?.aborted) {
      return { success: false, error: 'Request was cancelled' };
    }

    this.isCreating = true;
    this.currentAbortController = new AbortController();

    signal?.addEventListener('abort', () => {
      this.currentAbortController?.abort();
    });

    let uploadedImageUrl: string | null = null;

    try {
      // Stage 1: Validate
      onProgress?.(STAGES.VALIDATING);
      const validation = validateEventDraft(draft);

      if (!validation.isValid) {
        this.isCreating = false;
        return {
          success: false,
          error: getValidationMessage(validation.errors),
          validationErrors: validation,
        };
      }

      // Stage 2: Upload image
      if (draft.coverImage && !draft.coverImage.startsWith('http')) {
        onProgress?.(STAGES.UPLOADING_IMAGE);

        const userId = await this.getCurrentUserId();
        if (!userId) {
          this.isCreating = false;
          return { success: false, error: 'User not authenticated' };
        }

        // Convert base64 data URL to Blob
        const blob = await this.dataURLToBlob(draft.coverImage);
        const uploadResult = await eventImagesStorage.upload(userId, blob);

        if (!uploadResult.success) {
          this.isCreating = false;
          return { success: false, error: uploadResult.error || 'Failed to upload image' };
        }

        uploadedImageUrl = uploadResult.url || null;
      } else if (draft.coverImage?.startsWith('http')) {
        uploadedImageUrl = draft.coverImage;
      }

      // Stage 3: Create event via RPC
      onProgress?.(STAGES.CREATING_EVENT);

      const payload = mapDraftToPayload(draft, uploadedImageUrl);
      const eventId = await this.callCreateEventRPC(payload);

      if (!eventId) {
        if (uploadedImageUrl && !draft.coverImage?.startsWith('http')) {
          const path = uploadedImageUrl.split('/event-images/')[1];
          if (path) {
            await eventImagesStorage.delete(path).catch(console.error);
          }
        }
        this.isCreating = false;
        return { success: false, error: 'Failed to create event' };
      }

      // Stage 4: Fetch created event
      onProgress?.(STAGES.FINALIZING);
      const event = await this.fetchCreatedEvent(eventId);

      this.isCreating = false;
      return { success: true, eventId, event };
    } catch (error) {
      console.error('CreateEventService error:', error);

      if (uploadedImageUrl && !draft.coverImage?.startsWith('http')) {
        const path = uploadedImageUrl.split('/event-images/')[1];
        if (path) {
          await eventImagesStorage.delete(path).catch(console.error);
        }
      }

      this.isCreating = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('aborted') || errorMessage.includes('cancelled')) {
        return { success: false, error: 'Request was cancelled' };
      }

      return { success: false, error: errorMessage };
    }
  }

  private static async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  private static async dataURLToBlob(dataURL: string): Promise<Blob> {
    const response = await fetch(dataURL);
    return response.blob();
  }

  private static async callCreateEventRPC(payload: CreateEventPayload): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_event', payload);
      if (error) {
        console.error('create_event RPC error:', error);
        throw new Error(error.message);
      }
      return data as string;
    } catch (error) {
      console.error('callCreateEventRPC error:', error);
      throw error;
    }
  }

  private static async fetchCreatedEvent(eventId: string): Promise<MapEvent | undefined> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('fetchCreatedEvent error:', error);
        return undefined;
      }

      return this.mapDbEventToMapEvent(data);
    } catch (error) {
      console.error('fetchCreatedEvent error:', error);
      return undefined;
    }
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

  static isEventCreationInProgress(): boolean {
    return this.isCreating;
  }

  static cancelCreation(): void {
    this.currentAbortController?.abort();
    this.isCreating = false;
  }

  static async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('delete_event', {
        p_event_id: eventId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default CreateEventService;
