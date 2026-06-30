// Event Creation Types and Constants
import type { EventCategory } from './types';

export interface EventFormData {
  title: string;
  description: string;
  category: EventCategory | null;
  eventDate: string;
  eventTime: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  locationAddress: string;
  maxParticipants: number;
  isPublic: boolean;
  requiresApproval: boolean;
  photoUrl: string | null;
  photoBlob: Blob | null;
}

export interface ValidationError {
  field: keyof EventFormData | 'general';
  message: string;
}

export interface FormValidation {
  isValid: boolean;
  errors: ValidationError[];
}

export const INITIAL_FORM_DATA: EventFormData = {
  title: '',
  description: '',
  category: null,
  eventDate: '',
  eventTime: '',
  latitude: null,
  longitude: null,
  locationName: '',
  locationAddress: '',
  maxParticipants: 10,
  isPublic: true,
  requiresApproval: false,
  photoUrl: null,
  photoBlob: null,
};

export const VALIDATION_RULES = {
  title: {
    minLength: 3,
    maxLength: 100,
    required: true,
  },
  description: {
    maxLength: 500,
    required: false,
  },
  category: {
    required: true,
  },
  eventDate: {
    required: true,
    minDate: new Date().toISOString().split('T')[0],
  },
  eventTime: {
    required: true,
  },
  maxParticipants: {
    min: 2,
    max: 1000,
  },
};

export function validateEventForm(data: EventFormData): FormValidation {
  const errors: ValidationError[] = [];

  // Title validation
  if (VALIDATION_RULES.title.required && !data.title.trim()) {
    errors.push({ field: 'title', message: 'Назва обов\'язкова' });
  } else if (data.title.length < VALIDATION_RULES.title.minLength) {
    errors.push({ 
      field: 'title', 
      message: `Назва занадто коротка (мін. ${VALIDATION_RULES.title.minLength} символів)` 
    });
  } else if (data.title.length > VALIDATION_RULES.title.maxLength) {
    errors.push({ 
      field: 'title', 
      message: `Назва занадто довга (макс. ${VALIDATION_RULES.title.maxLength} символів)` 
    });
  }

  // Description validation
  if (data.description.length > VALIDATION_RULES.description.maxLength) {
    errors.push({ 
      field: 'description', 
      message: `Опис занадто довгий (макс. ${VALIDATION_RULES.description.maxLength} символів)` 
    });
  }

  // Category validation
  if (VALIDATION_RULES.category.required && !data.category) {
    errors.push({ field: 'category', message: 'Оберіть категорію' });
  }

  // Date validation
  if (VALIDATION_RULES.eventDate.required && !data.eventDate) {
    errors.push({ field: 'eventDate', message: 'Оберіть дату' });
  } else if (data.eventDate) {
    const selectedDate = new Date(data.eventDate);
    const minDate = new Date(VALIDATION_RULES.eventDate.minDate);
    if (selectedDate < minDate) {
      errors.push({ field: 'eventDate', message: 'Дата не може бути в минулому' });
    }
  }

  // Time validation
  if (VALIDATION_RULES.eventTime.required && !data.eventTime) {
    errors.push({ field: 'eventTime', message: 'Оберіть час' });
  }

  // Location validation
  if (!data.locationName.trim()) {
    errors.push({ field: 'locationName', message: 'Вкажіть назву місця' });
  }

  // Participants validation
  if (data.maxParticipants < VALIDATION_RULES.maxParticipants.min) {
    errors.push({ 
      field: 'maxParticipants', 
      message: `Мінімум ${VALIDATION_RULES.maxParticipants.min} учасників` 
    });
  } else if (data.maxParticipants > VALIDATION_RULES.maxParticipants.max) {
    errors.push({ 
      field: 'maxParticipants', 
      message: `Максимум ${VALIDATION_RULES.maxParticipants.max} учасників` 
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getFieldError(errors: ValidationError[], field: keyof EventFormData): string | null {
  const error = errors.find(e => e.field === field);
  return error?.message || null;
}
