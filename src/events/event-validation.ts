// Event Validation - Production validation rules
// Validates EventDraft before creating event

import type { EventDraft, EventLocation } from '../create-event/types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 500;
const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 1000;
const MIN_PRICE = 0;
const MAX_PRICE = 10000;

export function validateEventDraft(draft: Partial<EventDraft>): ValidationResult {
  const errors: ValidationError[] = [];

  // Cover Image validation
  if (!draft.coverImage || draft.coverImage.trim().length === 0) {
    errors.push({
      field: 'coverImage',
      message: 'Cover image is required',
    });
  }

  // Title validation
  if (!draft.title || draft.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Title is required',
    });
  } else if (draft.title.trim().length < TITLE_MIN_LENGTH) {
    errors.push({
      field: 'title',
      message: `Title must be at least ${TITLE_MIN_LENGTH} characters`,
    });
  } else if (draft.title.length > TITLE_MAX_LENGTH) {
    errors.push({
      field: 'title',
      message: `Title must be ${TITLE_MAX_LENGTH} characters or less`,
    });
  }

  // Description validation
  if (draft.description && draft.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push({
      field: 'description',
      message: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`,
    });
  }

  // Category validation
  if (!draft.category) {
    errors.push({
      field: 'category',
      message: 'Category is required',
    });
  }

  // Date validation
  if (!draft.date) {
    errors.push({
      field: 'date',
      message: 'Date is required',
    });
  } else {
    const eventDate = new Date(draft.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (eventDate < now) {
      errors.push({
        field: 'date',
        message: 'Event date cannot be in the past',
      });
    }
  }

  // Time validation
  if (!draft.time || draft.time.trim().length === 0) {
    errors.push({
      field: 'time',
      message: 'Time is required',
    });
  } else if (!isValidTimeFormat(draft.time)) {
    errors.push({
      field: 'time',
      message: 'Invalid time format (use HH:MM)',
    });
  }

  // Duration validation
  if (draft.duration !== undefined && (draft.duration < 0 || draft.duration > 1440)) {
    errors.push({
      field: 'duration',
      message: 'Duration must be between 0 and 1440 minutes (24 hours)',
    });
  }

  // Location validation
  const locationErrors = validateLocation(draft.location);
  errors.push(...locationErrors);

  // Participants validation
  if (draft.maxParticipants !== undefined) {
    if (draft.maxParticipants < MIN_PARTICIPANTS) {
      errors.push({
        field: 'maxParticipants',
        message: `Minimum ${MIN_PARTICIPANTS} participants required`,
      });
    } else if (draft.maxParticipants > MAX_PARTICIPANTS) {
      errors.push({
        field: 'maxParticipants',
        message: `Maximum ${MAX_PARTICIPANTS} participants allowed`,
      });
    }
  } else {
    errors.push({
      field: 'maxParticipants',
      message: 'Maximum participants is required',
    });
  }

  // Price validation
  if (draft.price !== undefined) {
    if (draft.price < MIN_PRICE) {
      errors.push({
        field: 'price',
        message: 'Price cannot be negative',
      });
    } else if (draft.price > MAX_PRICE) {
      errors.push({
        field: 'price',
        message: `Price cannot exceed ${MAX_PRICE}`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateLocation(location: EventLocation | null | undefined): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!location) {
    errors.push({
      field: 'location',
      message: 'Location is required',
    });
    return errors;
  }

  if (!location.latitude || !location.longitude) {
    errors.push({
      field: 'location',
      message: 'Location coordinates are required',
    });
  } else {
    // Validate latitude range (-90 to 90)
    if (location.latitude < -90 || location.latitude > 90) {
      errors.push({
        field: 'location',
        message: 'Invalid latitude value',
      });
    }

    // Validate longitude range (-180 to 180)
    if (location.longitude < -180 || location.longitude > 180) {
      errors.push({
        field: 'location',
        message: 'Invalid longitude value',
      });
    }
  }

  if (!location.address || location.address.trim().length === 0) {
    errors.push({
      field: 'location',
      message: 'Location address is required',
    });
  }

  return errors;
}

function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

export function getValidationMessage(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  const firstError = errors[0];
  return firstError.message;
}

export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find(e => e.field === field);
  return error?.message || null;
}
