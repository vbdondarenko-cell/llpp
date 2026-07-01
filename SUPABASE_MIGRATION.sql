-- =====================================================
-- LinkUp Alpha v1.0 - Complete Database Migration
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- SCHEMA: profiles
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
  interests TEXT[] DEFAULT '{}',
  show_online BOOLEAN DEFAULT TRUE,
  show_events BOOLEAN DEFAULT TRUE,
  allow_messages BOOLEAN DEFAULT TRUE,
  language_code TEXT DEFAULT 'uk',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_suspended BOOLEAN DEFAULT FALSE,
  suspended_at TIMESTAMPTZ,
  suspended_until TIMESTAMPTZ,
  suspension_reason TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  is_hidden BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- SCHEMA: interests
-- =====================================================

CREATE TABLE IF NOT EXISTS public.interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interests are viewable by everyone" 
  ON public.interests FOR SELECT USING (TRUE);

-- Insert default interests
INSERT INTO public.interests (name, icon, color) VALUES
  ('Музика', '🎵', '#9b59b6'),
  ('Спорт', '⚽', '#27ae60'),
  ('Їжа', '🍕', '#e74c3c'),
  ('Мистецтво', '🎨', '#f39c12'),
  ('Технології', '💻', '#3498db'),
  ('Подорожі', '✈️', '#1abc9c'),
  ('Книги', '📚', '#795548'),
  ('Ігри', '🎮', '#673ab7'),
  ('Фітнес', '💪', '#e91e63'),
  ('Фотографія', '📷', '#607d8b')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SCHEMA: user_interests
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest_id)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User interests viewable by owner" 
  ON public.user_interests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own interests" 
  ON public.user_interests FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- SCHEMA: events
-- =====================================================

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  max_participants INTEGER DEFAULT 10,
  is_private BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'hidden')),
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active events are viewable by everyone" 
  ON public.events FOR SELECT USING (status = 'active' AND is_hidden = FALSE);

CREATE POLICY "Organizers can view their events" 
  ON public.events FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Users can create events" 
  ON public.events FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their events" 
  ON public.events FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete their events" 
  ON public.events FOR DELETE USING (organizer_id = auth.uid());

-- =====================================================
-- SCHEMA: event_requests
-- =====================================================

CREATE TABLE IF NOT EXISTS public.event_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event requests are viewable by participants" 
  ON public.event_requests FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR event_id IN (
      SELECT id FROM public.events WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "Users can create join requests" 
  ON public.event_requests FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Participants can update requests" 
  ON public.event_requests FOR UPDATE 
  USING (
    user_id = auth.uid() 
    OR event_id IN (
      SELECT id FROM public.events WHERE organizer_id = auth.uid()
    )
  );

-- =====================================================
-- SCHEMA: chats
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chats are viewable by accepted participants" 
  ON public.chats FOR SELECT 
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      LEFT JOIN public.event_requests er ON e.id = er.event_id AND er.user_id = auth.uid()
      WHERE e.organizer_id = auth.uid() OR er.status = 'accepted'
    )
  );

-- =====================================================
-- SCHEMA: chat_messages
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages viewable by chat participants" 
  ON public.chat_messages FOR SELECT 
  USING (
    chat_id IN (
      SELECT c.id FROM public.chats c
      JOIN public.events e ON c.event_id = e.id
      LEFT JOIN public.event_requests er ON e.id = er.event_id AND er.user_id = auth.uid()
      WHERE e.organizer_id = auth.uid() OR er.status = 'accepted'
    )
  );

CREATE POLICY "Participants can send messages" 
  ON public.chat_messages FOR INSERT 
  WITH CHECK (
    user_id = auth.uid()
    AND chat_id IN (
      SELECT c.id FROM public.chats c
      JOIN public.events e ON c.event_id = e.id
      LEFT JOIN public.event_requests er ON e.id = er.event_id AND er.user_id = auth.uid()
      WHERE e.organizer_id = auth.uid() OR er.status = 'accepted'
    )
  );

-- =====================================================
-- SCHEMA: premium_status
-- =====================================================

CREATE TABLE IF NOT EXISTS public.premium_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'none' CHECK (tier IN ('none', 'starter', 'pro', 'vip', 'legend')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.premium_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium status viewable by owner" 
  ON public.premium_status FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own premium" 
  ON public.premium_status FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- SCHEMA: achievements
-- =====================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('events', 'social', 'premium', 'exploration')),
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  points INTEGER DEFAULT 10,
  requirement JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by everyone" 
  ON public.achievements FOR SELECT USING (TRUE);

-- Insert default achievements
INSERT INTO public.achievements (code, name, description, icon, category, tier, points, requirement) VALUES
  ('first_event', 'Перша подія', 'Створи свою першу подію', '🎉', 'events', 'bronze', 10, '{"type": "events_created", "count": 1}'),
  ('active_creator', 'Активний творець', 'Створи 10 подій', '🔥', 'events', 'silver', 50, '{"type": "events_created", "count": 10}'),
  ('event_master', 'Майстер подій', 'Створи 50 подій', '👑', 'events', 'gold', 100, '{"type": "events_created", "count": 50}'),
  ('legend_organizer', 'Легендарний організатор', 'Створи 100 подій', '⭐', 'events', 'platinum', 200, '{"type": "events_created", "count": 100}'),
  ('first_join', 'Учасник', 'Візьми участь у першій події', '🤝', 'social', 'bronze', 10, '{"type": "events_joined", "count": 1}'),
  ('chat_leader', 'Чат-лідер', 'Напиши 100 повідомлень у чаті', '💬', 'social', 'silver', 50, '{"type": "messages_sent", "count": 100}'),
  ('babbler', 'Балакун', 'Напиши 500 повідомлень у чаті', '🗣️', 'social', 'gold', 100, '{"type": "messages_sent", "count": 500}'),
  ('friend_maker', 'Друг', 'Додай 10 друзів', '❤️', 'social', 'silver', 50, '{"type": "friends_count", "count": 10}'),
  ('vip_premium', 'VIP', 'Отримай VIP преміум', '💎', 'premium', 'gold', 100, '{"type": "premium_tier", "tier": "vip"}'),
  ('explorer', 'Дослідник', 'Відвідай події в 5 різних категоріях', '🗺️', 'exploration', 'bronze', 25, '{"type": "categories_visited", "count": 5}')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SCHEMA: user_achievements
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  notification_shown BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User achievements viewable by owner" 
  ON public.user_achievements FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own achievements" 
  ON public.user_achievements FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- SCHEMA: achievement_progress
-- =====================================================

CREATE TABLE IF NOT EXISTS public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_code)
);

ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Progress viewable by owner" 
  ON public.achievement_progress FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress" 
  ON public.achievement_progress FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- SCHEMA: user_stats
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  events_created INTEGER DEFAULT 0,
  events_joined INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  total_rating DOUBLE PRECISION DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User stats viewable by everyone" 
  ON public.user_stats FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own stats" 
  ON public.user_stats FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- SCHEMA: friendships
-- =====================================================

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Friendships viewable by participants" 
  ON public.friendships FOR SELECT 
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can manage friendships" 
  ON public.friendships FOR ALL 
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- =====================================================
-- SCHEMA: ratings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id, event_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone" 
  ON public.ratings FOR SELECT USING (TRUE);

CREATE POLICY "Users can leave ratings" 
  ON public.ratings FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- =====================================================
-- SCHEMA: user_reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports viewable by reporter and admins" 
  ON public.user_reports FOR SELECT 
  USING (reporter_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Users can create reports" 
  ON public.user_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- =====================================================
-- SCHEMA: event_reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.event_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event reports viewable by reporter and admins" 
  ON public.event_reports FOR SELECT 
  USING (reporter_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Users can create event reports" 
  ON public.event_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- =====================================================
-- SCHEMA: admin_users
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users viewable by admins" 
  ON public.admin_users FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Only admins can manage admin_users" 
  ON public.admin_users FOR ALL 
  USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'admin'));

-- =====================================================
-- SCHEMA: admin_audit_log
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log viewable by admins" 
  ON public.admin_audit_log FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_admin_role function
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC FUNCTIONS: Profile
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_profile_by_user_id()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'telegram_id', p.telegram_id,
    'username', p.username,
    'display_name', p.display_name,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'bio', p.bio,
    'avatar_url', p.avatar_url,
    'latitude', p.latitude,
    'longitude', p.longitude,
    'interests', p.interests,
    'show_online', p.show_online,
    'show_events', p.show_events,
    'allow_messages', p.allow_messages,
    'language_code', p.language_code,
    'notifications_enabled', p.notifications_enabled,
    'created_at', p.created_at,
    'is_suspended', p.is_suspended,
    'is_banned', p.is_banned,
    'is_hidden', p.is_hidden,
    'is_admin', public.is_admin()
  ) INTO result
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_profile(
  p_telegram_id BIGINT,
  p_username TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_avatar_url TEXT
)
RETURNS TEXT AS $$
DECLARE
  new_profile_id TEXT;
BEGIN
  INSERT INTO public.profiles (
    user_id, telegram_id, username, first_name, last_name, 
    avatar_url, display_name
  ) VALUES (
    auth.uid(), p_telegram_id, p_username, p_first_name, p_last_name,
    p_avatar_url, COALESCE(p_first_name, p_username)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    telegram_id = EXCLUDED.telegram_id,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW()
  RETURNING id INTO new_profile_id;

  -- Create user stats
  INSERT INTO public.user_stats (user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC FUNCTIONS: Interests
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_interests()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'icon', icon,
      'color', color
    ))
    FROM public.interests
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_interests()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', i.id,
      'name', i.name,
      'icon', i.icon,
      'color', i.color
    ))
    FROM public.user_interests ui
    JOIN public.interests i ON ui.interest_id = i.id
    WHERE ui.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_user_interests(p_interest_ids UUID[])
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.user_interests WHERE user_id = auth.uid();
  
  INSERT INTO public.user_interests (user_id, interest_id)
  SELECT auth.uid(), unnest FROM unnest(p_interest_ids);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC FUNCTIONS: Events
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_nearby_events(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km INTEGER DEFAULT 10,
  p_category TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'description', e.description,
      'category', e.category,
      'latitude', e.latitude,
      'longitude', e.longitude,
      'address', e.address,
      'starts_at', e.starts_at,
      'ends_at', e.ends_at,
      'max_participants', e.max_participants,
      'is_private', e.is_private,
      'photo_url', e.photo_url,
      'status', e.status,
      'organizer_id', e.organizer_id,
      'organizer_name', p.display_name,
      'organizer_username', u.username,
      'organizer_avatar', p.avatar_url,
      'participants_count', (
        SELECT COUNT(*) FROM public.event_requests er 
        WHERE er.event_id = e.id AND er.status = 'accepted'
      ),
      'distance', ST_Distance(
        ST_MakePoint(e.longitude, e.latitude)::geography,
        ST_MakePoint(p_longitude, p_latitude)::geography
      ) / 1000
    ) ORDER BY created_at DESC)
    FROM public.events e
    JOIN public.profiles p ON e.organizer_id = p.user_id
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE 
      e.status = 'active'
      AND e.is_hidden = FALSE
      AND e.is_private = FALSE
      AND ST_DWithin(
        ST_MakePoint(e.longitude, e.latitude)::geography,
        ST_MakePoint(p_longitude, p_latitude)::geography,
        p_radius_km * 1000
      )
      AND (p_category IS NULL OR e.category = p_category)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_event(
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_address TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_max_participants INTEGER,
  p_is_private BOOLEAN,
  p_photo_url TEXT
)
RETURNS JSONB AS $$
DECLARE
  new_event_id UUID;
  chat_id_val UUID;
BEGIN
  INSERT INTO public.events (
    organizer_id, title, description, category, latitude, longitude,
    address, starts_at, ends_at, max_participants, is_private, photo_url
  ) VALUES (
    auth.uid(), p_title, p_description, p_category, p_latitude, p_longitude,
    p_address, p_starts_at, p_ends_at, p_max_participants, p_is_private, p_photo_url
  )
  RETURNING id INTO new_event_id;

  -- Create chat for private events
  IF p_is_private THEN
    INSERT INTO public.chats (event_id, expires_at)
    VALUES (new_event_id, p_starts_at + INTERVAL '6 hours')
    RETURNING id INTO chat_id_val;
  END IF;

  -- Increment user stats
  UPDATE public.user_stats 
  SET events_created = events_created + 1, updated_at = NOW()
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'success', TRUE,
    'event_id', new_event_id,
    'chat_id', chat_id_val
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_event(
  p_event_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_address TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_max_participants INTEGER,
  p_photo_url TEXT
)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.events
  SET 
    title = p_title,
    description = p_description,
    category = p_category,
    latitude = p_latitude,
    longitude = p_longitude,
    address = p_address,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    max_participants = p_max_participants,
    photo_url = p_photo_url,
    updated_at = NOW()
  WHERE id = p_event_id AND organizer_id = auth.uid();

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_event(p_event_id UUID)
RETURNS JSONB AS $$
BEGIN
  DELETE FROM public.events WHERE id = p_event_id AND organizer_id = auth.uid();
  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC FUNCTIONS: Event Requests
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_join_request(
  p_event_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  -- Check if user is already accepted
  IF EXISTS (
    SELECT 1 FROM public.event_requests 
    WHERE event_id = p_event_id AND user_id = auth.uid() AND status = 'accepted'
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Вже прийнято');
  END IF;

  INSERT INTO public.event_requests (event_id, user_id, message)
  VALUES (p_event_id, auth.uid(), p_message)
  ON CONFLICT (event_id, user_id) DO UPDATE
  SET message = EXCLUDED.message, status = 'pending', updated_at = NOW();

  RETURN jsonb_build_object('success', TRUE, 'status', 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.respond_to_request(
  p_request_id UUID,
  p_accept BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_event_id UUID;
  v_user_id UUID;
BEGIN
  SELECT event_id, user_id INTO v_event_id, v_user_id
  FROM public.event_requests WHERE id = p_request_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.events WHERE id = v_event_id AND organizer_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Не авторизовано');
  END IF;

  UPDATE public.event_requests
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      updated_at = NOW()
  WHERE id = p_request_id;

  IF p_accept THEN
    -- Update user stats
    UPDATE public.user_stats 
    SET events_joined = events_joined + 1, updated_at = NOW()
    WHERE user_id = v_user_id;

    -- Create chat if not exists
    INSERT INTO public.chats (event_id, expires_at)
    SELECT v_event_id, e.starts_at + INTERVAL '6 hours'
    FROM public.events e WHERE e.id = v_event_id
    ON CONFLICT (event_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_event_requests(p_event_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', er.id,
      'event_id', er.event_id,
      'user_id', er.user_id,
      'username', u.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'status', er.status,
      'message', er.message,
      'created_at', er.created_at
    ) ORDER BY er.created_at)
    FROM public.event_requests er
    JOIN public.profiles p ON er.user_id = p.user_id
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE er.event_id = p_event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC FUNCTIONS: Chat
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_or_create_chat(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_chat_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify user is organizer or accepted participant
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    LEFT JOIN public.event_requests er ON e.id = er.event_id AND er.user_id = auth.uid()
    WHERE e.id = p_event_id 
    AND (e.organizer_id = auth.uid() OR er.status = 'accepted')
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  SELECT id, expires_at INTO v_chat_id, v_expires_at
  FROM public.chats WHERE event_id = p_event_id;

  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (event_id, expires_at)
    SELECT p_event_id, starts_at + INTERVAL '6 hours' FROM public.events WHERE id = p_event_id
    RETURNING id, expires_at INTO v_chat_id, v_expires_at;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'chat_id', v_chat_id,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.send_message(
  p_chat_id UUID,
  p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
  new_message_id UUID;
BEGIN
  INSERT INTO public.chat_messages (chat_id, user_id, content)
  VALUES (p_chat_id, auth.uid(), p_content)
  RETURNING id INTO new_message_id;

  -- Update user stats
  UPDATE public.user_stats 
  SET messages_sent = messages_sent + 1, updated_at = NOW()
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'success', TRUE,
    'message_id', new_message_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_chat_messages(p_chat_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', cm.id,
      'chat_id', cm.chat_id,
      'user_id', cm.user_id,
      'username', u.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'content', cm.content,
      'created_at', cm.created_at
    ) ORDER BY cm.created_at ASC)
    FROM public.chat_messages cm
    JOIN public.profiles p ON cm.user_id = p.user_id
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE cm.chat_id = p_chat_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC FUNCTIONS: Premium
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_premium_status()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'tier', COALESCE(ps.tier, 'none'),
      'started_at', ps.started_at,
      'expires_at', ps.expires_at,
      'is_active', (
        ps.tier IS NOT NULL 
        AND ps.tier != 'none'
        AND (ps.expires_at IS NULL OR ps.expires_at > NOW())
      )
    )
    FROM public.premium_status ps
    WHERE ps.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.purchase_premium(
  p_tier TEXT,
  p_stars_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  CASE p_tier
    WHEN 'starter' THEN v_expires_at := NOW() + INTERVAL '30 days';
    WHEN 'pro' THEN v_expires_at := NOW() + INTERVAL '30 days';
    WHEN 'vip' THEN v_expires_at := NOW() + INTERVAL '30 days';
    WHEN 'legend' THEN v_expires_at := NULL; -- Lifetime
    ELSE RETURN jsonb_build_object('success', FALSE, 'error', 'Невірний тариф');
  END CASE;

  INSERT INTO public.premium_status (user_id, tier, started_at, expires_at)
  VALUES (auth.uid(), p_tier, NOW(), v_expires_at)
  ON CONFLICT (user_id) DO UPDATE
  SET tier = EXCLUDED.tier, started_at = NOW(), expires_at = EXCLUDED.expires_at;

  RETURN jsonb_build_object('success', TRUE, 'tier', p_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC FUNCTIONS: Achievements
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_achievements()
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
  v_new_achievements JSONB;
BEGIN
  SELECT jsonb_build_object(
    'events_created', COALESCE(es.events_created, 0),
    'events_joined', COALESCE(es.events_joined, 0),
    'messages_sent', COALESCE(es.messages_sent, 0),
    'friends_count', COALESCE(es.friends_count, 0)
  ) INTO v_stats
  FROM public.user_stats es
  WHERE es.user_id = auth.uid();

  -- Check for new achievements
  WITH unlocked AS (
    INSERT INTO public.user_achievements (user_id, achievement_id)
    SELECT 
      auth.uid(),
      a.id
    FROM public.achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua 
      WHERE ua.user_id = auth.uid() AND ua.achievement_id = a.id
    )
    AND (
      (a.code = 'first_event' AND (v_stats->>'events_created')::INT >= 1)
      OR (a.code = 'active_creator' AND (v_stats->>'events_created')::INT >= 10)
      OR (a.code = 'event_master' AND (v_stats->>'events_created')::INT >= 50)
      OR (a.code = 'legend_organizer' AND (v_stats->>'events_created')::INT >= 100)
      OR (a.code = 'first_join' AND (v_stats->>'events_joined')::INT >= 1)
      OR (a.code = 'chat_leader' AND (v_stats->>'messages_sent')::INT >= 100)
      OR (a.code = 'babbler' AND (v_stats->>'messages_sent')::INT >= 500)
      OR (a.code = 'friend_maker' AND (v_stats->>'friends_count')::INT >= 10)
    )
    RETURNING achievement_id
  )
  SELECT jsonb_agg(jsonb_build_object(
    'id', a.id,
    'code', a.code,
    'name', a.name,
    'description', a.description,
    'icon', a.icon
  )) INTO v_new_achievements
  FROM unlocked ua
  JOIN public.achievements a ON ua.achievement_id = a.id;

  RETURN jsonb_build_object(
    'new_achievements', COALESCE(v_new_achievements, '[]'::JSONB),
    'stats', v_stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_achievements()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'unlocked', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', a.id,
          'code', a.code,
          'name', a.name,
          'description', a.description,
          'icon', a.icon,
          'category', a.category,
          'tier', a.tier,
          'points', a.points,
          'unlocked_at', ua.unlocked_at
        ))
        FROM public.user_achievements ua
        JOIN public.achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = auth.uid()
      ),
      'all', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', a.id,
          'code', a.code,
          'name', a.name,
          'description', a.description,
          'icon', a.icon,
          'category', a.category,
          'tier', a.tier,
          'points', a.points
        ))
        FROM public.achievements a
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_user_stat(p_stat_name TEXT, p_value INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_stats
  SET 
    events_created = CASE WHEN p_stat_name = 'events_created' THEN events_created + p_value ELSE events_created END,
    events_joined = CASE WHEN p_stat_name = 'events_joined' THEN events_joined + p_value ELSE events_joined END,
    messages_sent = CASE WHEN p_stat_name = 'messages_sent' THEN messages_sent + p_value ELSE messages_sent END,
    friends_count = CASE WHEN p_stat_name = 'friends_count' THEN friends_count + p_value ELSE friends_count END,
    updated_at = NOW()
  WHERE user_id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC FUNCTIONS: Admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'stats', jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles),
      'total_events', (SELECT COUNT(*) FROM public.events),
      'total_premium', (SELECT COUNT(*) FROM public.premium_status WHERE tier != 'none'),
      'pending_reports', (SELECT COUNT(*) FROM public.user_reports WHERE status = 'pending') + (SELECT COUNT(*) FROM public.event_reports WHERE status = 'pending'),
      'suspended_users', (SELECT COUNT(*) FROM public.profiles WHERE is_suspended = TRUE),
      'banned_users', (SELECT COUNT(*) FROM public.profiles WHERE is_banned = TRUE),
      'total_messages', (SELECT COUNT(*) FROM public.chat_messages),
      'daily_active_users', (SELECT COUNT(DISTINCT user_id) FROM public.chat_messages WHERE created_at > NOW() - INTERVAL '24 hours'),
      'events_this_week', (SELECT COUNT(*) FROM public.events WHERE created_at > NOW() - INTERVAL '7 days'),
      'new_users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '24 hours')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_get_users(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'users', (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'username', u.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'created_at', p.created_at,
        'is_suspended', p.is_suspended,
        'is_banned', p.is_banned,
        'is_admin', EXISTS(SELECT 1 FROM admin_users WHERE user_id = p.user_id),
        'is_premium', EXISTS(SELECT 1 FROM premium_status WHERE user_id = p.user_id AND tier != 'none'),
        'events_created', COALESCE(es.events_created, 0)
      ))
      FROM public.profiles p
      LEFT JOIN auth.users u ON p.user_id = u.id
      LEFT JOIN public.user_stats es ON p.user_id = es.user_id
      WHERE 
        (p_search IS NULL OR p.display_name ILIKE '%' || p_search || '%' OR u.username ILIKE '%' || p_search || '%')
        AND (p_status IS NULL OR (
          (p_status = 'suspended' AND p.is_suspended = TRUE)
          OR (p_status = 'banned' AND p.is_banned = TRUE)
          OR (p_status = 'active' AND p.is_suspended = FALSE AND p.is_banned = FALSE)
        ))
      ORDER BY p.created_at DESC
      LIMIT p_limit
      OFFSET p_offset
    ),
    'total', (
      SELECT COUNT(*) FROM public.profiles p
      LEFT JOIN auth.users u ON p.user_id = u.id
      WHERE 
        (p_search IS NULL OR p.display_name ILIKE '%' || p_search || '%' OR u.username ILIKE '%' || p_search || '%')
        AND (p_status IS NULL OR (
          (p_status = 'suspended' AND p.is_suspended = TRUE)
          OR (p_status = 'banned' AND p.is_banned = TRUE)
          OR (p_status = 'active' AND p.is_suspended = FALSE AND p.is_banned = FALSE)
        ))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id UUID,
  p_reason TEXT,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  UPDATE public.profiles
  SET 
    is_suspended = TRUE,
    suspended_at = NOW(),
    suspended_until = p_until,
    suspension_reason = p_reason
  WHERE user_id = p_user_id;

  -- Audit log
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'suspend_user', 'profile', p_user_id, jsonb_build_object('reason', p_reason, 'until', p_until));

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  UPDATE public.profiles
  SET 
    is_suspended = FALSE,
    suspended_until = NULL
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'unsuspend_user', 'profile', p_user_id);

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  UPDATE public.profiles
  SET 
    is_banned = TRUE,
    banned_at = NOW(),
    ban_reason = p_reason,
    is_suspended = FALSE
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'ban_user', 'profile', p_user_id, jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  UPDATE public.profiles
  SET 
    is_banned = FALSE,
    ban_reason = NULL
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'unban_user', 'profile', p_user_id);

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_get_events(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'events', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'category', e.category,
        'status', e.status,
        'is_private', e.is_private,
        'starts_at', e.starts_at,
        'organizer_id', e.organizer_id,
        'organizer_username', u.username,
        'participants_count', (
          SELECT COUNT(*) FROM public.event_requests er 
          WHERE er.event_id = e.id AND er.status = 'accepted'
        ),
        'is_hidden', e.is_hidden,
        'is_cancelled', e.status = 'cancelled',
        'created_at', e.created_at
      ))
      FROM public.events e
      LEFT JOIN auth.users u ON e.organizer_id = u.id
      WHERE 
        (p_search IS NULL OR e.title ILIKE '%' || p_search || '%')
        AND (p_status IS NULL OR (
          (p_status = 'active' AND e.status = 'active' AND e.is_hidden = FALSE)
          OR (p_status = 'hidden' AND e.is_hidden = TRUE)
          OR (p_status = 'cancelled' AND e.status = 'cancelled')
        ))
      ORDER BY e.created_at DESC
      LIMIT p_limit
      OFFSET p_offset
    ),
    'total', (
      SELECT COUNT(*) FROM public.events e
      WHERE 
        (p_search IS NULL OR e.title ILIKE '%' || p_search || '%')
        AND (p_status IS NULL OR (
          (p_status = 'active' AND e.status = 'active' AND e.is_hidden = FALSE)
          OR (p_status = 'hidden' AND e.is_hidden = TRUE)
          OR (p_status = 'cancelled' AND e.status = 'cancelled')
        ))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_hide_event(p_event_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  UPDATE public.events SET is_hidden = TRUE WHERE id = p_event_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'hide_event', 'event', p_event_id);

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_unhide_event(p_event_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  UPDATE public.events SET is_hidden = FALSE WHERE id = p_event_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'unhide_event', 'event', p_event_id);

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_delete_event(
  p_event_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  DELETE FROM public.events WHERE id = p_event_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'delete_event', 'event', p_event_id, jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_get_reports(
  p_type TEXT DEFAULT 'user',
  p_status TEXT DEFAULT 'pending',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  IF p_type = 'user' THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'reports', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', ur.id,
          'type', 'user',
          'reporter_id', ur.reporter_id,
          'reporter_name', rp.display_name,
          'reported_user_id', ur.reported_user_id,
          'reported_name', up.display_name,
          'reason', ur.reason,
          'description', ur.description,
          'status', ur.status,
          'created_at', ur.created_at
        ))
        FROM public.user_reports ur
        JOIN public.profiles rp ON ur.reporter_id = rp.user_id
        JOIN public.profiles up ON ur.reported_user_id = up.user_id
        WHERE ur.status = p_status
        ORDER BY ur.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
      )
    );
  ELSE
    RETURN jsonb_build_object(
      'success', TRUE,
      'reports', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', er.id,
          'type', 'event',
          'reporter_id', er.reporter_id,
          'reporter_name', rp.display_name,
          'event_id', er.event_id,
          'event_title', e.title,
          'reason', er.reason,
          'description', er.description,
          'status', er.status,
          'created_at', er.created_at
        ))
        FROM public.event_reports er
        JOIN public.profiles rp ON er.reporter_id = rp.user_id
        JOIN public.events e ON er.event_id = e.id
        WHERE er.status = p_status
        ORDER BY er.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id UUID,
  p_type TEXT,
  p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  IF p_type = 'user' THEN
    UPDATE public.user_reports 
    SET status = 'resolved', notes = p_notes, resolved_by = auth.uid(), resolved_at = NOW()
    WHERE id = p_report_id;
  ELSE
    UPDATE public.event_reports 
    SET status = 'resolved', notes = p_notes, resolved_by = auth.uid(), resolved_at = NOW()
    WHERE id = p_report_id;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'resolve_report', p_type || '_report', p_report_id, jsonb_build_object('notes', p_notes));

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_reject_report(
  p_report_id UUID,
  p_type TEXT,
  p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  IF p_type = 'user' THEN
    UPDATE public.user_reports 
    SET status = 'rejected', notes = p_notes, resolved_by = auth.uid(), resolved_at = NOW()
    WHERE id = p_report_id;
  ELSE
    UPDATE public.event_reports 
    SET status = 'rejected', notes = p_notes, resolved_by = auth.uid(), resolved_at = NOW()
    WHERE id = p_report_id;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'reject_report', p_type || '_report', p_report_id, jsonb_build_object('notes', p_notes));

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_get_chats(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'chats', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'event_id', c.event_id,
        'event_title', e.title,
        'chat_type', CASE WHEN e.is_private THEN 'private' ELSE 'public' END,
        'message_count', (
          SELECT COUNT(*) FROM public.chat_messages 
          WHERE chat_id = c.id
        ),
        'expires_at', c.expires_at,
        'created_at', c.created_at
      ))
      FROM public.chats c
      JOIN public.events e ON c.event_id = e.id
      WHERE (p_search IS NULL OR e.title ILIKE '%' || p_search || '%')
      ORDER BY c.created_at DESC
      LIMIT p_limit
      OFFSET p_offset
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_get_chat_messages(
  p_chat_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'messages', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', cm.id,
        'user_id', cm.user_id,
        'username', u.username,
        'display_name', p.display_name,
        'content', cm.content,
        'created_at', cm.created_at
      ))
      FROM public.chat_messages cm
      JOIN public.profiles p ON cm.user_id = p.user_id
      LEFT JOIN auth.users u ON p.user_id = u.id
      WHERE cm.chat_id = p_chat_id
      ORDER BY cm.created_at DESC
      LIMIT p_limit
      OFFSET p_offset
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_get_audit_log(
  p_action TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Доступ заборонено');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'logs', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', al.id,
        'admin_id', al.admin_id,
        'admin_username', u.username,
        'admin_role', al.admin_role,
        'action', al.action,
        'target_type', al.target_type,
        'target_id', al.target_id,
        'details', al.details,
        'created_at', al.created_at
      ))
      FROM public.admin_audit_log al
      LEFT JOIN auth.users u ON al.admin_id = u.id
      WHERE 
        (p_action IS NULL OR al.action = p_action)
        AND (p_target_type IS NULL OR al.target_type = p_target_type)
      ORDER BY al.created_at DESC
      LIMIT p_limit
      OFFSET p_offset
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Enable Realtime
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_requests;

-- =====================================================
-- Create indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_events_location ON public.events USING gist (ST_MakePoint(longitude, latitude)::geography);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_event ON public.event_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_user ON public.event_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

-- =====================================================
-- COMPLETE!
-- =====================================================

SELECT 'LinkUp Alpha v1.0 - Database setup complete!' as status;
