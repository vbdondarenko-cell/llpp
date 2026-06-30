-- ============================================
-- LinkUp Events Schema
-- Sprint 2: Interactive Map
-- ============================================

-- Enable UUID extension (if not exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EVENT_LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    city TEXT DEFAULT 'kyiv',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for event_locations
CREATE INDEX IF NOT EXISTS idx_event_locations_coordinates 
    ON public.event_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_event_locations_city 
    ON public.event_locations(city);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'party', 'sport', 'food', 'music', 'art', 
        'nature', 'games', 'networking', 'education', 'other'
    )),
    event_type TEXT DEFAULT 'in_person' CHECK (event_type IN ('in_person', 'online', 'hybrid')),
    location_id UUID REFERENCES public.event_locations(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) CHECK (latitude >= -90 AND latitude <= 90),
    longitude DECIMAL(11, 8) CHECK (longitude >= -180 AND longitude <= 180),
    location_name TEXT,
    location_address TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    event_end_date TIMESTAMPTZ,
    max_participants INTEGER DEFAULT 10 CHECK (max_participants > 0),
    current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
    price DECIMAL(10, 2) DEFAULT 0 CHECK (price >= 0),
    currency TEXT DEFAULT 'UAH',
    photo_url TEXT,
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    requires_approval BOOLEAN DEFAULT FALSE,
    is_premium_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_coordinates ON public.events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_deleted ON public.events(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- EVENT_PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    role TEXT DEFAULT 'participant' CHECK (role IN ('organizer', 'participant')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Indexes for event_participants
CREATE INDEX IF NOT EXISTS idx_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.event_participants(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Event locations: public read
CREATE POLICY "Event locations are viewable by everyone"
    ON public.event_locations FOR SELECT
    USING (true);

-- Events: public read active non-deleted events
CREATE POLICY "Active events are viewable by everyone"
    ON public.events FOR SELECT
    USING (
        status = 'active' 
        AND deleted_at IS NULL
    );

-- Events: authenticated users can create events
CREATE POLICY "Authenticated users can create events"
    ON public.events FOR INSERT
    WITH CHECK (organizer_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ));

-- Events: organizers can update their events
CREATE POLICY "Organizers can update their events"
    ON public.events FOR UPDATE
    USING (organizer_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ));

-- Event participants: viewable by participants
CREATE POLICY "Participants can view event participants"
    ON public.event_participants FOR SELECT
    USING (
        event_id IN (
            SELECT event_id FROM public.event_participants
            WHERE user_id IN (
                SELECT id FROM public.profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Event participants: users can join events
CREATE POLICY "Users can join events"
    ON public.event_participants FOR INSERT
    WITH CHECK (user_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get events nearby
CREATE OR REPLACE FUNCTION public.get_events_nearby(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_km DECIMAL DEFAULT 10,
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS SETOF JSON AS $$
DECLARE
    -- Earth's radius in kilometers
    earth_radius_km DECIMAL := 6371;
    lat_rad DECIMAL;
    lng_rad DECIMAL;
BEGIN
    lat_rad := radians(p_latitude);
    lng_rad := radians(p_longitude);
    
    RETURN QUERY
    SELECT json_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'category', e.category,
        'event_type', e.event_type,
        'latitude', COALESCE(e.latitude, el.latitude),
        'longitude', COALESCE(e.longitude, el.longitude),
        'location_name', COALESCE(e.location_name, el.name),
        'location_address', COALESCE(e.location_address, el.address),
        'event_date', e.event_date,
        'event_end_date', e.event_end_date,
        'max_participants', e.max_participants,
        'current_participants', e.current_participants,
        'price', e.price,
        'currency', e.currency,
        'photo_url', e.photo_url,
        'status', e.status,
        'requires_approval', e.requires_approval,
        'is_premium_only', e.is_premium_only,
        'organizer', json_build_object(
            'id', p.id,
            'username', p.username,
            'first_name', p.first_name,
            'avatar_url', p.avatar_url
        ),
        'distance', (
            earth_radius_km * acos(
                cos(lat_rad) * cos(radians(COALESCE(e.latitude, el.latitude))) * 
                cos(radians(COALESCE(e.longitude, el.longitude)) - lng_rad) +
                sin(lat_rad) * sin(radians(COALESCE(e.latitude, el.latitude)))
            )
        ),
        'created_at', e.created_at
    ) AS event
    FROM public.events e
    LEFT JOIN public.event_locations el ON e.location_id = el.id
    LEFT JOIN public.profiles p ON e.organizer_id = p.id
    WHERE 
        e.status = 'active'
        AND e.deleted_at IS NULL
        AND e.event_date > NOW()
        AND (
            earth_radius_km * acos(
                cos(lat_rad) * cos(radians(COALESCE(e.latitude, el.latitude))) * 
                cos(radians(COALESCE(e.longitude, el.longitude)) - lng_rad) +
                sin(lat_rad) * sin(radians(COALESCE(e.latitude, el.latitude)))
            )
        ) <= p_radius_km
        AND (p_category IS NULL OR e.category = p_category)
    ORDER BY 
        (
            earth_radius_km * acos(
                cos(lat_rad) * cos(radians(COALESCE(e.latitude, el.latitude))) * 
                cos(radians(COALESCE(e.longitude, el.longitude)) - lng_rad) +
                sin(lat_rad) * sin(radians(COALESCE(e.latitude, el.latitude)))
            )
        ) ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to create event
CREATE OR REPLACE FUNCTION public.create_event(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT,
    p_event_type TEXT DEFAULT 'in_person',
    p_latitude DECIMAL DEFAULT NULL,
    p_longitude DECIMAL DEFAULT NULL,
    p_location_name TEXT DEFAULT NULL,
    p_location_address TEXT DEFAULT NULL,
    p_event_date TIMESTAMPTZ,
    p_event_end_date TIMESTAMPTZ DEFAULT NULL,
    p_max_participants INTEGER DEFAULT 10,
    p_price DECIMAL DEFAULT 0,
    p_photo_url TEXT DEFAULT NULL,
    p_requires_approval BOOLEAN DEFAULT FALSE,
    p_is_premium_only BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_organizer_id UUID;
    v_event_id UUID;
BEGIN
    -- Get organizer profile
    SELECT id INTO v_organizer_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF v_organizer_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    
    -- Create event
    INSERT INTO public.events (
        title, description, category, event_type,
        latitude, longitude, location_name, location_address,
        event_date, event_end_date, max_participants,
        price, photo_url, organizer_id, requires_approval, is_premium_only
    ) VALUES (
        p_title, p_description, p_category, p_event_type,
        p_latitude, p_longitude, p_location_name, p_location_address,
        p_event_date, p_event_end_date, p_max_participants,
        p_price, p_photo_url, v_organizer_id, p_requires_approval, p_is_premium_only
    )
    RETURNING id INTO v_event_id;
    
    -- Add organizer as participant
    INSERT INTO public.event_participants (event_id, user_id, status, role)
    VALUES (v_event_id, v_organizer_id, 'approved', 'organizer');
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-update
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_event_locations_updated_at ON public.event_locations;
CREATE TRIGGER update_event_locations_updated_at
    BEFORE UPDATE ON public.event_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SEED DATA: Sample Events (for testing)
-- ============================================
INSERT INTO public.event_locations (name, address, latitude, longitude, city) VALUES
    ('Парк Шевченка', 'Парк Шевченка, Київ', 50.4474, 30.4534, 'kyiv'),
    ('Хрещатик', 'вул. Хрещатик, Київ', 50.4466, 30.5225, 'kyiv'),
    ('Поділ', 'Подільська набережна, Київ', 50.4691, 30.5261, 'kyiv'),
    ('Печерськ', 'вул. Михайла Драгомирова, Київ', 50.4113, 30.5456, 'kyiv'),
    ('Оболонь', 'Набережна Оболонська, Київ', 50.5267, 30.4989, 'kyiv')
ON CONFLICT DO NOTHING;
