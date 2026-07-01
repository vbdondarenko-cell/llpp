-- ============================================
-- Event Join Requests
-- Sprint 4: Join Requests
-- ============================================

-- Event Requests Table
CREATE TABLE IF NOT EXISTS public.event_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_requests_event_id ON public.event_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_user_id ON public.event_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON public.event_requests(status);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_event_requests_updated_at ON public.event_requests;
CREATE TRIGGER update_event_requests_updated_at
    BEFORE UPDATE ON public.event_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RPC Functions
-- ============================================

-- Join Event Function
CREATE OR REPLACE FUNCTION public.join_event(
    p_event_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_event public.events;
    v_profile public.profiles;
    v_existing_request public.event_requests;
    v_is_organizer BOOLEAN;
    v_is_blocked BOOLEAN;
    v_current_participants INTEGER;
    v_result JSON;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF v_profile IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Профіль не знайдено');
    END IF;
    
    -- Check if event exists
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND deleted_at IS NULL;
    
    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Подія не знайдена');
    END IF;
    
    -- Check if user is the organizer
    IF v_event.organizer_id = v_profile.id THEN
        RETURN json_build_object('success', false, 'error', 'Ви організатор цієї події');
    END IF;
    
    -- Check if user is blocked
    SELECT EXISTS(
        SELECT 1 FROM public.blocked_users 
        WHERE user_id = auth.uid() AND blocker_id = v_event.organizer_id
    ) INTO v_is_blocked;
    
    IF v_is_blocked THEN
        RETURN json_build_object('success', false, 'error', 'Вас заблоковано');
    END IF;
    
    -- Check if already has a request
    SELECT * INTO v_existing_request
    FROM public.event_requests
    WHERE event_id = p_event_id AND user_id = auth.uid();
    
    IF v_existing_request IS NOT NULL THEN
        IF v_existing_request.status = 'pending' THEN
            RETURN json_build_object('success', false, 'error', 'Заявка вже очікує');
        ELSIF v_existing_request.status = 'accepted' THEN
            RETURN json_build_object('success', false, 'error', 'Ви вже учасник');
        ELSIF v_existing_request.status = 'cancelled' THEN
            -- Allow re-join after cancellation
            UPDATE public.event_requests 
            SET status = 'pending', updated_at = NOW()
            WHERE id = v_existing_request.id
            RETURNING json_build_object('success', true, 'status', 'pending', 'request_id', id) INTO v_result;
            RETURN v_result;
        END IF;
    END IF;
    
    -- Check if event is full (for auto-accept)
    SELECT current_participants INTO v_current_participants
    FROM public.events
    WHERE id = p_event_id;
    
    IF v_current_participants >= v_event.max_participants AND NOT v_event.requires_approval THEN
        RETURN json_build_object('success', false, 'error', 'Подія вже заповнена');
    END IF;
    
    -- Create request
    INSERT INTO public.event_requests (event_id, user_id, status)
    VALUES (p_event_id, auth.uid(), 'pending')
    ON CONFLICT (event_id, user_id) DO UPDATE
    SET status = 'pending', updated_at = NOW()
    RETURNING json_build_object(
        'success', true,
        'status', status,
        'request_id', id,
        'requires_approval', v_event.requires_approval
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel Request Function
CREATE OR REPLACE FUNCTION public.cancel_request(
    p_event_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_request public.event_requests;
BEGIN
    -- Find and update request
    UPDATE public.event_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE event_id = p_event_id 
      AND user_id = auth.uid() 
      AND status = 'pending'
    RETURNING * INTO v_request;
    
    IF v_request IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Заявку не знайдено');
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Заявку скасовано');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leave Event Function
CREATE OR REPLACE FUNCTION public.leave_event(
    p_event_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_request public.event_requests;
    v_event public.events;
BEGIN
    -- Find and update request
    UPDATE public.event_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE event_id = p_event_id 
      AND user_id = auth.uid() 
      AND status = 'accepted'
    RETURNING * INTO v_request;
    
    IF v_request IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Ви не учасник');
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Ви покинули подію');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept Request Function (Organizer only)
CREATE OR REPLACE FUNCTION public.accept_request(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_event public.events;
    v_profile public.profiles;
    v_request public.event_requests;
    v_is_blocked BOOLEAN;
    v_current_participants INTEGER;
BEGIN
    -- Get organizer's profile
    SELECT id INTO v_profile
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF v_profile IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Профіль не знайдено');
    END IF;
    
    -- Check if user is organizer
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND organizer_id = v_profile.id AND deleted_at IS NULL;
    
    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Подія не знайдена або ви не організатор');
    END IF;
    
    -- Check if request exists and is pending
    SELECT * INTO v_request
    FROM public.event_requests
    WHERE event_id = p_event_id AND user_id = p_user_id AND status = 'pending';
    
    IF v_request IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Заявку не знайдено');
    END IF;
    
    -- Check if event is full
    SELECT current_participants INTO v_current_participants
    FROM public.events
    WHERE id = p_event_id;
    
    IF v_current_participants >= v_event.max_participants THEN
        RETURN json_build_object('success', false, 'error', 'Подія вже заповнена');
    END IF;
    
    -- Accept request
    UPDATE public.event_requests
    SET status = 'accepted', updated_at = NOW()
    WHERE id = v_request.id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Заявку прийнято',
        'user_id', p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decline Request Function (Organizer only)
CREATE OR REPLACE FUNCTION public.decline_request(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_event public.events;
    v_profile public.profiles;
    v_request public.event_requests;
BEGIN
    -- Get organizer's profile
    SELECT id INTO v_profile
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF v_profile IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Профіль не знайдено');
    END IF;
    
    -- Check if user is organizer
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND organizer_id = v_profile.id AND deleted_at IS NULL;
    
    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Подія не знайдена або ви не організатор');
    END IF;
    
    -- Check if request exists and is pending
    SELECT * INTO v_request
    FROM public.event_requests
    WHERE event_id = p_event_id AND user_id = p_user_id AND status = 'pending';
    
    IF v_request IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Заявку не знайдено');
    END IF;
    
    -- Decline request
    UPDATE public.event_requests
    SET status = 'declined', updated_at = NOW()
    WHERE id = v_request.id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Заявку відхилено',
        'user_id', p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Event Requests (for organizers)
CREATE OR REPLACE FUNCTION public.get_event_requests(
    p_event_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_event public.events;
    v_profile public.profiles;
    v_pending JSON;
    v_accepted JSON;
    v_declined JSON;
BEGIN
    -- Get organizer's profile
    SELECT id INTO v_profile
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF v_profile IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Профіль не знайдено');
    END IF;
    
    -- Check if user is organizer
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND organizer_id = v_profile.id AND deleted_at IS NULL;
    
    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Подія не знайдена');
    END IF;
    
    -- Get pending requests with user info
    SELECT json_agg(json_build_object(
        'id', er.id,
        'user_id', er.user_id,
        'status', er.status,
        'created_at', er.created_at,
        'profile', json_build_object(
            'id', p.id,
            'username', p.username,
            'first_name', p.first_name,
            'avatar_url', p.avatar_url,
            'rating', p.rating,
            'rating_count', p.rating_count
        )
    )) INTO v_pending
    FROM public.event_requests er
    JOIN public.profiles p ON er.user_id = p.user_id
    WHERE er.event_id = p_event_id AND er.status = 'pending';
    
    -- Get accepted users
    SELECT json_agg(json_build_object(
        'id', er.id,
        'user_id', er.user_id,
        'status', er.status,
        'created_at', er.created_at,
        'profile', json_build_object(
            'id', p.id,
            'username', p.username,
            'first_name', p.first_name,
            'avatar_url', p.avatar_url,
            'rating', p.rating,
            'rating_count', p.rating_count
        )
    )) INTO v_accepted
    FROM public.event_requests er
    JOIN public.profiles p ON er.user_id = p.user_id
    WHERE er.event_id = p_event_id AND er.status = 'accepted';
    
    -- Get declined users
    SELECT json_agg(json_build_object(
        'id', er.id,
        'user_id', er.user_id,
        'status', er.status,
        'created_at', er.created_at,
        'profile', json_build_object(
            'id', p.id,
            'username', p.username,
            'first_name', p.first_name,
            'avatar_url', p.avatar_url,
            'rating', p.rating,
            'rating_count', p.rating_count
        )
    )) INTO v_declined
    FROM public.event_requests er
    JOIN public.profiles p ON er.user_id = p.user_id
    WHERE er.event_id = p_event_id AND er.status = 'declined';
    
    RETURN json_build_object(
        'success', true,
        'pending', COALESCE(v_pending, '[]'),
        'accepted', COALESCE(v_accepted, '[]'),
        'declined', COALESCE(v_declined, '[]'),
        'event', json_build_object(
            'current_participants', v_event.current_participants,
            'max_participants', v_event.max_participants
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get User's Request Status for Event
CREATE OR REPLACE FUNCTION public.get_my_request_status(
    p_event_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_request public.event_requests;
BEGIN
    SELECT * INTO v_request
    FROM public.event_requests
    WHERE event_id = p_event_id AND user_id = auth.uid();
    
    IF v_request IS NULL THEN
        RETURN json_build_object('has_request', false);
    END IF;
    
    RETURN json_build_object(
        'has_request', true,
        'status', v_request.status,
        'created_at', v_request.created_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable Realtime for event_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_requests;
