# LinkUp RPC Functions Reference

## Authentication

All functions require authentication via Supabase client (`auth.uid()`).

## Profile Functions

### get_profile(p_user_id?)
```typescript
// Get current user's profile
const profile = await supabase.rpc('get_profile');

// Get specific user's profile
const profile = await supabase.rpc('get_profile', { p_user_id: 'uuid' });

// Returns: JSONB
{
  id, user_id, username, display_name, first_name, last_name, bio, avatar_url,
  latitude, longitude, show_online, show_events, allow_messages, language_code,
  notifications_enabled, is_suspended, is_banned, is_admin, is_premium,
  interests: [{id, name, icon, color}],
  achievements_count, events_created, events_attended, last_seen_at, created_at
}
```

### update_profile(params)
```typescript
await supabase.rpc('update_profile', {
  p_display_name: 'John Doe',
  p_bio: 'Hello world',
  p_avatar_url: 'https://...',
  p_latitude: 50.4501,
  p_longitude: 30.5234,
  p_show_online: true,
  p_show_events: true,
  p_allow_messages: true,
  p_language_code: 'uk'
});
```

## Interests Functions

### get_interests()
```typescript
const interests = await supabase.rpc('get_interests');
// Returns: [{id, name, name_en, icon, color}]
```

### save_user_interests(p_interest_ids)
```typescript
await supabase.rpc('save_user_interests', {
  p_interest_ids: ['uuid1', 'uuid2', 'uuid3']
});
```

### get_user_interests()
```typescript
const interests = await supabase.rpc('get_user_interests');
```

## Event Functions

### create_event(params)
```typescript
await supabase.rpc('create_event', {
  p_title: 'Coffee Meetup',
  p_description: 'Lets chat over coffee',
  p_category: 'Socialization',
  p_latitude: 50.4501,
  p_longitude: 30.5234,
  p_address: 'Main Street 123',
  p_city: 'Kyiv',
  p_starts_at: '2024-01-15T14:00:00Z',
  p_ends_at: '2024-01-15T16:00:00Z',
  p_max_participants: 10,
  p_is_private: false,
  p_photo_url: null
});
// Returns: {success, event_id}
```

### update_event(p_event_id, params)
```typescript
await supabase.rpc('update_event', {
  p_event_id: 'uuid',
  p_title: 'Updated Title',
  p_description: 'Updated description'
});
```

### delete_event(p_event_id)
```typescript
await supabase.rpc('delete_event', { p_event_id: 'uuid' });
```

### get_events_nearby(params)
```typescript
const events = await supabase.rpc('get_events_nearby', {
  p_latitude: 50.4501,
  p_longitude: 30.5234,
  p_radius_km: 10,
  p_limit: 50,
  p_offset: 0,
  p_category: null,
  p_starting_from: null
});
// Returns: {success, events: [...], total}
```

### get_event(p_event_id)
```typescript
const event = await supabase.rpc('get_event', { p_event_id: 'uuid' });
// Returns: {success, event: {...}}
```

## Event Requests

### join_event(p_event_id, p_message?)
```typescript
await supabase.rpc('join_event', {
  p_event_id: 'uuid',
  p_message: 'Would love to join!'
});
```

### leave_event(p_event_id)
```typescript
await supabase.rpc('leave_event', { p_event_id: 'uuid' });
```

### accept_request(p_request_id)
```typescript
await supabase.rpc('accept_request', { p_request_id: 'uuid' });
```

### decline_request(p_request_id)
```typescript
await supabase.rpc('decline_request', { p_request_id: 'uuid' });
```

## Chat Functions

### get_chats()
```typescript
const chats = await supabase.rpc('get_chats');
// Returns: [{id, event_id, name, last_message, unread_count}]
```

### archive_chat(p_chat_id)
```typescript
await supabase.rpc('archive_chat', { p_chat_id: 'uuid' });
```

## Message Functions

### send_message(params)
```typescript
await supabase.rpc('send_message', {
  p_chat_id: 'uuid',
  p_content: 'Hello everyone!',
  p_content_type: 'text', // text, image, location, event, system
  p_metadata: {},
  p_reply_to_id: null
});
```

### get_messages(params)
```typescript
const messages = await supabase.rpc('get_messages', {
  p_chat_id: 'uuid',
  p_limit: 50,
  p_before: null // timestamp for pagination
});
```

## Premium Functions

### activate_premium(p_tier, p_duration_days?)
```typescript
await supabase.rpc('activate_premium', {
  p_tier: 'premium', // none, basic, premium, vip
  p_duration_days: 30
});
```

### expire_premium()
```typescript
// System function - runs via cron
await supabase.rpc('expire_premium');
```

### get_premium_status()
```typescript
const status = await supabase.rpc('get_premium_status');
// Returns: {is_active, tier, started_at, expires_at, auto_renew}
```

## Notifications

### get_notifications(params?)
```typescript
const { data } = await supabase.rpc('get_notifications', {
  p_limit: 50,
  p_offset: 0,
  p_unread_only: false
});
// Returns: {success, notifications: [...], unread_count}
```

### mark_notification_read(p_notification_id)
```typescript
await supabase.rpc('mark_notification_read', { p_notification_id: 'uuid' });
```

### mark_all_notifications_read()
```typescript
await supabase.rpc('mark_all_notifications_read');
```

## Friends

### send_friend_request(p_addressee_id)
```typescript
await supabase.rpc('send_friend_request', { p_addressee_id: 'uuid' });
```

### accept_friend_request(p_request_id)
```typescript
await supabase.rpc('accept_friend_request', { p_request_id: 'uuid' });
```

### get_friends()
```typescript
const friends = await supabase.rpc('get_friends');
```

## Reports

### create_report(params)
```typescript
await supabase.rpc('create_report', {
  p_type: 'user', // user, event, message
  p_reported_user_id: 'uuid',
  p_reported_event_id: null,
  p_reason: 'spam',
  p_description: 'This user is spamming...'
});
```

## Admin Functions

### get_dashboard_statistics()
```typescript
const stats = await supabase.rpc('get_dashboard_statistics');
// Returns: {success, statistics: {...}, daily_stats: [...]}
```

### admin_get_users(params?)
### admin_suspend_user(p_user_id, p_reason?, p_until?)
### admin_unsuspend_user(p_user_id)
### admin_ban_user(p_user_id, p_reason?)
### admin_unban_user(p_user_id)
### admin_get_events(params?)
### admin_hide_event(p_event_id)
### admin_unhide_event(p_event_id)
### admin_delete_event(p_event_id, p_reason?)
### admin_get_reports(params?)
### admin_resolve_report(p_report_id, p_notes?)
### admin_get_audit_logs(params?)

## Helper Functions

### is_admin()
```typescript
// Returns boolean - checks if current user is admin
const isAdmin = await supabase.rpc('is_admin');
```
