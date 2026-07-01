// Telegram Auth Edge Function
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TelegramInitData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  hash: string
  auth_date: number
}

serve(async (req) => {
  try {
    const { initData } = await req.json()
    
    if (!initData) {
      return new Response(JSON.stringify({ error: 'No initData provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) {
      return new Response(JSON.stringify({ error: 'Invalid hash' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const userData: TelegramInitData = {
      id: parseInt(params.get('id') || '0'),
      first_name: params.get('first_name') || '',
      last_name: params.get('last_name') || undefined,
      username: params.get('username') || undefined,
      photo_url: params.get('photo_url') || undefined,
      hash: hash,
      auth_date: parseInt(params.get('auth_date') || '0')
    }

    const now = Math.floor(Date.now() / 1000)
    if (now - userData.auth_date > 86400) {
      return new Response(JSON.stringify({ error: 'Data expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { data: { users } } = await supabase.auth.admin.listUsers()
    let user = users?.find(u => u.user_metadata?.telegram_id === userData.id)
    
    if (!user) {
      const { data: newUser } = await supabase.auth.admin.createUser({
        email: `telegram_${userData.id}@linkup.app`,
        user_metadata: {
          telegram_id: userData.id,
          telegram_username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          photo_url: userData.photo_url
        }
      })
      user = newUser?.users[0]
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user?.id,
        telegram_id: userData.id,
        username: userData.username,
        first_name: userData.first_name
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
