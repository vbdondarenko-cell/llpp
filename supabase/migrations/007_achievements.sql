-- ============================================
-- Achievements & Gamification System
-- Sprint 7: Achievements
-- ============================================

-- Achievements Definition Table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('events', 'social', 'premium', 'exploration')),
    requirement_type TEXT NOT NULL CHECK (requirement_type IN (
        'events_created', 'events_joined', 'messages_sent', 
        'premium_activated', 'friends_added', 'categories_explored',
        'chats_joined', 'streak_days'
    )),
    requirement_value INTEGER NOT NULL DEFAULT 1,
    reward_points INTEGER DEFAULT 10,
    is_hidden BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements (unlocked)
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    notification_shown BOOLEAN DEFAULT false,
    UNIQUE(user_id, achievement_id)
);

-- Achievement Progress Tracking
CREATE TABLE IF NOT EXISTS public.achievement_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- User Stats (for efficient queries)
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    events_created INTEGER DEFAULT 0,
    events_joined INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    chats_joined INTEGER DEFAULT 0,
    categories_explored TEXT[] DEFAULT '{}',
    friends_added INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(unlocked_at);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON public.achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON public.achievements(code);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_achievements_updated_at ON public.user_achievements;
DROP TRIGGER IF EXISTS update_achievement_progress_updated_at ON public.achievement_progress;
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON public.user_stats;

-- ============================================
-- Insert Default Achievements
-- ============================================
INSERT INTO public.achievements (code, name, description, icon, category, requirement_type, requirement_value, reward_points, is_hidden, sort_order) VALUES
-- Events Category
('first_event', 'Перша подія', 'Створіть свою першу подію', '🎯', 'events', 'events_created', 1, 10, false, 1),
('ten_events', 'Активний творець', 'Створіть 10 подій', '🎪', 'events', 'events_created', 10, 50, false, 2),
('fifty_events', 'Майстер подій', 'Створіть 50 подій', '🏆', 'events', 'events_created', 50, 100, false, 3),
('hundred_events', 'Легенда', 'Створіть 100 подій', '👑', 'events', 'events_created', 100, 200, true, 4),

-- Social Category
('first_join', 'Учасник', 'Приєднайтесь до першої події', '🤝', 'social', 'events_joined', 1, 10, false, 10),
('first_chat', 'Чатовод', 'Напишіть перше повідомлення в чаті', '💬', 'social', 'messages_sent', 1, 10, false, 11),
('hundred_messages', 'Балагур', 'Напишіть 100 повідомлень', '💭', 'social', 'messages_sent', 100, 50, false, 12),
('ten_friends', 'Друзі', 'Додайте 10 друзів', '👥', 'social', 'friends_added', 10, 50, false, 13),

-- Premium Category
('first_premium', 'VIP', 'Активуйте Premium підписку', '⭐', 'premium', 'premium_activated', 1, 100, false, 20),

-- Exploration Category
('category_explorer', 'Дослідник', 'Відвідайте події в 5 різних категоріях', '🧭', 'exploration', 'categories_explored', 5, 30, false, 30)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- RPC Functions
-- ============================================

-- Initialize user stats for new user
CREATE OR REPLACE FUNCTION public.initialize_user_stats()
RETURNS JSON AS $$
DECLARE
    v_stats public.user_stats;
BEGIN
    INSERT INTO public.user_stats (user_id, last_active_date)
    VALUES (auth.uid(), CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO v_stats;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user stat (generic increment)
CREATE OR REPLACE FUNCTION public.increment_user_stat(
    p_stat_name TEXT,
    p_value INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    v_sql TEXT;
    v_result JSON;
BEGIN
    v_sql := format(
        'UPDATE public.user_stats SET %I = %I + $1, last_active_date = CURRENT_DATE, updated_at = NOW() WHERE user_id = $2 RETURNING *',
        p_stat_name,
        p_stat_name
    );
    
    EXECUTE v_sql INTO v_result USING p_value, auth.uid();
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update categories explored
CREATE OR REPLACE FUNCTION public.add_explored_category(p_category TEXT)
RETURNS JSON AS $$
BEGIN
    UPDATE public.user_stats
    SET categories_explored = array_unique(categories_explored || ARRAY[p_category]),
        last_active_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = auth.uid();
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check and unlock achievements
CREATE OR REPLACE FUNCTION public.check_achievements()
RETURNS JSON AS $$
DECLARE
    v_user_stats public.user_stats;
    v_new_achievements JSON[];
    v_achievement public.achievements;
    v_progress public.achievement_progress;
    v_unlock notification_data%ROWTYPE;
BEGIN
    -- Get user stats
    SELECT * INTO v_user_stats FROM public.user_stats WHERE user_id = auth.uid();
    
    IF v_user_stats IS NULL THEN
        RETURN json_build_object('success', true, 'unlocked', '[]'::JSON);
    END IF;
    
    -- Check each achievement
    FOR v_achievement IN SELECT * FROM public.achievements LOOP
        -- Get or create progress
        SELECT * INTO v_progress
        FROM public.achievement_progress
        WHERE user_id = auth.uid() AND achievement_id = v_achievement.id;
        
        IF v_progress IS NULL THEN
            INSERT INTO public.achievement_progress (user_id, achievement_id, current_value)
            VALUES (auth.uid(), v_achievement.id, 0)
            RETURNING * INTO v_progress;
        END IF;
        
        -- Calculate current value based on type
        DECLARE
            v_current_value INTEGER := 0;
        BEGIN
            CASE v_achievement.requirement_type
                WHEN 'events_created' THEN v_current_value := v_user_stats.events_created;
                WHEN 'events_joined' THEN v_current_value := v_user_stats.events_joined;
                WHEN 'messages_sent' THEN v_current_value := v_user_stats.messages_sent;
                WHEN 'premium_activated' THEN 
                    SELECT COUNT(*) INTO v_current_value 
                    FROM public.premium_status 
                    WHERE user_id = auth.uid() AND is_premium = true;
                WHEN 'friends_added' THEN v_current_value := v_user_stats.friends_added;
                WHEN 'categories_explored' THEN v_current_value := array_length(v_user_stats.categories_explored, 1);
                WHEN 'chats_joined' THEN v_current_value := v_user_stats.chats_joined;
                WHEN 'streak_days' THEN v_current_value := v_user_stats.streak_days;
                ELSE v_current_value := 0;
            END CASE;
            
            -- Update progress
            UPDATE public.achievement_progress
            SET current_value = v_current_value, updated_at = NOW()
            WHERE user_id = auth.uid() AND achievement_id = v_achievement.id;
            
            -- Check if achievement should be unlocked
            IF v_current_value >= v_achievement.requirement_value THEN
                -- Check if not already unlocked
                IF NOT EXISTS (
                    SELECT 1 FROM public.user_achievements
                    WHERE user_id = auth.uid() AND achievement_id = v_achievement.id
                ) THEN
                    -- Unlock achievement
                    INSERT INTO public.user_achievements (user_id, achievement_id)
                    VALUES (auth.uid(), v_achievement.id);
                    
                    -- Add to notifications
                    v_new_achievements := array_append(v_new_achievements, json_build_object(
                        'id', v_achievement.id,
                        'code', v_achievement.code,
                        'name', v_achievement.name,
                        'description', v_achievement.description,
                        'icon', v_achievement.icon,
                        'reward_points', v_achievement.reward_points
                    ));
                END IF;
            END IF;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'unlocked', COALESCE(v_new_achievements, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all achievements with progress
CREATE OR REPLACE FUNCTION public.get_my_achievements()
RETURNS JSON AS $$
DECLARE
    v_achievements JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'id', a.id,
        'code', a.code,
        'name', a.name,
        'description', a.description,
        'icon', a.icon,
        'category', a.category,
        'requirement_type', a.requirement_type,
        'requirement_value', a.requirement_value,
        'reward_points', a.reward_points,
        'is_hidden', a.is_hidden,
        'is_unlocked', CASE WHEN ua.id IS NOT NULL THEN true ELSE false END,
        'unlocked_at', ua.unlocked_at,
        'progress', COALESCE(ap.current_value, 0),
        'progress_percentage', LEAST(100, (COALESCE(ap.current_value, 0)::FLOAT / NULLIF(a.requirement_value, 0) * 100)::INTEGER)
    ) ORDER BY a.sort_order)
    INTO v_achievements
    FROM public.achievements a
    LEFT JOIN public.user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = auth.uid()
    LEFT JOIN public.achievement_progress ap ON a.id = ap.achievement_id AND ap.user_id = auth.uid()
    WHERE NOT a.is_hidden OR ua.id IS NOT NULL;
    
    RETURN json_build_object(
        'success', true,
        'achievements', COALESCE(v_achievements, '[]'::JSON),
        'total_count', (SELECT COUNT(*) FROM public.achievements WHERE NOT is_hidden),
        'unlocked_count', (
            SELECT COUNT(*) FROM public.user_achievements ua
            JOIN public.achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = auth.uid() AND NOT a.is_hidden
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get achievement notifications (unlocked but not shown)
CREATE OR REPLACE FUNCTION public.get_achievement_notifications()
RETURNS JSON AS $$
DECLARE
    v_notifications JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'id', a.id,
        'code', a.code,
        'name', a.name,
        'description', a.description,
        'icon', a.icon,
        'reward_points', a.reward_points
    ) ORDER BY ua.unlocked_at DESC)
    INTO v_notifications
    FROM public.user_achievements ua
    JOIN public.achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = auth.uid() AND ua.notification_shown = false;
    
    RETURN json_build_object(
        'success', true,
        'notifications', COALESCE(v_notifications, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Mark notification as shown
CREATE OR REPLACE FUNCTION public.mark_notification_shown(p_achievement_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE public.user_achievements
    SET notification_shown = true
    WHERE user_id = auth.uid() AND achievement_id = p_achievement_id;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get achievement by code (for hidden achievements)
CREATE OR REPLACE FUNCTION public.get_achievement_by_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_achievement public.achievements;
    v_unlocked BOOLEAN;
BEGIN
    SELECT * INTO v_achievement FROM public.achievements WHERE code = p_code;
    
    IF v_achievement IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Досягнення не знайдено');
    END IF;
    
    -- Only show hidden achievements if unlocked
    IF v_achievement.is_hidden THEN
        SELECT EXISTS(
            SELECT 1 FROM public.user_achievements
            WHERE user_id = auth.uid() AND achievement_id = v_achievement.id
        ) INTO v_unlocked;
        
        IF NOT v_unlocked THEN
            RETURN json_build_object(
                'success', true,
                'achievement', json_build_object(
                    'is_hidden', true,
                    'code', v_achievement.code
                )
            );
        END IF;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'achievement', json_build_object(
            'id', v_achievement.id,
            'code', v_achievement.code,
            'name', v_achievement.name,
            'description', v_achievement.description,
            'icon', v_achievement.icon
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Database Triggers for Auto Updates
-- ============================================

-- Trigger: After event created
CREATE OR REPLACE FUNCTION public.trigger_on_event_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment user stats
    UPDATE public.user_stats
    SET events_created = events_created + 1,
        last_active_date = CURRENT_DATE
    WHERE user_id = NEW.organizer_id;
    
    -- Initialize stats if not exists
    INSERT INTO public.user_stats (user_id, events_created, last_active_date)
    VALUES (NEW.organizer_id, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE
    SET events_created = public.user_stats.events_created + 1;
    
    -- Check achievements
    PERFORM public.check_achievements();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: After request accepted (user joined event)
CREATE OR REPLACE FUNCTION public.trigger_on_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' THEN
        -- Increment user stats
        UPDATE public.user_stats
        SET events_joined = events_joined + 1,
            last_active_date = CURRENT_DATE
        WHERE user_id = NEW.user_id;
        
        -- Check achievements
        PERFORM public.check_achievements();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievement_progress;