// Daily Cleanup Edge Function
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results = { expired_premium: 0, expired_chats: 0, old_notifications: 0 }

    // 1. Expire premium
    await supabase.from('premium').update({ tier: 'none' })
      .neq('tier', 'none').lt('expires_at', new Date().toISOString())

    // 2. Archive expired chats
    await supabase.from('chats').update({ status: 'expired' })
      .eq('status', 'active').lt('expires_at', new Date().toISOString())

    // 3. Delete old notifications
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    await supabase.from('notifications').delete()
      .lt('created_at', thirtyDaysAgo.toISOString())

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
