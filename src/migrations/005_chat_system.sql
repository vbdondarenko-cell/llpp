-- ============================================
-- Chat System
-- Sprint 5: Private Event Chats
-- ============================================

-- Chats Table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_group BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_by UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Chat Members Table
CREATE TABLE IF NOT EXISTS public.chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(chat_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chats_event_id ON public.chats(event_id);
CREATE INDEX IF NOT EXISTS idx_chats_expires_at ON public.chats(expires_at);
CREATE INDEX IF NOT EXISTS idx_chats_archived ON public.chats(archived_at) WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(chat_id) WHERE is_read = false AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON public.chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_active ON public.chat_members(user_id) WHERE is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RPC Functions
-- ============================================

-- Create Chat (auto-created when request accepted)
CREATE OR REPLACE FUNCTION public.create_chat(
    p_event_id UUID,
    p_name TEXT,
    p_duration_hours INTEGER DEFAULT 6
)
RETURNS JSON AS $$
DECLARE
    v_chat public.chats;
    v_event public.events;
    v_profile public.profiles;
    v_chat_id UUID;
BEGIN
    -- Check if event exists
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND deleted_at IS NULL;
    
    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Подія не знайдена');
    END IF;
    
    -- Check if chat already exists for this event
    SELECT id INTO v_chat_id
    FROM public.chats
    WHERE event_id = p_event_id AND archived_at IS NULL;
    
    IF v_chat_id IS NOT NULL THEN
        RETURN json_build_object('success', true, 'chat_id', v_chat_id, 'already_exists', true);
    END IF;
    
    -- Get organizer profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_event.organizer_id;
    
    -- Create chat
    INSERT INTO public.chats (event_id, name, created_by, expires_at)
    VALUES (p_event_id, COALESCE(p_name, v_event.title), auth.uid(), NOW() + (p_duration_hours || ' hours')::INTERVAL)
    RETURNING * INTO v_chat;
    
    -- Add organizer as member
    INSERT INTO public.chat_members (chat_id, user_id, role)
    VALUES (v_chat.id, auth.uid(), 'organizer');
    
    RETURN json_build_object(
        'success', true,
        'chat_id', v_chat.id,
        'expires_at', v_chat.expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add Member to Chat
CREATE OR REPLACE FUNCTION public.add_chat_member(
    p_chat_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
    v_chat public.chats;
    v_member public.chat_members;
BEGIN
    -- Check if chat exists and is active
    SELECT * INTO v_chat
    FROM public.chats
    WHERE id = p_chat_id AND archived_at IS NULL AND is_active = true;
    
    IF v_chat IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Чат не знайдено або архівовано');
    END IF;
    
    -- Check if chat is not expired
    IF v_chat.expires_at < NOW() THEN
        RETURN json_build_object('success', false, 'error', 'Чат закінчився');
    END IF;
    
    -- Add or update member
    INSERT INTO public.chat_members (chat_id, user_id, role)
    VALUES (p_chat_id, p_user_id, p_role)
    ON CONFLICT (chat_id, user_id) DO UPDATE
    SET is_active = true, joined_at = NOW()
    RETURNING * INTO v_member;
    
    -- Send system message
    INSERT INTO public.messages (chat_id, sender_id, content, message_type)
    VALUES (
        p_chat_id,
        auth.uid(),
        (SELECT COALESCE(first_name, username) FROM public.profiles WHERE user_id = p_user_id) || ' приєднався до чату',
        'system'
    );
    
    RETURN json_build_object('success', true, 'member_id', v_member.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send Message
CREATE OR REPLACE FUNCTION public.send_message(
    p_chat_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    v_chat public.chats;
    v_message public.messages;
    v_is_member BOOLEAN;
BEGIN
    -- Check if chat exists and is active
    SELECT * INTO v_chat
    FROM public.chats
    WHERE id = p_chat_id AND archived_at IS NULL AND is_active = true;
    
    IF v_chat IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Чат не знайдено або архівовано');
    END IF;
    
    -- Check if chat is not expired
    IF v_chat.expires_at < NOW() THEN
        RETURN json_build_object('success', false, 'error', 'Чат закінчився');
    END IF;
    
    -- Check if user is a member
    SELECT EXISTS(
        SELECT 1 FROM public.chat_members
        WHERE chat_id = p_chat_id AND user_id = auth.uid() AND is_active = true
    ) INTO v_is_member;
    
    IF NOT v_is_member THEN
        RETURN json_build_object('success', false, 'error', 'Ви не учасник чату');
    END IF;
    
    -- Create message
    INSERT INTO public.messages (chat_id, sender_id, content, message_type, metadata)
    VALUES (p_chat_id, auth.uid(), p_content, p_message_type, p_metadata)
    RETURNING * INTO v_message;
    
    -- Update unread counts for other members
    UPDATE public.chat_members
    SET unread_count = unread_count + 1
    WHERE chat_id = p_chat_id AND user_id != auth.uid() AND is_active = true;
    
    RETURN json_build_object(
        'success', true,
        'message', json_build_object(
            'id', v_message.id,
            'content', v_message.content,
            'message_type', v_message.message_type,
            'sender_id', v_message.sender_id,
            'created_at', v_message.created_at
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark Messages as Read
CREATE OR REPLACE FUNCTION public.mark_messages_read(
    p_chat_id UUID,
    p_message_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_is_member BOOLEAN;
BEGIN
    -- Check if user is a member
    SELECT EXISTS(
        SELECT 1 FROM public.chat_members
        WHERE chat_id = p_chat_id AND user_id = auth.uid() AND is_active = true
    ) INTO v_is_member;
    
    IF NOT v_is_member THEN
        RETURN json_build_object('success', false, 'error', 'Ви не учасник чату');
    END IF;
    
    -- Mark messages as read
    IF p_message_id IS NOT NULL THEN
        -- Mark single message
        UPDATE public.messages
        SET is_read = true, read_by = array_append(read_by, auth.uid())
        WHERE id = p_message_id AND chat_id = p_chat_id;
    ELSE
        -- Mark all messages as read
        UPDATE public.messages
        SET is_read = true, read_by = array_append(read_by, auth.uid())
        WHERE chat_id = p_chat_id AND is_read = false AND sender_id != auth.uid() AND deleted_at IS NULL;
    END IF;
    
    -- Reset unread count
    UPDATE public.chat_members
    SET unread_count = 0, last_read_at = NOW()
    WHERE chat_id = p_chat_id AND user_id = auth.uid();
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Chat Messages
CREATE OR REPLACE FUNCTION public.get_chat_messages(
    p_chat_id UUID,
    p_before TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS JSON AS $$
DECLARE
    v_messages JSON;
    v_is_member BOOLEAN;
BEGIN
    -- Check if user is a member
    SELECT EXISTS(
        SELECT 1 FROM public.chat_members
        WHERE chat_id = p_chat_id AND user_id = auth.uid() AND is_active = true
    ) INTO v_is_member;
    
    IF NOT v_is_member THEN
        RETURN json_build_object('success', false, 'error', 'Ви не учасник чату');
    END IF;
    
    -- Get messages
    SELECT json_agg(json_build_object(
        'id', m.id,
        'content', m.content,
        'message_type', m.message_type,
        'metadata', m.metadata,
        'is_read', m.is_read,
        'sender_id', m.sender_id,
        'created_at', m.created_at,
        'sender', json_build_object(
            'id', p.id,
            'username', p.username,
            'first_name', p.first_name,
            'avatar_url', p.avatar_url
        )
    ) ORDER BY m.created_at DESC)
    INTO v_messages
    FROM public.messages m
    JOIN public.profiles p ON m.sender_id = p.user_id
    WHERE m.chat_id = p_chat_id
      AND m.deleted_at IS NULL
      AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC
    LIMIT p_limit;
    
    RETURN json_build_object(
        'success', true,
        'messages', COALESCE(v_messages, '[]')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get User Chats
CREATE OR REPLACE FUNCTION public.get_my_chats()
RETURNS JSON AS $$
DECLARE
    v_chats JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'id', c.id,
        'name', c.name,
        'event_id', c.event_id,
        'expires_at', c.expires_at,
        'is_active', c.is_active,
        'unread_count', cm.unread_count,
        'last_message', (
            SELECT json_build_object(
                'content', m.content,
                'message_type', m.message_type,
                'created_at', m.created_at,
                'sender_id', m.sender_id
            )
            FROM public.messages m
            WHERE m.chat_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
        ),
        'member_count', (
            SELECT COUNT(*)::INTEGER
            FROM public.chat_members
            WHERE chat_id = c.id AND is_active = true
        )
    ) ORDER BY c.updated_at DESC)
    INTO v_chats
    FROM public.chats c
    JOIN public.chat_members cm ON c.id = cm.chat_id
    WHERE cm.user_id = auth.uid()
      AND cm.is_active = true
      AND c.is_active = true
      AND c.archived_at IS NULL;
    
    RETURN json_build_object(
        'success', true,
        'chats', COALESCE(v_chats, '[]')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Archive Chat (called when expired or manually)
CREATE OR REPLACE FUNCTION public.archive_chat(p_chat_id UUID)
RETURNS JSON AS $$
DECLARE
    v_chat public.chats;
BEGIN
    -- Check if user is organizer or admin
    SELECT * INTO v_chat
    FROM public.chats
    WHERE id = p_chat_id;
    
    IF v_chat IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Чат не знайдено');
    END IF;
    
    -- Archive chat
    UPDATE public.chats
    SET archived_at = NOW(), is_active = false
    WHERE id = p_chat_id;
    
    -- Deactivate all members
    UPDATE public.chat_members
    SET is_active = false
    WHERE chat_id = p_chat_id;
    
    -- Send system message
    INSERT INTO public.messages (chat_id, sender_id, content, message_type)
    VALUES (p_chat_id, v_chat.created_by, 'Чат архівовано', 'system');
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete Chat (permanent)
CREATE OR REPLACE FUNCTION public.delete_chat(p_chat_id UUID)
RETURNS JSON AS $$
DECLARE
    v_chat public.chats;
BEGIN
    -- Check if user is creator
    SELECT * INTO v_chat
    FROM public.chats
    WHERE id = p_chat_id AND created_by = auth.uid();
    
    IF v_chat IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Чат не знайдено або ви не власник');
    END IF;
    
    -- Delete all messages
    DELETE FROM public.messages WHERE chat_id = p_chat_id;
    
    -- Delete all members
    DELETE FROM public.chat_members WHERE chat_id = p_chat_id;
    
    -- Delete chat
    DELETE FROM public.chats WHERE id = p_chat_id;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Chat Members
CREATE OR REPLACE FUNCTION public.get_chat_members(p_chat_id UUID)
RETURNS JSON AS $$
DECLARE
    v_members JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'id', cm.id,
        'user_id', cm.user_id,
        'role', cm.role,
        'joined_at', cm.joined_at,
        'is_online', false,
        'profile', json_build_object(
            'id', p.id,
            'username', p.username,
            'first_name', p.first_name,
            'avatar_url', p.avatar_url
        )
    ))
    INTO v_members
    FROM public.chat_members cm
    JOIN public.profiles p ON cm.user_id = p.user_id
    WHERE cm.chat_id = p_chat_id AND cm.is_active = true;
    
    RETURN json_build_object(
        'success', true,
        'members', COALESCE(v_members, '[]')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Set Typing Status
CREATE OR REPLACE FUNCTION public.set_typing_status(
    p_chat_id UUID,
    p_is_typing BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    v_is_member BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.chat_members
        WHERE chat_id = p_chat_id AND user_id = auth.uid() AND is_active = true
    ) INTO v_is_member;
    
    IF NOT v_is_member THEN
        RETURN json_build_object('success', false);
    END IF;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger: Auto-archive expired chats
-- ============================================
CREATE OR REPLACE FUNCTION public.check_expired_chats()
RETURNS void AS $$
BEGIN
    -- Archive expired chats
    UPDATE public.chats
    SET archived_at = NOW(), is_active = false
    WHERE expires_at < NOW() AND archived_at IS NULL;
    
    -- Deactivate members of expired chats
    UPDATE public.chat_members
    SET is_active = false
    WHERE chat_id IN (
        SELECT id FROM public.chats
        WHERE expires_at < NOW() AND archived_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
