// Telegram Auth Edge Function
// Handles Telegram WebApp authentication

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TG_BOT_TOKEN = Deno.env.get('TG_BOT_TOKEN') || ''

interface TelegramInitData {
  query_id?: string
  user?: {
    id: number
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
    is_premium?: boolean
  }
  auth_date: string
  hash: string
}

function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    params.delete('hash')
    
    // Sort parameters
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    
    // Create HMAC-SHA256
    const secretKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const hashedValue = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      new TextEncoder().encode(botToken)
    )
    
    const secret = await crypto.subtle.importKey(
      'raw',
      hashedValue,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      secret,
      new TextEncoder().encode(dataCheckString)
    )
    
    const calculatedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return calculatedHash === hash
  } catch (error) {
    console.error('Validation error:', error)
    return false
  }
}

Deno.serve(async (req) => {
  try {
    const { initData } = await req.json()
    
    if (!initData) {
      return new Response(
        JSON.stringify({ error: 'initData is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate initData
    const isValid = validateTelegramInitData(initData, TG_BOT_TOKEN)
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid initData' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Parse initData
    const params = new URLSearchParams(initData)
    const userData = params.get('user')
    const authDate = parseInt(params.get('auth_date') || '0')
    
    // Check auth_date is not too old (24 hours)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) {
      return new Response(
        JSON.stringify({ error: 'initData expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const user = JSON.parse(userData || '{}')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Find or create user
    let profile = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', user.id)
      .single()
    
    if (!profile.data) {
      // Create new user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: `tg_${user.id}@linkup.app`,
        email_confirm: true,
        user_metadata: {
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username
        }
      })
      
      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      // Create profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authUser.user.id,
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        })
        .select()
        .single()
      
      if (profileError) {
        return new Response(
          JSON.stringify({ error: profileError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      profile = { data: newProfile }
    }
    
    // Create session
    const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.data.user_id ? 
        (await supabase.auth.admin.getUserById(profile.data.user_id)).data.user.email :
        `tg_${user.id}@linkup.app`
    })
    
    // Generate custom token for Telegram users
    const { data: customToken, error: tokenError } = await supabase.auth.admin.createCustomToken(
      profile.data.user_id,
      {
        telegram_id: user.id,
        username: user.username
      }
    )
    
    if (tokenError) {
      return new Response(
        JSON.stringify({ error: tokenError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: profile.data.id,
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name
        },
        session: {
          access_token: customToken,
          refresh_token: customToken
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Telegram auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
