# LinkUp Storage Configuration

## Overview
Supabase Storage for managing user-generated content.

## Buckets
| Bucket | Public | Description |
|--------|--------|-------------|
| avatars | Yes | User profile pictures |
| event-images | Yes | Event cover photos |
| chat-images | Yes | Chat message images |
| achievement-icons | Yes | Achievement badges |
| public-assets | Yes | Static assets |

## Storage Setup
Run in Supabase SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('avatars', 'avatars', true),
    ('event-images', 'event-images', true),
    ('chat-images', 'chat-images', true),
    ('achievement-icons', 'achievement-icons', true),
    ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;
```

## Usage
```typescript
const { data } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file);
```
