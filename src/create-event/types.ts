// Create Event Screen Types

export type EventCategory = 
  | 'party' 
  | 'sport' 
  | 'food' 
  | 'music' 
  | 'art' 
  | 'nature' 
  | 'games' 
  | 'networking' 
  | 'education' 
  | 'other';

export interface EventDraft {
  coverImage: string | null;
  title: string;
  description: string;
  category: EventCategory | null;
  date: Date | null;
  time: string;
  duration: number;
  location: EventLocation | null;
  maxParticipants: number;
  price: number;
  isPaid: boolean;
  currency: string;
  requiresApproval: boolean;
  isPrivate: boolean;
  premiumOnly: boolean;
  allowGuests: boolean;
}

export interface EventLocation {
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
}

export interface CreateEventResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export const CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: string; color: string }> = {
  party: { label: 'Party', icon: '🎉', color: '#ec4899' },
  sport: { label: 'Sport', icon: '⚽', color: '#22c55e' },
  food: { label: 'Food', icon: '🍕', color: '#f97316' },
  music: { label: 'Music', icon: '🎵', color: '#8b5cf6' },
  art: { label: 'Art', icon: '🎨', color: '#ec4899' },
  nature: { label: 'Nature', icon: '🌿', color: '#22c55e' },
  games: { label: 'Games', icon: '🎮', color: '#6366f1' },
  networking: { label: 'Networking', icon: '🤝', color: '#0ea5e9' },
  education: { label: 'Education', icon: '📚', color: '#f59e0b' },
  other: { label: 'Other', icon: '✨', color: '#94a3b8' },
};

export const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 120, label: '2 h' },
  { value: 180, label: '3 h' },
  { value: 240, label: '4 h' },
  { value: 0, label: 'Custom' },
];

export const DRAFT_STORAGE_KEY = 'linkup_event_draft';
