-- ============================================
-- Admin Panel - Sprint 9
-- Internal Administration System
-- ============================================

-- ============================================
-- ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('admin', 'moderator')),
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- ============================================
-- USER REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    resolved_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.user_reports(created_at DESC);

-- ============================================
-- EVENT REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    resolved_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_reports_status ON public.event_reports(status);
CREATE INDEX IF NOT EXISTS idx_event_reports_event ON public.event_reports(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reports_created ON public.event_reports(created_at DESC);

-- ============================================
-- USER STATUS FLAGS
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_admin_audit_log_updated_at ON public.admin_audit_log;
CREATE TRIGGER update_admin_audit_log_updated_at
    BEFORE UPDATE ON public.admin_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- HELPER FUNCTION TO CHECK ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- HELPER FUNCTION TO GET ADMIN ROLE
-- ============================================
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role FROM public.admin_users 
        WHERE user_id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- ADMIN RPC FUNCTIONS
-- ============================================

-- Get admin dashboard statistics
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    -- Check admin access
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT json_build_object(
        'total_users', (
            SELECT COUNT(*) FROM auth.users u
            JOIN public.profiles p ON p.user_id = u.id
            WHERE p.is_banned = false
        ),
        'total_events', (
            SELECT COUNT(*) FROM public.events WHERE is_cancelled = false
        ),
        'total_premium', (
            SELECT COUNT(*) FROM public.premium_status WHERE is_premium = true AND expires_at > NOW()
        ),
        'pending_reports', (
            SELECT COUNT(*) FROM (
                SELECT id FROM public.user_reports WHERE status = 'pending'
                UNION ALL
                SELECT id FROM public.event_reports WHERE status = 'pending'
            ) AS combined
        ),
        'suspended_users', (
            SELECT COUNT(*) FROM public.profiles WHERE is_suspended = true
        ),
        'banned_users', (
            SELECT COUNT(*) FROM public.profiles WHERE is_banned = true
        ),
        'total_messages', (
            SELECT COALESCE(SUM(messages_sent), 0) FROM public.user_stats
        ),
        'daily_active_users', (
            SELECT COUNT(DISTINCT user_id) FROM public.chat_messages
            WHERE created_at > NOW() - INTERVAL '24 hours'
        ),
        'events_this_week', (
            SELECT COUNT(*) FROM public.events
            WHERE created_at > NOW() - INTERVAL '7 days'
        ),
        'new_users_today', (
            SELECT COUNT(*) FROM auth.users
            WHERE created_at > CURRENT_DATE
        )
    ) INTO v_stats;
    
    RETURN json_build_object('success', true, 'stats', v_stats);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all users (admin)
CREATE OR REPLACE FUNCTION public.admin_get_users(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_users JSON;
    v_total INT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    -- Build query
    WITH filtered_users AS (
        SELECT 
            p.user_id,
            p.username,
            p.display_name,
            p.avatar_url,
            p.is_suspended,
            p.is_banned,
            p.is_hidden,
            p.suspended_until,
            p.suspension_reason,
            p.ban_reason,
            p.created_at,
            us.events_created,
            us.events_joined,
            ps.is_premium,
            EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = p.user_id) as is_admin,
            COUNT(*) OVER() as total_count
        FROM public.profiles p
        LEFT JOIN public.user_stats us ON p.user_id = us.user_id
        LEFT JOIN public.premium_status ps ON p.user_id = ps.user_id AND ps.is_premium = true
        WHERE 
            (p.is_banned = true AND p_status = 'banned')
            OR (p.is_suspended = true AND p_status = 'suspended')
            OR (p.is_banned = false AND p.is_suspended = false AND (p_status IS NULL OR p_status = 'active'))
            OR p_status IS NULL
    )
    SELECT 
        json_agg(
            json_build_object(
                'user_id', user_id,
                'username', username,
                'display_name', display_name,
                'avatar_url', avatar_url,
                'is_suspended', is_suspended,
                'is_banned', is_banned,
                'is_hidden', is_hidden,
                'suspended_until', suspended_until,
                'suspension_reason', suspension_reason,
                'ban_reason', ban_reason,
                'created_at', created_at,
                'events_created', COALESCE(events_created, 0),
                'events_joined', COALESCE(events_joined, 0),
                'is_premium', is_premium,
                'is_admin', is_admin
            )
        ),
        MAX(total_count)::INT
    INTO v_users, v_total
    FROM filtered_users
    WHERE 
        (p_search IS NULL OR username ILIKE '%' || p_search || '%' OR display_name ILIKE '%' || p_search || '%')
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN json_build_object(
        'success', true,
        'users', COALESCE(v_users, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get single user details
CREATE OR REPLACE FUNCTION public.admin_get_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user JSON;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT json_build_object(
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'bio', p.bio,
        'avatar_url', p.avatar_url,
        'interests', p.interests,
        'location', p.location,
        'is_suspended', p.is_suspended,
        'is_banned', p.is_banned,
        'is_hidden', p.is_hidden,
        'suspended_until', p.suspended_until,
        'suspension_reason', p.suspension_reason,
        'ban_reason', p.ban_reason,
        'created_at', p.created_at,
        'statistics', (
            SELECT json_build_object(
                'events_created', COALESCE(us.events_created, 0),
                'events_joined', COALESCE(us.events_joined, 0),
                'messages_sent', COALESCE(us.messages_sent, 0),
                'achievements_count', (
                    SELECT COUNT(*) FROM public.user_achievements WHERE user_id = p.user_id
                )
            )
            FROM public.user_stats us WHERE us.user_id = p.user_id
        ),
        'is_premium', EXISTS(
            SELECT 1 FROM public.premium_status 
            WHERE user_id = p.user_id AND is_premium = true AND expires_at > NOW()
        ),
        'recent_events', (
            SELECT json_agg(json_build_object(
                'id', e.id,
                'title', e.title,
                'starts_at', e.starts_at,
                'status', e.status,
                'participants_count', (
                    SELECT COUNT(*) FROM public.event_requests WHERE event_id = e.id AND status = 'accepted'
                )
            ))
            FROM public.events e
            WHERE e.organizer_id = p.user_id
            ORDER BY e.created_at DESC
            LIMIT 10
        ),
        'reports', (
            SELECT COUNT(*) FROM public.user_reports 
            WHERE reported_user_id = p.user_id AND status = 'pending'
        )
    ) INTO v_user
    FROM public.profiles p
    WHERE p.user_id = p_user_id;
    
    IF v_user IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Користувача не знайдено');
    END IF;
    
    RETURN json_build_object('success', true, 'user', v_user);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Suspend user
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
    p_user_id UUID,
    p_reason TEXT,
    p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    UPDATE public.profiles
    SET 
        is_suspended = true,
        suspended_at = NOW(),
        suspended_until = p_until,
        suspension_reason = p_reason
    WHERE user_id = p_user_id;
    
    -- Audit log
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'suspend_user', 'profile', p_user_id, json_build_object(
        'reason', p_reason,
        'until', p_until
    ));
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unsuspend user
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    UPDATE public.profiles
    SET 
        is_suspended = false,
        suspended_until = NULL,
        suspension_reason = NULL
    WHERE user_id = p_user_id;
    
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'unsuspend_user', 'profile', p_user_id, '{}'::JSONB);
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ban user
CREATE OR REPLACE FUNCTION public.admin_ban_user(
    p_user_id UUID,
    p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    UPDATE public.profiles
    SET 
        is_banned = true,
        banned_at = NOW(),
        ban_reason = p_reason,
        is_suspended = false
    WHERE user_id = p_user_id;
    
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'ban_user', 'profile', p_user_id, json_build_object(
        'reason', p_reason
    ));
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unban user
CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    UPDATE public.profiles
    SET 
        is_banned = false,
        ban_reason = NULL
    WHERE user_id = p_user_id;
    
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'unban_user', 'profile', p_user_id, '{}'::JSONB);
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all events (admin)
CREATE OR REPLACE FUNCTION public.admin_get_events(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_events JSON;
    v_total INT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    WITH filtered_events AS (
        SELECT 
            e.id,
            e.title,
            e.description,
            e.starts_at,
            e.status,
            e.is_cancelled,
            e.is_hidden,
            e.created_at,
            p.username as organizer_username,
            p.display_name as organizer_name,
            (SELECT COUNT(*) FROM public.event_requests er WHERE er.event_id = e.id AND er.status = 'accepted') as participants_count,
            COUNT(*) OVER() as total_count
        FROM public.events e
        JOIN public.profiles p ON e.organizer_id = p.user_id
        WHERE 
            (p_status = 'cancelled' AND e.is_cancelled = true)
            OR (p_status = 'hidden' AND e.is_hidden = true)
            OR (p_status IS NULL OR p_status = 'active')
    )
    SELECT 
        json_agg(json_build_object(
            'id', id,
            'title', title,
            'description', LEFT(description, 100),
            'starts_at', starts_at,
            'status', status,
            'is_cancelled', is_cancelled,
            'is_hidden', is_hidden,
            'created_at', created_at,
            'organizer_username', organizer_username,
            'organizer_name', organizer_name,
            'participants_count', participants_count
        )),
        MAX(total_count)::INT
    INTO v_events, v_total
    FROM filtered_events
    WHERE 
        (p_search IS NULL OR title ILIKE '%' || p_search || '%')
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN json_build_object(
        'success', true,
        'events', COALESCE(v_events, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get event details
CREATE OR REPLACE FUNCTION public.admin_get_event(p_event_id UUID)
RETURNS JSON AS $$
DECLARE
    v_event JSON;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT json_build_object(
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
        'is_cancelled', e.is_cancelled,
        'is_hidden', e.is_hidden,
        'status', e.status,
        'created_at', e.created_at,
        'organizer', (
            SELECT json_build_object(
                'user_id', p.user_id,
                'username', p.username,
                'display_name', p.display_name,
                'avatar_url', p.avatar_url
            )
            FROM public.profiles p WHERE p.user_id = e.organizer_id
        ),
        'participants', (
            SELECT json_agg(json_build_object(
                'user_id', p.user_id,
                'username', p.username,
                'display_name', p.display_name,
                'avatar_url', p.avatar_url,
                'status', er.status,
                'requested_at', er.created_at
            ))
            FROM public.event_requests er
            JOIN public.profiles p ON er.user_id = p.user_id
            WHERE er.event_id = e.id
        ),
        'chats', (
            SELECT json_agg(json_build_object(
                'id', c.id,
                'type', c.chat_type,
                'created_at', c.created_at,
                'message_count', (
                    SELECT COUNT(*) FROM public.chat_messages WHERE chat_id = c.id
                )
            ))
            FROM public.chats c
            WHERE c.event_id = e.id
        )
    ) INTO v_event
    FROM public.events e
    WHERE e.id = p_event_id;
    
    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Подію не знайдено');
    END IF;
    
    RETURN json_build_object('success', true, 'event', v_event);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Hide event
CREATE OR REPLACE FUNCTION public.admin_hide_event(p_event_id UUID)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    UPDATE public.events
    SET is_hidden = true
    WHERE id = p_event_id;
    
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'hide_event', 'event', p_event_id, '{}'::JSONB);
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unhide event
CREATE OR REPLACE FUNCTION public.admin_unhide_event(p_event_id UUID)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    UPDATE public.events
    SET is_hidden = false
    WHERE id = p_event_id;
    
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'unhide_event', 'event', p_event_id, '{}'::JSONB);
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete event
CREATE OR REPLACE FUNCTION public.admin_delete_event(p_event_id UUID, p_reason TEXT)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    UPDATE public.events
    SET is_cancelled = true, status = 'cancelled'
    WHERE id = p_event_id;
    
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'delete_event', 'event', p_event_id, json_build_object(
        'reason', p_reason
    ));
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get reports
CREATE OR REPLACE FUNCTION public.admin_get_reports(
    p_type TEXT DEFAULT 'user',
    p_status TEXT DEFAULT 'pending',
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_reports JSON;
    v_total INT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    IF p_type = 'user' THEN
        WITH filtered_reports AS (
            SELECT 
                r.id,
                r.reason,
                r.description,
                r.status,
                r.resolution_notes,
                r.created_at,
                r.resolved_at,
                reporter.username as reporter_username,
                reporter.display_name as reporter_name,
                reported.username as reported_username,
                reported.display_name as reported_name,
                COUNT(*) OVER() as total_count
            FROM public.user_reports r
            LEFT JOIN public.profiles reporter ON r.reporter_id = reporter.user_id
            JOIN public.profiles reported ON r.reported_user_id = reported.user_id
            WHERE r.status = p_status OR p_status IS NULL
        )
        SELECT 
            json_agg(json_build_object(
                'id', id,
                'reason', reason,
                'description', description,
                'status', status,
                'resolution_notes', resolution_notes,
                'created_at', created_at,
                'resolved_at', resolved_at,
                'reporter_username', reporter_username,
                'reporter_name', reporter_name,
                'reported_username', reported_username,
                'reported_name', reported_name,
                'type', 'user'
            )),
            MAX(total_count)::INT
        INTO v_reports, v_total
        FROM filtered_reports
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    ELSE
        WITH filtered_reports AS (
            SELECT 
                r.id,
                r.reason,
                r.description,
                r.status,
                r.resolution_notes,
                r.created_at,
                r.resolved_at,
                reporter.username as reporter_username,
                e.title as event_title,
                COUNT(*) OVER() as total_count
            FROM public.event_reports r
            LEFT JOIN public.profiles reporter ON r.reporter_id = reporter.user_id
            JOIN public.events e ON r.event_id = e.id
            WHERE r.status = p_status OR p_status IS NULL
        )
        SELECT 
            json_agg(json_build_object(
                'id', id,
                'reason', reason,
                'description', description,
                'status', status,
                'resolution_notes', resolution_notes,
                'created_at', created_at,
                'resolved_at', resolved_at,
                'reporter_username', reporter_username,
                'event_title', event_title,
                'type', 'event'
            )),
            MAX(total_count)::INT
        INTO v_reports, v_total
        FROM filtered_reports
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'reports', COALESCE(v_reports, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Resolve report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
    p_report_id UUID,
    p_type TEXT,
    p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    IF p_type = 'user' THEN
        UPDATE public.user_reports
        SET 
            status = 'resolved',
            resolved_by = v_admin_id,
            resolved_at = NOW(),
            resolution_notes = p_notes
        WHERE id = p_report_id;
    ELSE
        UPDATE public.event_reports
        SET 
            status = 'resolved',
            resolved_by = v_admin_id,
            resolved_at = NOW(),
            resolution_notes = p_notes
        WHERE id = p_report_id;
    END IF;
    
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'resolve_report', p_type || '_report', p_report_id, json_build_object(
        'notes', p_notes
    ));
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject report
CREATE OR REPLACE FUNCTION public.admin_reject_report(
    p_report_id UUID,
    p_type TEXT,
    p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT id INTO v_admin_id FROM public.admin_users WHERE user_id = auth.uid();
    
    IF p_type = 'user' THEN
        UPDATE public.user_reports
        SET 
            status = 'rejected',
            resolved_by = v_admin_id,
            resolved_at = NOW(),
            resolution_notes = p_notes
        WHERE id = p_report_id;
    ELSE
        UPDATE public.event_reports
        SET 
            status = 'rejected',
            resolved_by = v_admin_id,
            resolved_at = NOW(),
            resolution_notes = p_notes
        WHERE id = p_report_id;
    END IF;
    
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'reject_report', p_type || '_report', p_report_id, json_build_object(
        'notes', p_notes
    ));
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get chats (admin)
CREATE OR REPLACE FUNCTION public.admin_get_chats(
    p_search TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_chats JSON;
    v_total INT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    WITH filtered_chats AS (
        SELECT 
            c.id,
            c.chat_type,
            c.created_at,
            c.expires_at,
            e.title as event_title,
            (SELECT COUNT(*) FROM public.chat_messages WHERE chat_id = c.id) as message_count,
            COUNT(*) OVER() as total_count
        FROM public.chats c
        LEFT JOIN public.events e ON c.event_id = e.id
        WHERE c.chat_type != 'private'
    )
    SELECT 
        json_agg(json_build_object(
            'id', id,
            'chat_type', chat_type,
            'event_title', event_title,
            'message_count', message_count,
            'created_at', created_at,
            'expires_at', expires_at
        )),
        MAX(total_count)::INT
    INTO v_chats, v_total
    FROM filtered_chats
    WHERE 
        (p_search IS NULL OR event_title ILIKE '%' || p_search || '%')
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN json_build_object(
        'success', true,
        'chats', COALESCE(v_chats, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get chat messages
CREATE OR REPLACE FUNCTION public.admin_get_chat_messages(
    p_chat_id UUID,
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_messages JSON;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    SELECT json_agg(json_build_object(
        'id', m.id,
        'content', m.content,
        'created_at', m.created_at,
        'user_id', m.user_id,
        'username', p.username,
        'display_name', p.display_name
    ) ORDER BY m.created_at DESC)
    INTO v_messages
    FROM public.chat_messages m
    JOIN public.profiles p ON m.user_id = p.user_id
    WHERE m.chat_id = p_chat_id
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN json_build_object(
        'success', true,
        'messages', COALESCE(v_messages, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get audit log
CREATE OR REPLACE FUNCTION public.admin_get_audit_log(
    p_action TEXT DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_logs JSON;
    v_total INT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    WITH filtered_logs AS (
        SELECT 
            al.id,
            al.action,
            al.target_type,
            al.target_id,
            al.details,
            al.created_at,
            au.role as admin_role,
            p.username as admin_username,
            COUNT(*) OVER() as total_count
        FROM public.admin_audit_log al
        JOIN public.admin_users au ON al.admin_id = au.id
        JOIN public.profiles p ON au.user_id = p.user_id
        WHERE 
            (p_action IS NULL OR al.action = p_action)
            AND (p_target_type IS NULL OR al.target_type = p_target_type)
    )
    SELECT 
        json_agg(json_build_object(
            'id', id,
            'action', action,
            'target_type', target_type,
            'target_id', target_id,
            'details', details,
            'created_at', created_at,
            'admin_role', admin_role,
            'admin_username', admin_username
        )),
        MAX(total_count)::INT
    INTO v_logs, v_total
    FROM filtered_logs
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN json_build_object(
        'success', true,
        'logs', COALESCE(v_logs, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get premium users
CREATE OR REPLACE FUNCTION public.admin_get_premium_users(
    p_status TEXT DEFAULT 'active',
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_users JSON;
    v_total INT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', 'Доступ заборонено');
    END IF;
    
    WITH filtered_users AS (
        SELECT 
            p.user_id,
            p.username,
            p.display_name,
            p.avatar_url,
            ps.is_premium,
            ps.expires_at,
            ps.stars_spent,
            ps.plan_type,
            COUNT(*) OVER() as total_count
        FROM public.profiles p
        JOIN public.premium_status ps ON p.user_id = ps.user_id
        WHERE 
            (p_status = 'active' AND ps.is_premium = true AND ps.expires_at > NOW())
            OR (p_status = 'expired' AND (ps.is_premium = false OR ps.expires_at <= NOW()))
            OR p_status IS NULL
    )
    SELECT 
        json_agg(json_build_object(
            'user_id', user_id,
            'username', username,
            'display_name', display_name,
            'avatar_url', avatar_url,
            'is_premium', is_premium,
            'expires_at', expires_at,
            'stars_spent', COALESCE(stars_spent, 0),
            'plan_type', plan_type
        )),
        MAX(total_count)::INT
    INTO v_users, v_total
    FROM filtered_users
    ORDER BY expires_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN json_build_object(
        'success', true,
        'users', COALESCE(v_users, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create initial admin user (run this manually with your user_id)
-- INSERT INTO public.admin_users (user_id, role) VALUES ('your-user-uuid-here', 'admin');

-- Enable Realtime for audit log
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_reports;