-- ============================================
-- Premium System
-- Sprint 6: Telegram Stars Integration
-- ============================================

-- Premium Status Table
CREATE TABLE IF NOT EXISTS public.premium_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_premium BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Premium Purchases Table
CREATE TABLE IF NOT EXISTS public.premium_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    stars_amount INTEGER NOT NULL,
    telegram_payment_id TEXT UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_premium_user_id ON public.premium_status(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_expires ON public.premium_status(expires_at);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.premium_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_telegram_id ON public.premium_purchases(telegram_payment_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.premium_purchases(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_premium_status_updated_at ON public.premium_status;
CREATE TRIGGER update_premium_status_updated_at
    BEFORE UPDATE ON public.premium_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Premium Plans (in Stars)
-- ============================================
-- 1 Day = 10 Stars
-- 1 Week = 50 Stars  
-- 1 Month = 150 Stars
-- 1 Year = 500 Stars

-- ============================================
-- RPC Functions
-- ============================================

-- Get Premium Status
CREATE OR REPLACE FUNCTION public.get_my_premium_status()
RETURNS JSON AS $$
DECLARE
    v_premium public.premium_status;
    v_is_active BOOLEAN := false;
BEGIN
    SELECT * INTO v_premium
    FROM public.premium_status
    WHERE user_id = auth.uid();
    
    IF v_premium IS NOT NULL AND v_premium.is_premium THEN
        -- Check if expired
        IF v_premium.expires_at IS NOT NULL AND v_premium.expires_at > NOW() THEN
            v_is_active := true;
        ELSE
            -- Deactivate expired premium
            UPDATE public.premium_status
            SET is_premium = false
            WHERE user_id = auth.uid();
        END IF;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'is_premium', v_is_active,
        'started_at', v_premium.started_at,
        'expires_at', v_premium.expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create Purchase Intent
CREATE OR REPLACE FUNCTION public.create_premium_purchase(
    p_plan_id TEXT,
    p_stars_amount INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_purchase public.premium_purchases;
    v_plan_name TEXT;
BEGIN
    -- Validate plan
    CASE p_plan_id
        WHEN 'day' THEN v_plan_name := '1 День';
        WHEN 'week' THEN v_plan_name := '1 Тиждень';
        WHEN 'month' THEN v_plan_name := '1 Місяць';
        WHEN 'year' THEN v_plan_name := '1 Рік';
        ELSE RETURN json_build_object('success', false, 'error', 'Невідомий план');
    END CASE;
    
    -- Check for existing pending purchase
    SELECT * INTO v_purchase
    FROM public.premium_purchases
    WHERE user_id = auth.uid() AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_purchase IS NOT NULL THEN
        -- Return existing purchase
        RETURN json_build_object(
            'success', true,
            'purchase_id', v_purchase.id,
            'already_exists', true
        );
    END IF;
    
    -- Create new purchase
    INSERT INTO public.premium_purchases (user_id, plan_id, plan_name, stars_amount, status)
    VALUES (auth.uid(), p_plan_id, v_plan_name, p_stars_amount, 'pending')
    RETURNING * INTO v_purchase;
    
    RETURN json_build_object(
        'success', true,
        'purchase_id', v_purchase.id,
        'plan_id', v_purchase.plan_id,
        'plan_name', v_purchase.plan_name,
        'stars_amount', v_purchase.stars_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate and Complete Purchase (called after Telegram confirms payment)
CREATE OR REPLACE FUNCTION public.validate_premium_purchase(
    p_purchase_id UUID,
    p_telegram_payment_id TEXT
)
RETURNS JSON AS $$
DECLARE
    v_purchase public.premium_purchases;
    v_premium public.premium_status;
    v_duration INTERVAL;
    v_new_expires TIMESTAMPTZ;
    v_is_new BOOLEAN := false;
BEGIN
    -- Get purchase
    SELECT * INTO v_purchase
    FROM public.premium_purchases
    WHERE id = p_purchase_id AND user_id = auth.uid() AND status = 'pending';
    
    IF v_purchase IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Покупку не знайдено');
    END IF;
    
    -- Check for duplicate Telegram payment
    IF p_telegram_payment_id IS NOT NULL THEN
        SELECT * INTO v_purchase
        FROM public.premium_purchases
        WHERE telegram_payment_id = p_telegram_payment_id AND status = 'completed';
        
        IF v_purchase IS NOT NULL THEN
            RETURN json_build_object('success', false, 'error', 'Ця оплата вже оброблена');
        END IF;
    END IF;
    
    -- Calculate duration
    CASE v_purchase.plan_id
        WHEN 'day' THEN v_duration := INTERVAL '1 day';
        WHEN 'week' THEN v_duration := INTERVAL '7 days';
        WHEN 'month' THEN v_duration := INTERVAL '30 days';
        WHEN 'year' THEN v_duration := INTERVAL '365 days';
        ELSE v_duration := INTERVAL '30 days';
    END CASE;
    
    -- Get or create premium status
    SELECT * INTO v_premium
    FROM public.premium_status
    WHERE user_id = auth.uid();
    
    IF v_premium IS NULL THEN
        INSERT INTO public.premium_status (user_id, is_premium, started_at, expires_at)
        VALUES (auth.uid(), true, NOW(), NOW() + v_duration)
        RETURNING * INTO v_premium;
        v_is_new := true;
    ELSE
        -- Extend existing premium or activate new
        IF v_premium.is_premium AND v_premium.expires_at > NOW() THEN
            -- Extend from current expiration
            v_new_expires := v_premium.expires_at + v_duration;
        ELSE
            -- Start fresh
            v_new_expires := NOW() + v_duration;
            v_is_new := true;
        END IF;
        
        UPDATE public.premium_status
        SET is_premium = true,
            started_at = COALESCE(v_premium.started_at, NOW()),
            expires_at = v_new_expires
        WHERE user_id = auth.uid()
        RETURNING * INTO v_premium;
    END IF;
    
    -- Mark purchase as completed
    UPDATE public.premium_purchases
    SET status = 'completed',
        telegram_payment_id = p_telegram_payment_id,
        completed_at = NOW()
    WHERE id = p_purchase_id;
    
    RETURN json_build_object(
        'success', true,
        'is_premium', true,
        'started_at', v_premium.started_at,
        'expires_at', v_premium.expires_at,
        'is_new', v_is_new
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fail Purchase
CREATE OR REPLACE FUNCTION public.fail_premium_purchase(p_purchase_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE public.premium_purchases
    SET status = 'failed'
    WHERE id = p_purchase_id AND user_id = auth.uid() AND status = 'pending';
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Purchase History
CREATE OR REPLACE FUNCTION public.get_my_purchase_history()
RETURNS JSON AS $$
DECLARE
    v_purchases JSON;
BEGIN
    SELECT json_agg(json_build_object(
        'id', id,
        'plan_name', plan_name,
        'stars_amount', stars_amount,
        'status', status,
        'created_at', created_at,
        'completed_at', completed_at
    ) ORDER BY created_at DESC)
    INTO v_purchases
    FROM public.premium_purchases
    WHERE user_id = auth.uid();
    
    RETURN json_build_object(
        'success', true,
        'purchases', COALESCE(v_purchases, '[]')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_purchases;