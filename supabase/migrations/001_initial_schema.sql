-- ============================================
-- LinkUp Database Schema
-- Sprint 10: Alpha Testing
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    telegram_id BIGINT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    cover_url TEXT,
    city TEXT DEFAULT 'kyiv',
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    ban_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    icon TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User interests junction table
CREATE TABLE IF NOT EXISTS user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, interest_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    max_participants INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    requires_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event participants
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Event requests (for requires_approval = true)
CREATE TABLE IF NOT EXISTS event_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Messages (chat)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    requirement INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Premium subscriptions
CREATE TABLE IF NOT EXISTS premiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('day', 'week', 'month', 'year')),
    stars_amount INTEGER NOT NULL,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id),
    reported_user_id UUID REFERENCES profiles(id),
    reported_event_id UUID REFERENCES events(id),
    reason TEXT NOT NULL,
    description TEXT,
    evidence_urls TEXT[],
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
    resolved_by UUID REFERENCES profiles(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Admin logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    language TEXT DEFAULT 'uk',
    theme TEXT DEFAULT 'dark',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_event ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_premiums_user ON premiums(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE premiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Events RLS
CREATE POLICY "Active events are viewable by everyone"
    ON events FOR SELECT
    USING (status = 'active' OR organizer_id = (SELECT user_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create events"
    ON events FOR INSERT
    WITH CHECK (organizer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own events"
    ON events FOR UPDATE
    USING (organizer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Messages RLS
CREATE POLICY "Users can view messages from events they're in"
    ON messages FOR SELECT
    USING (
        event_id IN (
            SELECT event_id FROM event_participants
            WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND status = 'approved'
        )
    );

CREATE POLICY "Users can send messages to events they're in"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND event_id IN (
            SELECT event_id FROM event_participants
            WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND status = 'approved'
        )
    );

-- Event participants RLS
CREATE POLICY "Participants viewable by event members"
    ON event_participants FOR SELECT
    USING (
        event_id IN (
            SELECT event_id FROM event_participants
            WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can join events"
    ON event_participants FOR INSERT
    WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Admin logs RLS
CREATE POLICY "Admins can view admin logs"
    ON admin_logs FOR SELECT
    USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('admin', 'moderator')
    );

CREATE POLICY "Admins can insert admin logs"
    ON admin_logs FOR INSERT
    WITH CHECK (admin_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get user ID from auth
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get full profile with stats
CREATE OR REPLACE FUNCTION get_profile_full(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'bio', p.bio,
        'avatar_url', p.avatar_url,
        'cover_url', p.cover_url,
        'city', p.city,
        'rating', p.rating,
        'rating_count', p.rating_count,
        'role', p.role,
        'events_count', (
            SELECT COUNT(*) FROM events WHERE organizer_id = p.id
        ),
        'friends_count', (
            SELECT COUNT(*) FROM friendships 
            WHERE (user_id = p.id OR friend_id = p.id)
            AND status = 'accepted'
        ),
        'achievements_count', (
            SELECT COUNT(*) FROM user_achievements WHERE user_id = p.id
        ),
        'premium_active', (
            SELECT EXISTS (
                SELECT 1 FROM premiums 
                WHERE user_id = p.id 
                AND is_active = TRUE 
                AND expires_at > NOW()
            )
        ),
        'created_at', p.created_at
    ) INTO result
    FROM profiles p
    WHERE p.id = target_user_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(
    p_user_id UUID,
    p_action TEXT,
    p_value INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    new_achievements JSON[];
    achievement_key TEXT;
BEGIN
    -- First event
    IF p_action = 'event_created' THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = p_user_id AND a.key = 'first_event'
        ) THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT p_user_id, id FROM achievements WHERE key = 'first_event';
            
            new_achievements := array_append(new_achievements, 
                json_build_object('key', 'first_event', 'name', 'Перша подія')
            );
        END IF;
    END IF;

    -- 10 events
    IF p_action = 'event_count' AND p_value >= 10 THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = p_user_id AND a.key = 'ten_events'
        ) THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT p_user_id, id FROM achievements WHERE key = 'ten_events';
            
            new_achievements := array_append(new_achievements,
                json_build_object('key', 'ten_events', 'name', '10 подій')
            );
        END IF;
    END IF;

    -- First friend
    IF p_action = 'friend_added' THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = p_user_id AND a.key = 'first_friend'
        ) THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT p_user_id, id FROM achievements WHERE key = 'first_friend';
            
            new_achievements := array_append(new_achievements,
                json_build_object('key', 'first_friend', 'name', 'Перший друг')
            );
        END IF;
    END IF;

    -- Premium purchased
    IF p_action = 'premium_purchased' THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = p_user_id AND a.key = 'first_premium'
        ) THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT p_user_id, id FROM achievements WHERE key = 'first_premium';
            
            new_achievements := array_append(new_achievements,
                json_build_object('key', 'first_premium', 'name', 'Перший Premium')
            );
        END IF;
    END IF;

    -- 100 messages
    IF p_action = 'message_count' AND p_value >= 100 THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = p_user_id AND a.key = 'hundred_messages'
        ) THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT p_user_id, id FROM achievements WHERE key = 'hundred_messages';
            
            new_achievements := array_append(new_achievements,
                json_build_object('key', 'hundred_messages', 'name', '100 повідомлень')
            );
        END IF;
    END IF;

    RETURN json_build_object('new_achievements', COALESCE(new_achievements, '[]'::JSON));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send message and check achievements
CREATE OR REPLACE FUNCTION send_message(p_event_id UUID, p_content TEXT)
RETURNS JSON AS $$
DECLARE
    v_sender_id UUID;
    v_message_id UUID;
    v_message_count INTEGER;
    v_result JSON;
BEGIN
    v_sender_id := get_user_id();
    
    INSERT INTO messages (event_id, sender_id, content)
    VALUES (p_event_id, v_sender_id, p_content)
    RETURNING id INTO v_message_id;

    -- Count messages
    SELECT COUNT(*) INTO v_message_count
    FROM messages
    WHERE sender_id = v_sender_id;

    -- Check for achievements
    SELECT check_achievements(v_sender_id, 'message_count', v_message_count) INTO v_result;

    RETURN json_build_object(
        'message_id', v_message_id,
        'achievements', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_action TEXT,
    p_target_type TEXT,
    p_target_id UUID,
    p_details JSONB
)
RETURNS VOID AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    v_admin_id := get_user_id();
    
    INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, p_action, p_target_type, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA: Achievements
-- ============================================

INSERT INTO achievements (key, name, description, icon, requirement) VALUES
    ('first_event', 'Перша подія', 'Створіть свою першу подію', '🎯', 1),
    ('ten_events', '10 подій', 'Відвідайте 10 подій', '🔥', 10),
    ('fifty_events', '50 подій', 'Відвідайте 50 подій', '🚀', 50),
    ('hundred_events', '100 подій', 'Відвідайте 100 подій', '👑', 100),
    ('first_friend', 'Перший друг', 'Додайте першого друга', '🤝', 1),
    ('first_premium', 'Перший Premium', 'Оформіть Premium підписку', '⭐', 1),
    ('hundred_messages', '100 повідомлень', 'Напишіть 100 повідомлень', '💬', 100)
ON CONFLICT (key) DO NOTHING;

-- Seed interests
INSERT INTO interests (name, icon, category) VALUES
    ('Музика', '🎵', 'entertainment'),
    ('Спорт', '⚽', 'active'),
    ('Їжа', '🍕', 'food'),
    ('Мистецтво', '🎨', 'culture'),
    ('Кава', '☕', 'food'),
    ('Подорожі', '✈️', 'travel'),
    ('Книги', '📚', 'culture'),
    ('Геймінг', '🎮', 'entertainment'),
    ('Танці', '💃', 'active'),
    ('Фотографія', '📷', 'hobby'),
    ('Кіно', '🎬', 'entertainment'),
    ('Йога', '🧘', 'health')
ON CONFLICT DO NOTHING;
