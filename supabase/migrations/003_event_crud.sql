-- ============================================
-- Event CRUD Operations
-- Sprint 3: Event Creation
-- ============================================

-- Update Event Function
CREATE OR REPLACE FUNCTION public.update_event(
    p_event_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_event_type TEXT DEFAULT NULL,
    p_latitude DECIMAL DEFAULT NULL,
    p_longitude DECIMAL DEFAULT NULL,
    p_location_name TEXT DEFAULT NULL,
    p_location_address TEXT DEFAULT NULL,
    p_event_date TIMESTAMPTZ DEFAULT NULL,
    p_event_end_date TIMESTAMPTZ DEFAULT NULL,
    p_max_participants INTEGER DEFAULT NULL,
    p_price DECIMAL DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL,
    p_requires_approval BOOLEAN DEFAULT NULL,
    p_is_premium_only BOOLEAN DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS public.events AS $$
DECLARE
    v_event public.events;
    v_organizer_id UUID;
BEGIN
    -- Get organizer's profile
    SELECT id INTO v_organizer_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF v_organizer_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    
    -- Check if user is organizer
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND organizer_id = v_organizer_id;
    
    IF v_event IS NULL THEN
        RAISE EXCEPTION 'Event not found or you are not the organizer';
    END IF;
    
    -- Update event
    UPDATE public.events SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        category = COALESCE(p_category, category),
        event_type = COALESCE(p_event_type, event_type),
        latitude = COALESCE(p_latitude, latitude),
        longitude = COALESCE(p_longitude, longitude),
        location_name = COALESCE(p_location_name, location_name),
        location_address = COALESCE(p_location_address, location_address),
        event_date = COALESCE(p_event_date, event_date),
        event_end_date = COALESCE(p_event_end_date, event_end_date),
        max_participants = COALESCE(p_max_participants, max_participants),
        price = COALESCE(p_price, price),
        photo_url = COALESCE(p_photo_url, photo_url),
        requires_approval = COALESCE(p_requires_approval, requires_approval),
        is_premium_only = COALESCE(p_is_premium_only, is_premium_only),
        status = COALESCE(p_status, status),
        updated_at = NOW()
    WHERE id = p_event_id
    RETURNING * INTO v_event;
    
    RETURN v_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete Event Function (Soft Delete)
CREATE OR REPLACE FUNCTION public.delete_event(
    p_event_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_organizer_id UUID;
BEGIN
    -- Get organizer's profile
    SELECT id INTO v_organizer_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF v_organizer_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    
    -- Check if user is organizer and soft delete
    UPDATE public.events
    SET 
        deleted_at = NOW(),
        status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_event_id AND organizer_id = v_organizer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found or you are not the organizer';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get User's Events
CREATE OR REPLACE FUNCTION public.get_my_events()
RETURNS SETOF JSON AS $$
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'category', e.category,
        'event_type', e.event_type,
        'latitude', e.latitude,
        'longitude', e.longitude,
        'location_name', e.location_name,
        'location_address', e.location_address,
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
        'participant_count', (
            SELECT COUNT(*)::INTEGER 
            FROM public.event_participants 
            WHERE event_id = e.id AND status = 'approved'
        ),
        'created_at', e.created_at,
        'updated_at', e.updated_at
    ) AS event
    FROM public.events e
    WHERE e.organizer_id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    ORDER BY e.event_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update Participant Count Trigger
CREATE OR REPLACE FUNCTION public.update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
        UPDATE public.events 
        SET current_participants = current_participants + 1
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
        UPDATE public.events 
        SET current_participants = GREATEST(0, current_participants - 1)
        WHERE id = OLD.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
                UPDATE public.events 
                SET current_participants = GREATEST(0, current_participants - 1)
                WHERE id = NEW.event_id;
            ELSIF OLD.status != 'approved' AND NEW.status = 'approved' THEN
                UPDATE public.events 
                SET current_participants = current_participants + 1
                WHERE id = NEW.event_id;
            END IF;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create Trigger for Participant Count
DROP TRIGGER IF EXISTS trigger_update_participant_count ON public.event_participants;
CREATE TRIGGER trigger_update_participant_count
    AFTER INSERT OR UPDATE OR DELETE ON public.event_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_participant_count();

-- Allow anonymous uploads for event photos (for now)
-- Note: In production, use Signed URLs for secure uploads

-- Storage Policy for Event Photos (public read)
DROP POLICY IF EXISTS "Public can view event photos" ON storage.objects;
CREATE POLICY "Public can view event photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'event-photos');

-- Storage Policy for authenticated uploads
DROP POLICY IF EXISTS "Authenticated users can upload event photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload event photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'event-photos');

-- Storage Policy for owner delete
DROP POLICY IF EXISTS "Users can delete own event photos" ON storage.objects;
CREATE POLICY "Users can delete own event photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'event-photos');
