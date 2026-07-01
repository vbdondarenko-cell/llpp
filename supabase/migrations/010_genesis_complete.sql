-- =====================================================
-- LinkUp Genesis v1.0 - Complete Database Migration
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('active', 'cancelled', 'completed', 'hidden', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE chat_status AS ENUM ('active', 'archived', 'expired', 'deleted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('event', 'chat', 'friend', 'achievement', 'system', 'premium', 'announcement');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE premium_tier AS ENUM ('none', 'basic', 'premium', 'vip');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('admin', 'moderator', 'viewer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    telegram_id BIGINT,
    username TEXT,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    show_online BOOLEAN DEFAULT TRUE,
    show_events BOOLEAN DEFAULT TRUE,
    allow_messages BOOLEAN DEFAULT TRUE,
    language_code TEXT DEFAULT 'uk',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMPTZ,
    suspended_until TIMESTAMPTZ,
    suspension_reason TEXT,
    is_banned BOOLEAN DEFAULT FALSE,
    banned_at TIMESTAMPTZ,
    ban_reason TEXT,
    is_hidden BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- INTERESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    name_en TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interests viewable by everyone" ON public.interests FOR SELECT USING (is_active = TRUE);

-- =====================================================
-- USER_INTERESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, interest_id)
);
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User interests viewable by owner" ON public.user_interests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own interests" ON public.user_interests FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- EVENT_CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    name_en TEXT,
    icon TEXT,
    color TEXT,
    emoji TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON public.event_categories FOR SELECT USING (is_active = TRUE);

-- =====================================================
-- EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.event_categories(id),
    category TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    city TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    max_participants INTEGER DEFAULT 10,
    current_participants INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    status event_status DEFAULT 'active',
    is_hidden BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active events viewable by everyone" ON public.events FOR SELECT USING (status = 'active' AND is_hidden = FALSE);
CREATE POLICY "Organizers can view their events" ON public.events FOR SELECT USING (organizer_id = auth.uid());
CREATE POLICY "Users can create events" ON public.events FOR INSERT WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Organizers can update their events" ON public.events FOR UPDATE USING (organizer_id = auth.uid());
CREATE POLICY "Organizers can delete their events" ON public.events FOR DELETE USING (organizer_id = auth.uid());

-- =====================================================
-- EVENT_PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'participant' CHECK (role IN ('organizer', 'co-host', 'participant')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants viewable by members" ON public.event_participants FOR SELECT USING (user_id = auth.uid() OR event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid()));
CREATE POLICY "Users can join events" ON public.event_participants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Participants can manage membership" ON public.event_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Participants can leave" ON public.event_participants FOR DELETE USING (user_id = auth.uid() OR event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid()));

-- =====================================================
-- EVENT_REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status request_status DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requests viewable by participants" ON public.event_requests FOR SELECT USING (user_id = auth.uid() OR event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid()));
CREATE POLICY "Users can create requests" ON public.event_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Organizers can manage requests" ON public.event_requests FOR UPDATE USING (event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid()));

-- =====================================================
-- FRIENDSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Friendships viewable by participants" ON public.friendships FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users can send requests" ON public.friendships FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Users can manage friendships" ON public.friendships FOR UPDATE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- =====================================================
-- BLOCKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blocks viewable by blocker" ON public.blocks FOR SELECT USING (blocker_id = auth.uid());
CREATE POLICY "Users can block" ON public.blocks FOR INSERT WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Users can unblock" ON public.blocks FOR DELETE USING (blocker_id = auth.uid());

-- =====================================================
-- REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('user', 'event', 'message')),
    reason TEXT NOT NULL,
    description TEXT,
    evidence_urls TEXT[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports viewable by admins" ON public.reports FOR SELECT USING (reviewed_by = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins can manage reports" ON public.reports FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- =====================================================
-- CHATS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    name TEXT,
    avatar_url TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    status chat_status DEFAULT 'active',
    last_message_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chats viewable by members" ON public.chats FOR SELECT USING (id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()));

-- =====================================================
-- CHAT_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    nickname TEXT,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members viewable by participants" ON public.chat_members FOR SELECT USING (user_id = auth.uid() OR chat_id IN (SELECT id FROM public.chats WHERE is_group = TRUE));
CREATE POLICY "Users can join chats" ON public.chat_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'location', 'event', 'system')),
    metadata JSONB DEFAULT '{}',
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by chat members" ON public.messages FOR SELECT USING (chat_id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can edit/delete own messages" ON public.messages FOR UPDATE USING (sender_id = auth.uid());

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications viewable by owner" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- NOTIFICATION_PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    event_requests BOOLEAN DEFAULT TRUE,
    event_updates BOOLEAN DEFAULT TRUE,
    event_reminders BOOLEAN DEFAULT TRUE,
    friend_requests BOOLEAN DEFAULT TRUE,
    friend_activities BOOLEAN DEFAULT TRUE,
    chat_messages BOOLEAN DEFAULT TRUE,
    achievements BOOLEAN DEFAULT TRUE,
    premium_offers BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Preferences viewable by owner" ON public.notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage preferences" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- DEVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'telegram')),
    device_token TEXT NOT NULL,
    device_name TEXT,
    app_version TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devices viewable by owner" ON public.devices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage devices" ON public.devices FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    icon TEXT,
    color TEXT,
    category TEXT,
    points INTEGER DEFAULT 0,
    requirement_type TEXT,
    requirement_value INTEGER,
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    is_secret BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name)
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active achievements viewable by everyone" ON public.achievements FOR SELECT USING (is_active = TRUE);

-- =====================================================
-- USER_ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress INTEGER DEFAULT 0,
    UNIQUE(user_id, achievement_id)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements viewable by owner" ON public.user_achievements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can award achievements" ON public.user_achievements FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- PREMIUM TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.premium (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tier premium_tier DEFAULT 'none',
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT FALSE,
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.premium ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Premium viewable by owner" ON public.premium FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage premium" ON public.premium FOR ALL USING (TRUE);

-- =====================================================
-- PREMIUM_TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.premium_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier premium_tier NOT NULL,
    amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'UAH',
    payment_method TEXT,
    payment_id TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.premium_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions viewable by owner" ON public.premium_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create transactions" ON public.premium_transactions FOR INSERT WITH CHECK (TRUE);

-- =====================================================
-- PREMIUM_PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.premium_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier premium_tier NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    currency TEXT DEFAULT 'UAH',
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tier)
);
ALTER TABLE public.premium_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans viewable by everyone" ON public.premium_plans FOR SELECT USING (is_active = TRUE);

-- =====================================================
-- APP_SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public settings viewable by everyone" ON public.app_settings FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- =====================================================
-- ADMIN_USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role admin_role DEFAULT 'viewer',
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin users viewable by admins" ON public.admin_users FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));
CREATE POLICY "System can manage admin users" ON public.admin_users FOR ALL USING (TRUE);

-- =====================================================
-- AUDIT_LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs viewable by admins" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY "System can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (TRUE);

-- =====================================================
-- SEED DATA: INTERESTS (24)
-- =====================================================
INSERT INTO public.interests (name, name_en, icon, color, sort_order) VALUES
    ('Музыка', 'Music', '🎵', '#9b59b6', 1),
    ('Спорт', 'Sports', '⚽', '#27ae60', 2),
    ('Ежа', 'Food', '🍕', '#e74c3c', 3),
    ('Мистецтво', 'Art', '🎨', '#f39c12', 4),
    ('Технологии', 'Technology', '💻', '#3498db', 5),
    ('Путешествия', 'Travel', '✈️', '#1abc9c', 6),
    ('Книги', 'Books', '📚', '#795548', 7),
    ('Игры', 'Gaming', '🎮', '#673ab7', 8),
    ('Фитнес', 'Fitness', '💪', '#e91e63', 9),
    ('Фотография', 'Photography', '📷', '#607d8b', 10),
    ('Кофе', 'Coffee', '☕', '#8d6e63', 11),
    ('Кино', 'Movies', '🎬', '#e74c3c', 12),
    ('Концерты', 'Concerts', '🎤', '#9b59b6', 13),
    ('Велоспорт', 'Cycling', '🚴', '#27ae60', 14),
    ('Бег', 'Running', '🏃', '#e67e22', 15),
    ('Природа', 'Nature', '🌿', '#2ecc71', 16),
    ('Настольные игры', 'Board Games', '🎲', '#9b59b6', 17),
    ('Языки', 'Languages', '🗣️', '#3498db', 18),
    ('Бизнес', 'Business', '💼', '#2c3e50', 19),
    ('Нетворкинг', 'Networking', '🤝', '#16a085', 20),
    ('Волонтерство', 'Volunteering', '❤️', '#e74c3c', 21),
    ('Танцы', 'Dancing', '💃', '#e91e63', 22),
    ('Йога', 'Yoga', '🧘', '#9c88ff', 23),
    ('Авто', 'Cars', '🚗', '#34495e', 24)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SEED DATA: EVENT CATEGORIES (12)
-- =====================================================
INSERT INTO public.event_categories (name, name_en, icon, color, emoji, sort_order) VALUES
    ('Социализация', 'Socialization', '👥', '#3498db', '👥', 1),
    ('Спорт', 'Sports', '⚽', '#27ae60', '⚽', 2),
    ('Еда и напитки', 'Food & Drinks', '🍕', '#e74c3c', '🍕', 3),
    ('Музыка', 'Music', '🎵', '#9b59b6', '🎵', 4),
    ('Мистецтво', 'Art', '🎨', '#f39c12', '🎨', 5),
    ('Технологии', 'Technology', '💻', '#34495e', '💻', 6),
    ('Путешествия', 'Travel', '✈️', '#1abc9c', '✈️', 7),
    ('Обучение', 'Education', '📚', '#16a085', '📚', 8),
    ('Игры', 'Gaming', '🎮', '#673ab7', '🎮', 9),
    ('Природа', 'Nature', '🌿', '#2ecc71', '🌿', 10),
    ('Бизнес', 'Business', '💼', '#2c3e50', '💼', 11),
    ('Другое', 'Other', '✨', '#95a5a6', '✨', 12)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SEED DATA: ACHIEVEMENTS (18)
-- =====================================================
INSERT INTO public.achievements (name, name_en, description, description_en, icon, color, category, points, tier, requirement_type, requirement_value) VALUES
    ('Первый шаг', 'First Step', 'Создайте свой профиль', 'Create your profile', '👋', '#cd7f32', 'social', 10, 'bronze', 'profile_complete', 1),
    ('Знакомец', 'Acquaintance', 'Посетите 3 разных события', 'Attend 3 events', '🚶', '#cd7f32', 'events', 25, 'bronze', 'events_attended', 3),
    ('Друг', 'Friend Maker', 'Добавьте 5 интересов', 'Add 5 interests', '🏷️', '#cd7f32', 'social', 15, 'bronze', 'interests_added', 5),
    ('Организатор', 'Organizer', 'Создайте первое событие', 'Create first event', '📋', '#c0c0c0', 'events', 50, 'silver', 'events_created', 1),
    ('Тусовщик', 'Social Butterfly', 'Посетите 10 событий', 'Attend 10 events', '🦋', '#c0c0c0', 'events', 75, 'silver', 'events_attended', 10),
    ('Нетворкер', 'Networker', 'Заведите 20 новых друзей', 'Make 20 friends', '🤝', '#c0c0c0', 'social', 100, 'silver', 'friends_made', 20),
    ('Активист', 'Active User', 'Бывайте онлайн 7 дней подряд', 'Be online 7 days', '🔥', '#c0c0c0', 'engagement', 50, 'silver', 'streak_days', 7),
    ('Легенда', 'Legend', 'Создайте 10 событий', 'Create 10 events', '⭐', '#ffd700', 'events', 200, 'gold', 'events_created', 10),
    ('Мессенджер', 'Messenger', 'Отправьте 100 сообщений', 'Send 100 messages', '💬', '#ffd700', 'communication', 100, 'gold', 'messages_sent', 100),
    ('Магнат', 'Event Magnate', 'Посетите 50 событий', 'Attend 50 events', '🎉', '#ffd700', 'events', 250, 'gold', 'events_attended', 50),
    ('Звезда', 'Star', 'Получите 100 верификаций', 'Get 100 verifications', '🌟', '#ffd700', 'social', 150, 'gold', 'verifications', 100),
    ('Мастер', 'Master', 'Создайте 50 событий', 'Create 50 events', '👑', '#e5e4e2', 'events', 500, 'platinum', 'events_created', 50),
    ('Влиятельный', 'Influencer', 'Наберите 1000 последователей', 'Gain 1000 followers', '📈', '#e5e4e2', 'social', 400, 'platinum', 'followers', 1000),
    ('Ветеран', 'Veteran', 'Пользуйтесь LinkUp 365 дней', 'Use LinkUp 365 days', '🎖️', '#e5e4e2', 'engagement', 1000, 'platinum', 'days_active', 365),
    ('Диамант', 'Diamond', 'Создайте 100 событий', 'Create 100 events', '💎', '#b9f2ff', 'events', 1000, 'diamond', 'events_created', 100),
    ('Чемпион', 'Champion', 'Посетите 500 событий', 'Attend 500 events', '🏆', '#b9f2ff', 'events', 1500, 'diamond', 'events_attended', 500),
    ('Амбасадор', 'Ambassador', 'Пригласите 50 друзей', 'Invite 50 friends', '🎊', '#b9f2ff', 'social', 750, 'diamond', 'invites', 50)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SEED DATA: PREMIUM PLANS (3)
-- =====================================================
INSERT INTO public.premium_plans (tier, name, name_en, description, description_en, price_monthly, price_yearly, features, sort_order) VALUES
    ('basic', 'Basic', 'Basic', 'Базовый план', 'Basic plan', 29.99, 299.99, '["Бесплатные сообщения", "До 5 интересов"]', 1),
    ('premium', 'Premium', 'Premium', 'Улучшенный опыт', 'Enhanced experience', 79.99, 799.99, '["Безлимитные сообщения", "Безлимитные интересы", "Приоритетные уведомления"]', 2),
    ('vip', 'VIP', 'VIP', 'VIP опыт', 'VIP experience', 149.99, 1499.99, '["Все с Premium", "VIP badge", "Рекомендации"]', 3)
ON CONFLICT (tier) DO NOTHING;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events USING gist (ST_MakePoint(longitude, latitude)::geography);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_event ON public.event_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_user ON public.event_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_chats_event ON public.chats(event_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON public.chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_devices_user ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_user ON public.premium(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_premium_updated_at BEFORE UPDATE ON public.premium FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id) VALUES (NEW.id);
    INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'LinkUp Genesis v1.0 - Complete!' as status;
