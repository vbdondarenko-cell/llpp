-- ============================================
-- Profile System Enhancements
-- Sprint 8: Profile, Settings, Statistics
-- ============================================

-- Add privacy settings to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_show_online BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_show_events BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_allow_messages BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uk';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT true;

-- Create user statistics view for profile
CREATE OR REPLACE VIEW public.user_statistics AS
SELECT 
    u.id as user_id,
    -- Events created
    COALESCE(us.events_created, 0) as events_created,
    -- Events joined (accepted requests)
    COALESCE(us.events_joined, 0) as events_joined,
    -- Completed events (past events user joined)
    COALESCE((
        SELECT COUNT(*) 
        FROM public.event_requests er
        JOIN public.events e ON er.event_id = e.id
        WHERE er.user_id = u.id AND er.status = 'accepted' AND e.starts_at < NOW()
    ), 0) as completed_events,
    -- Messages sent
    COALESCE(us.messages_sent, 0) as messages_sent,
    -- Chats joined
    COALESCE(us.chats_joined, 0) as chats_joined,
    -- Friends (accepted friend requests)
    COALESCE(us.friends_added, 0) as friends_added,
    -- Achievement count
    COALESCE((
        SELECT COUNT(*) 
        FROM public.user_achievements ua
        WHERE ua.user_id = u.id
    ), 0) as achievements_count,
    -- Categories explored count
    COALESCE(array_length(us.categories_explored, 1), 0) as categories_explored_count,
    -- Premium status
    COALESCE(ps.is_premium, false) as is_premium,
    ps.expires_at as premium_expires_at,
    -- Total rating (average of event ratings)
    COALESCE((
        SELECT ROUND(AVG(r.rating), 1)
        FROM public.ratings r
        WHERE r.rated_user_id = u.id
    ), 0) as average_rating,
    -- Total rating count
    COALESCE((
        SELECT COUNT(*)
        FROM public.ratings r
        WHERE r.rated_user_id = u.id
    ), 0) as rating_count
FROM auth.users u
LEFT JOIN public.user_stats us ON u.id = us.user_id
LEFT JOIN public.premium_status ps ON u.id = ps.user_id AND ps.is_premium = true;

-- Ratings table (for user-to-user ratings)
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, rater_id, rated_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_rated_user ON public.ratings(rated_user_id);

-- Friends table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);

-- Trigger for friendships updated_at
DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON public.friendships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RPC Functions
-- ============================================

-- Get full user statistics
CREATE OR REPLACE FUNCTION public.get_my_statistics()
RETURNS JSON AS $$
DECLARE
    v_stats RECORD;
BEGIN
    SELECT * INTO v_stats FROM public.user_statistics WHERE user_id = auth.uid();
    
    IF v_stats IS NULL THEN
        RETURN json_build_object(
            'success', true,
            'statistics', json_build_object(
                'events_created', 0,
                'events_joined', 0,
                'completed_events', 0,
                'messages_sent', 0,
                'chats_joined', 0,
                'friends_added', 0,
                'achievements_count', 0,
                'categories_explored_count', 0,
                'is_premium', false,
                'premium_expires_at', NULL,
                'average_rating', 0,
                'rating_count', 0
            )
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'statistics', json_build_object(
            'events_created', v_stats.events_created,
            'events_joined', v_stats.events_joined,
            'completed_events', v_stats.completed_events,
            'messages_sent', v_stats.messages_sent,
            'chats_joined', v_stats.chats_joined,
            'friends_added', v_stats.friends_added,
            'achievements_count', v_stats.achievements_count,
            'categories_explored_count', v_stats.categories_explored_count,
            'is_premium', v_stats.is_premium,
            'premium_expires_at', v_stats.premium_expires_at,
            'average_rating', v_stats.average_rating,
            'rating_count', v_stats.rating_count
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user profile with full data
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_target_id UUID;
    v_profile public.profiles;
    v_stats RECORD;
    v_is_premium BOOLEAN;
BEGIN
    v_target_id := COALESCE(p_user_id, auth.uid());
    
    SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_target_id;
    
    IF v_profile IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Профіль не знайдено');
    END IF;
    
    SELECT * INTO v_stats FROM public.user_statistics WHERE user_id = v_target_id;
    
    -- Check if current user has premium
    SELECT is_premium INTO v_is_premium FROM public.premium_status WHERE user_id = auth.uid() AND expires_at > NOW();
    
    RETURN json_build_object(
        'success', true,
        'profile', json_build_object(
            'user_id', v_profile.user_id,
            'username', v_profile.username,
            'display_name', v_profile.display_name,
            'bio', v_profile.bio,
            'avatar_url', v_profile.avatar_url,
            'interests', v_profile.interests,
            'location', v_profile.location,
            'created_at', v_profile.created_at,
            'statistics', CASE WHEN v_stats IS NOT NULL THEN json_build_object(
                'events_created', v_stats.events_created,
                'events_joined', v_stats.events_joined,
                'completed_events', v_stats.completed_events,
                'friends_added', v_stats.friends_added,
                'achievements_count', v_stats.achievements_count,
                'is_premium', v_stats.is_premium,
                'average_rating', v_stats.average_rating,
                'rating_count', v_stats.rating_count
            ) ELSE NULL END,
            'privacy', json_build_object(
                'show_online', v_profile.privacy_show_online,
                'show_events', v_profile.privacy_show_events,
                'allow_messages', v_profile.privacy_allow_messages
            ),
            'settings', json_build_object(
                'language', v_profile.language,
                'notifications_enabled', v_profile.notifications_enabled,
                'dark_mode', v_profile.dark_mode
            ),
            'is_own_profile', v_target_id = auth.uid(),
            'can_view_full', v_target_id = auth.uid() OR v_is_premium = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update profile
CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_display_name TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_interests TEXT[] DEFAULT NULL,
    p_location TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    UPDATE public.profiles
    SET 
        display_name = COALESCE(p_display_name, display_name),
        bio = COALESCE(p_bio, bio),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        interests = COALESCE(p_interests, interests),
        location = COALESCE(p_location, location),
        updated_at = NOW()
    WHERE user_id = auth.uid();
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update privacy settings
CREATE OR REPLACE FUNCTION public.update_privacy_settings(
    p_show_online BOOLEAN DEFAULT NULL,
    p_show_events BOOLEAN DEFAULT NULL,
    p_allow_messages BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    UPDATE public.profiles
    SET 
        privacy_show_online = COALESCE(p_show_online, privacy_show_online),
        privacy_show_events = COALESCE(p_show_events, privacy_show_events),
        privacy_allow_messages = COALESCE(p_allow_messages, privacy_allow_messages),
        updated_at = NOW()
    WHERE user_id = auth.uid();
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update app settings
CREATE OR REPLACE FUNCTION public.update_app_settings(
    p_language TEXT DEFAULT NULL,
    p_notifications_enabled BOOLEAN DEFAULT NULL,
    p_dark_mode BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    UPDATE public.profiles
    SET 
        language = COALESCE(p_language, language),
        notifications_enabled = COALESCE(p_notifications_enabled, notifications_enabled),
        dark_mode = COALESCE(p_dark_mode, dark_mode),
        updated_at = NOW()
    WHERE user_id = auth.uid();
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate a user after event
CREATE OR REPLACE FUNCTION public.rate_user(
    p_event_id UUID,
    p_rated_user_id UUID,
    p_rating INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_is_participant BOOLEAN;
BEGIN
    -- Check if rater participated in the event
    SELECT EXISTS(
        SELECT 1 FROM public.event_requests 
        WHERE event_id = p_event_id 
        AND user_id = auth.uid() 
        AND status = 'accepted'
    ) INTO v_is_participant;
    
    IF NOT v_is_participant THEN
        RETURN json_build_object('success', false, 'error', 'Ви не брали участі у цій події');
    END IF;
    
    -- Can't rate yourself
    IF p_rated_user_id = auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Неможливо оцінити себе');
    END IF;
    
    -- Insert or update rating
    INSERT INTO public.ratings (event_id, rater_id, rated_user_id, rating)
    VALUES (p_event_id, auth.uid(), p_rated_user_id, p_rating)
    ON CONFLICT (event_id, rater_id, rated_user_id) 
    DO UPDATE SET rating = p_rating, created_at = NOW();
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get friends list
CREATE OR REPLACE FUNCTION public.get_my_friends()
RETURNS JSON AS $$
DECLARE
    v_friends JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'friendship_id', f.id,
        'status', f.status,
        'is_premium', COALESCE(ps.is_premium, false)
    ) ORDER BY f.updated_at DESC)
    INTO v_friends
    FROM public.friendships f
    JOIN public.profiles p ON (
        (f.requester_id = auth.uid() AND p.user_id = f.addressee_id) OR
        (f.addressee_id = auth.uid() AND p.user_id = f.requester_id)
    )
    LEFT JOIN public.premium_status ps ON p.user_id = ps.user_id AND ps.is_premium = true
    WHERE (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    AND f.status = 'accepted';
    
    RETURN json_build_object(
        'success', true,
        'friends', COALESCE(v_friends, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get pending friend requests
CREATE OR REPLACE FUNCTION public.get_friend_requests()
RETURNS JSON AS $$
DECLARE
    v_incoming JSON;
    v_outgoing JSON;
BEGIN
    -- Incoming requests
    SELECT json_agg(json_build_object(
        'friendship_id', f.id,
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'created_at', f.created_at
    ) ORDER BY f.created_at DESC)
    INTO v_incoming
    FROM public.friendships f
    JOIN public.profiles p ON f.requester_id = p.user_id
    WHERE f.addressee_id = auth.uid() AND f.status = 'pending';
    
    -- Outgoing requests
    SELECT json_agg(json_build_object(
        'friendship_id', f.id,
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'created_at', f.created_at
    ) ORDER BY f.created_at DESC)
    INTO v_outgoing
    FROM public.friendships f
    JOIN public.profiles p ON f.addressee_id = p.user_id
    WHERE f.requester_id = auth.uid() AND f.status = 'pending';
    
    RETURN json_build_object(
        'success', true,
        'incoming', COALESCE(v_incoming, '[]'::JSON),
        'outgoing', COALESCE(v_outgoing, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Send friend request
CREATE OR REPLACE FUNCTION public.send_friend_request(p_addressee_id UUID)
RETURNS JSON AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Can't befriend yourself
    IF p_addressee_id = auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Неможливо додати себе');
    END IF;
    
    -- Check if already friends or request exists
    SELECT EXISTS(
        SELECT 1 FROM public.friendships
        WHERE (requester_id = auth.uid() AND addressee_id = p_addressee_id)
        OR (requester_id = p_addressee_id AND addressee_id = auth.uid())
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN json_build_object('success', false, 'error', 'Запит вже існує');
    END IF;
    
    INSERT INTO public.friendships (requester_id, addressee_id)
    VALUES (auth.uid(), p_addressee_id);
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Respond to friend request
CREATE OR REPLACE FUNCTION public.respond_friend_request(
    p_friendship_id UUID,
    p_accept BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
BEGIN
    UPDATE public.friendships
    SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
        updated_at = NOW()
    WHERE id = p_friendship_id AND addressee_id = auth.uid() AND status = 'pending';
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
ALTER PUBLATION supabase_realtime ADD TABLE public.friendships;