# LinkUp Row Level Security Policies

## Overview

All tables have Row Level Security (RLS) enabled. This document describes the access policies for each table.

## Policy Summary

### Profiles (`public.profiles`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Public | Anyone can view profiles |
| INSERT | Authenticated | Users can only insert their own profile |
| UPDATE | Owner | Users can only update their own profile |

```sql
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
```

### Interests (`public.interests`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Active interests | Anyone can view active interests |

### User Interests (`public.user_interests`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Owner | Users can only view their own interests |
| ALL | Owner | Users can manage their own interests |

### Events (`public.events`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Active | Anyone can view active, non-hidden events |
| SELECT | Owner | Organizers can view their events |
| INSERT | Authenticated | Authenticated users can create events |
| UPDATE | Owner | Only organizers can update events |
| DELETE | Owner | Only organizers can delete events |

```sql
CREATE POLICY "Active events viewable by everyone" ON public.events FOR SELECT 
    USING (status = 'active' AND is_hidden = FALSE);
CREATE POLICY "Organizers can view their events" ON public.events FOR SELECT 
    USING (organizer_id = auth.uid());
CREATE POLICY "Users can create events" ON public.events FOR INSERT 
    WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Organizers can update their events" ON public.events FOR UPDATE 
    USING (organizer_id = auth.uid());
CREATE POLICY "Organizers can delete their events" ON public.events FOR DELETE 
    USING (organizer_id = auth.uid());
```

### Event Requests (`public.event_requests`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Participants | User or event organizer can view |
| INSERT | Authenticated | Users can create requests |
| UPDATE | Organizer | Only event organizer can accept/reject |

### Event Participants (`public.event_participants`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Participants | User or event organizer |
| INSERT | Authenticated | Users can join events |
| UPDATE | Self | Users can update their membership |
| DELETE | Self or Organizer | User or organizer can remove |

### Chats (`public.chats`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Members | Only chat members can view |

### Chat Members (`public.chat_members`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Participants | Chat members |
| INSERT | Authenticated | Users can join chats |

### Messages (`public.messages`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Chat Members | Only chat members can view |
| INSERT | Authenticated | Users can send messages |
| UPDATE | Self | Users can edit/delete own messages |

### Notifications (`public.notifications`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Owner | Users can only view their notifications |
| INSERT | System | System can create notifications |
| UPDATE | Owner | Users can update their notifications |

### Achievements (`public.achievements`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Active | Anyone can view active achievements |

### User Achievements (`public.user_achievements`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Owner | Users can view their achievements |
| INSERT | System | System awards achievements |
| UPDATE | Owner | Users can update progress |

### Premium (`public.premium`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Owner | Users can view their premium status |
| ALL | System | System manages premium |

### Devices (`public.devices`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Owner | Users can view their devices |
| ALL | Owner | Users manage their devices |

### Blocks (`public.blocks`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Blocker | Only blocker can see blocks |
| INSERT | Authenticated | Users can block others |
| DELETE | Blocker | Users can unblock |

### Reports (`public.reports`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Admins | Only admins can view reports |
| INSERT | Authenticated | Users can create reports |
| UPDATE | Admins | Admins can manage reports |

### Admin Users (`public.admin_users`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Admins | Only admins can view admin list |
| ALL | System | System manages admin users |

### Audit Logs (`public.audit_logs`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Admins | Only admins can view logs |
| INSERT | System | System creates logs |

### Friendships (`public.friendships`)

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Participants | Only involved users |
| INSERT | Authenticated | Users can send requests |
| UPDATE | Participants | Users can accept/reject |

## Security Best Practices

1. **Never trust client data** - All policies use `auth.uid()` for user identification
2. **Minimal permissions** - Each policy grants the minimum required access
3. **Ownership validation** - Complex policies check both direct ownership and related entity ownership
4. **RLS always ON** - All tables have RLS enabled by default
