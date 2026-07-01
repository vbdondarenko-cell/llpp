# LinkUp Database Schema

## Overview

Complete database schema for LinkUp v1.0 with 25+ tables, comprehensive indexes, and Row Level Security (RLS) enabled on all tables.

## Tables

### Core Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `profiles` | User profiles with Telegram integration | user_id, telegram_id, location, preferences |
| `interests` | Available interests (24 seeded) | name, icon, color, sort_order |
| `user_interests` | User-interest relationships | user_id, interest_id |
| `event_categories` | Event categories (12 seeded) | name, icon, color, emoji |
| `events` | Events with location data | title, location, organizer, status |

### Event Management

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `event_participants` | Event participation records | event_id, user_id, role |
| `event_requests` | Join requests | event_id, user_id, status |

### Social

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `friendships` | Friend relationships | requester_id, addressee_id, status |
| `blocks` | Blocked users | blocker_id, blocked_id |

### Communication

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `chats` | Chat rooms | event_id, status, expires_at |
| `chat_members` | Chat membership | chat_id, user_id, role |
| `messages` | Messages with rich content | chat_id, sender_id, content_type |

### Notifications

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `notifications` | User notifications | user_id, type, is_read |
| `notification_preferences` | Per-user preferences | user_id, notification types |

### Gamification

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `achievements` | Achievement definitions (18 seeded) | name, points, tier |
| `user_achievements` | Earned achievements | user_id, achievement_id |

### Premium

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `premium` | User premium status | user_id, tier, expires_at |
| `premium_transactions` | Purchase history | user_id, tier, amount |
| `premium_plans` | Plan definitions | tier, price_monthly, features |

### Platform

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `devices` | Push notification devices | user_id, platform, device_token |
| `reports` | User/event reports | reporter_id, type, status |
| `app_settings` | Application configuration | key, value, is_public |
| `admin_users` | Admin accounts | user_id, role |
| `audit_logs` | Action audit trail | user_id, action, entity_type |

## Indexes

### Location Indexes (PostGIS)
```
idx_events_location - GiST index on ST_MakePoint(longitude, latitude)
idx_profiles_location - B-tree on (latitude, longitude)
```

### Common Indexes
- `idx_profiles_telegram_id` - Telegram user lookup
- `idx_events_organizer` - Events by organizer
- `idx_events_status` - Active events filter
- `idx_events_category` - Events by category
- `idx_messages_chat` - Messages by chat
- `idx_notifications_user` - User notifications

## Enums

| Enum | Values |
|------|--------|
| `event_status` | active, cancelled, completed, hidden, expired |
| `request_status` | pending, accepted, rejected, cancelled |
| `chat_status` | active, archived, expired, deleted |
| `notification_type` | event, chat, friend, achievement, system, premium, announcement |
| `premium_tier` | none, basic, premium, vip |
| `admin_role` | admin, moderator, viewer |

## Triggers

### Automatic Updates
- `handle_updated_at` - Updates `updated_at` on any row change
- `on_auth_user_created` - Creates profile and notification_preferences on signup
- `update_event_count_on_request` - Maintains `current_participants` count

## Seed Data

### Interests (24)
Food, Coffee, Music, Movies, Concerts, Art, Gaming, Books, Sports, Fitness, Photography, Technology, Travel, Nature, Cycling, Running, Board Games, Languages, Business, Networking, Volunteering, Dancing, Yoga, Cars

### Event Categories (12)
Socialization, Sports, Food & Drinks, Music, Art, Technology, Travel, Education, Gaming, Nature, Business, Other

### Achievements (18)
Bronze, Silver, Gold, Platinum, Diamond tiers with various requirements

### Premium Plans (3)
Basic (29.99/299.99), Premium (79.99/799.99), VIP (149.99/1499.99)

## Diagram

```
┌─────────────┐
│  auth.users │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────────┐
│  profiles   │────▶│ user_interests  │──▶┌──────────┐
└─────────────┘     └─────────────────┘    │interests │
       │                                     └──────────┘
       ▼
┌─────────────┐     ┌─────────────────┐
│   events    │────▶│event_participants│
└─────────────┘     └─────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌─────────────────┐
│    chats    │────▶│ chat_members    │
└─────────────┘     └─────────────────┘
       │
       ▼
┌─────────────┐
│  messages   │
└─────────────┘
```

## Extensions

- `uuid-ossp` - UUID generation
- `postgis` - Geospatial queries
- `pg_trgm` - Fuzzy text search
