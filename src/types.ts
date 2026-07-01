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

export type ViewType = 'splash' | 'onboarding' | 'home' | 'map' | 'create' | 'premium' | 'achievements' | 'profile';

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

// Event Request Types
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface EventRequest {
  id: string;
  event_id: string;
  user_id: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    username: string | null;
    first_name: string | null;
    avatar_url: string | null;
    rating: number;
    rating_count: number;
  };
}

export interface RequestResult {
  success: boolean;
  error?: string;
  message?: string;
  status?: RequestStatus;
  request_id?: string;
  requires_approval?: boolean;
  user_id?: string;
}

export interface EventRequestsResponse {
  success: boolean;
  error?: string;
  pending: EventRequest[];
  accepted: EventRequest[];
  declined: EventRequest[];
  event: {
    current_participants: number;
    max_participants: number;
  };
}

export interface UserRequestStatus {
  has_request: boolean;
  status?: RequestStatus;
  created_at?: string;
}

// Chat Types
export type MessageType = 'text' | 'image' | 'system';

export interface Chat {
  id: string;
  event_id: string;
  name: string;
  is_group: boolean;
  created_by: string;
  expires_at: string;
  archived_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMember {
  id: string;
  user_id: string;
  role: 'organizer' | 'member';
  joined_at: string;
  last_read_at: string;
  unread_count: number;
  is_active: boolean;
  is_online?: boolean;
  profile?: {
    id: string;
    username: string | null;
    first_name: string | null;
    avatar_url: string | null;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_by: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sender?: {
    id: string;
    username: string | null;
    first_name: string | null;
    avatar_url: string | null;
  };
}

export interface ChatListItem {
  id: string;
  name: string;
  event_id: string;
  expires_at: string;
  is_active: boolean;
  unread_count: number;
  last_message: {
    content: string;
    message_type: MessageType;
    created_at: string;
    sender_id: string;
  } | null;
  member_count: number;
}

export interface ChatResult {
  success: boolean;
  error?: string;
  chat_id?: string;
  expires_at?: string;
  already_exists?: boolean;
}

export interface MessageResult {
  success: boolean;
  error?: string;
  message?: Message;
}

export interface MessagesResult {
  success: boolean;
  error?: string;
  messages: Message[];
}

export interface ChatsResult {
  success: boolean;
  error?: string;
  chats: ChatListItem[];
}

export interface MembersResult {
  success: boolean;
  error?: string;
  members: ChatMember[];
}

// Premium Types
export interface PremiumStatus {
  is_premium: boolean;
  started_at: string | null;
  expires_at: string | null;
}

export interface PremiumPlan {
  id: 'day' | 'week' | 'month' | 'year';
  name: string;
  duration: string;
  stars: number;
  features: string[];
  popular?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  purchase_id?: string;
  plan_id?: string;
  plan_name?: string;
  stars_amount?: number;
  already_exists?: boolean;
}

export interface PurchaseHistory {
  id: string;
  plan_name: string;
  stars_amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  completed_at: string | null;
}

export interface PurchaseHistoryResult {
  success: boolean;
  error?: string;
  purchases: PurchaseHistory[];
}

// Achievement Types
export type AchievementCategory = 'events' | 'social' | 'premium' | 'exploration';

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirement_type: string;
  requirement_value: number;
  reward_points: number;
  is_hidden: boolean;
}

export interface UserAchievement extends Achievement {
  is_unlocked: boolean;
  unlocked_at: string | null;
  progress: number;
  progress_percentage: number;
}

export interface AchievementNotification {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  reward_points: number;
}

export interface AchievementsResult {
  success: boolean;
  error?: string;
  achievements: UserAchievement[];
  total_count: number;
  unlocked_count: number;
}

export interface AchievementCheckResult {
  success: boolean;
  error?: string;
  unlocked: AchievementNotification[];
}

// Profile Types
export interface UserStatistics {
  events_created: number;
  events_joined: number;
  completed_events: number;
  messages_sent: number;
  chats_joined: number;
  friends_added: number;
  achievements_count: number;
  categories_explored_count: number;
  is_premium: boolean;
  premium_expires_at: string | null;
  average_rating: number;
  rating_count: number;
}

export interface PrivacySettings {
  show_online: boolean;
  show_events: boolean;
  allow_messages: boolean;
}

export interface AppSettings {
  language: string;
  notifications_enabled: boolean;
  dark_mode: boolean;
}

export interface UserProfile {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  interests: string[];
  location: string;
  created_at: string;
  statistics: {
    events_created: number;
    events_joined: number;
    completed_events: number;
    friends_added: number;
    achievements_count: number;
    is_premium: boolean;
    average_rating: number;
    rating_count: number;
  };
  privacy: PrivacySettings;
  settings: AppSettings;
  is_own_profile: boolean;
  can_view_full: boolean;
}

export interface ProfileResult {
  success: boolean;
  error?: string;
  profile: UserProfile;
}

export interface StatisticsResult {
  success: boolean;
  error?: string;
  statistics: UserStatistics;
}

export interface Friend {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  friendship_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_premium: boolean;
}

export interface FriendsResult {
  success: boolean;
  error?: string;
  friends: Friend[];
}

export interface FriendRequest {
  friendship_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  created_at: string;
}

export interface FriendRequestsResult {
  success: boolean;
  error?: string;
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

// Admin Types
export interface AdminStats {
  total_users: number;
  total_events: number;
  total_premium: number;
  pending_reports: number;
  suspended_users: number;
  banned_users: number;
  total_messages: number;
  daily_active_users: number;
  events_this_week: number;
  new_users_today: number;
}

export interface AdminUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_suspended: boolean;
  is_banned: boolean;
  is_hidden: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  ban_reason: string | null;
  created_at: string;
  events_created: number;
  events_joined: number;
  is_premium: boolean;
  is_admin: boolean;
}

export interface AdminEvent {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  status: string;
  is_cancelled: boolean;
  is_hidden: boolean;
  created_at: string;
  organizer_username: string;
  organizer_name: string;
  participants_count: number;
}

export interface UserReport {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_username: string | null;
  reporter_name: string | null;
  reported_username: string;
  reported_name: string;
  type: 'user';
}

export interface EventReport {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_username: string | null;
  event_title: string;
  type: 'event';
}

export interface AdminChat {
  id: string;
  chat_type: string;
  event_title: string | null;
  message_count: number;
  created_at: string;
  expires_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin_role: string;
  admin_username: string;
}

export interface AdminStatsResult {
  success: boolean;
  error?: string;
  stats: AdminStats;
}

export interface AdminUsersResult {
  success: boolean;
  error?: string;
  users: AdminUser[];
  total: number;
}

export interface AdminEventsResult {
  success: boolean;
  error?: string;
  events: AdminEvent[];
  total: number;
}

export interface AdminReportsResult {
  success: boolean;
  error?: string;
  reports: (UserReport | EventReport)[];
  total: number;
}

export interface AdminChatsResult {
  success: boolean;
  error?: string;
  chats: AdminChat[];
  total: number;
}

export interface AuditLogResult {
  success: boolean;
  error?: string;
  logs: AuditLogEntry[];
  total: number;
}
