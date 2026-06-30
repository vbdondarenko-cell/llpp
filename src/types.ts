// TypeScript types for LinkUp

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  start_param?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  telegram_id: number | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  city: string;
  rating: number;
  rating_count: number;
  role: 'user' | 'moderator' | 'admin';
  is_banned: boolean;
  has_completed_onboarding: boolean;
  created_at: string;
  updated_at: string;
}

export interface Interest {
  id: string;
  name: string;
  icon: string | null;
  category: string;
  created_at: string;
}

export interface UserInterest {
  id: string;
  user_id: string;
  interest_id: string;
  created_at: string;
}

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
}

export type ViewType = 'splash' | 'onboarding' | 'home' | 'map';

export interface AppState {
  currentView: ViewType;
  isAuthenticated: boolean;
  profile: Profile | null;
  interests: Interest[];
  userInterests: Interest[];
  isLoading: boolean;
  mapInitialized: boolean;
  userLocation: Location | null;
  selectedCategory: string | null;
  events: MapEvent[];
  bottomSheetState: BottomSheetState;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export type BottomSheetState = 'collapsed' | 'half' | 'full';

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

export interface MapEvent {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  event_type: 'in_person' | 'online' | 'hybrid';
  latitude: number;
  longitude: number;
  location_name: string | null;
  location_address: string | null;
  event_date: string;
  event_end_date: string | null;
  max_participants: number;
  current_participants: number;
  price: number;
  currency: string;
  photo_url: string | null;
  status: string;
  requires_approval: boolean;
  is_premium_only: boolean;
  organizer: {
    id: string;
    username: string | null;
    first_name: string | null;
    avatar_url: string | null;
  };
  distance: number;
  created_at: string;
}

export interface CategoryFilter {
  key: EventCategory;
  label: string;
  icon: string;
  color: string;
}
