// Push Notifications Edge Function
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { user_id, title, body, data } = await req.json()

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { data: devices } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)

    if (!devices || devices.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }))
    }

    let sent = 0
    for (const device of devices) {
      // Integrate with FCM/APNS in production
      console.log(`Sending to ${device.platform}: ${title}`)
      sent++
    }

    return new Response(JSON.stringify({ success: true, sent, devices: devices.length }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
