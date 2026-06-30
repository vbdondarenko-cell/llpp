# 📊 Sprint 5: Chat System — Tracker
## Мета: Автоматичний чат після схвалення заявки

---

## 📅 Sprint Timeline
**Дата початку:** _______________  
**Дата закінчення:** _______________  
**Scrum Master:** _______________

---

## ✅ Backend Tasks

### 🗄️ Tables
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Create `chats` table | | ⬜ | |
| 1.2 | Create `chat_participants` table | | ⬜ | |
| 1.3 | Create `messages` table | | ⬜ | |
| 1.4 | Add indexes | | ⬜ | |
| 1.5 | Configure RLS policies | | ⬜ | |

### ⚡ RPC Functions
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | `create_chat()` | | ⬜ | |
| 2.2 | `send_message()` | | ⬜ | |
| 2.3 | `get_my_chats()` | | ⬜ | |
| 2.4 | `get_chat_messages()` | | ⬜ | |
| 2.5 | `archive_expired_chats()` | | ⬜ | |
| 2.6 | Test all functions | | ⬜ | |

### 🔄 Realtime
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Enable realtime on messages | | ⬜ | |
| 3.2 | Enable realtime on chats | | ⬜ | |
| 3.3 | Create expiration trigger | | ⬜ | |
| 3.4 | Test realtime subscription | | ⬜ | |

---

## ✅ Frontend Tasks

### 💬 Chats List Screen
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Screen structure | | ⬜ | |
| 4.2 | Chat items list | | ⬜ | |
| 4.3 | Active/Archived sections | | ⬜ | |
| 4.4 | Empty state | | ⬜ | |
| 4.5 | Realtime updates | | ⬜ | |
| 4.6 | Timer display | | ⬜ | |

### 💬 Chat Room Screen
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 5.1 | Screen structure | | ⬜ | |
| 5.2 | Messages list | | ⬜ | |
| 5.3 | Message bubbles | | ⬜ | |
| 5.4 | Message input | | ⬜ | |
| 5.5 | Send button | | ⬜ | |
| 5.6 | Auto-scroll | | ⬜ | |

### 🔔 Realtime Integration
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 6.1 | Subscribe to messages | | ⬜ | |
| 6.2 | New message append | | ⬜ | |
| 6.3 | Status change handler | | ⬜ | |
| 6.4 | Haptic feedback | | ⬜ | |

### ⏱️ Timer & Archive
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 7.1 | 6-hour countdown | | ⬜ | |
| 7.2 | Timer display | | ⬜ | |
| 7.3 | Urgent state (< 1 hour) | | ⬜ | |
| 7.4 | Archive notification | | ⬜ | |
| 7.5 | Read-only mode | | ⬜ | |

---

## 🧪 Testing Checklist

### Chat Creation
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Auto-create on Accept | ⬜ | | |
| 2 | Create once per event | ⬜ | | |
| 3 | Add all participants | ⬜ | | |
| 4 | System message created | ⬜ | | |
| 5 | Expires_at calculated | ⬜ | | |

### Messaging
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Send text message | ⬜ | | |
| 2 | Real-time delivery | ⬜ | | |
| 3 | Message appears instantly | ⬜ | | |
| 4 | Multiple users send | ⬜ | | |
| 5 | Empty message blocked | ⬜ | | |

### Timer
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Timer starts on create | ⬜ | | |
| 2 | Timer counts down | ⬜ | | |
| 3 | < 1 hour urgent state | ⬜ | | |
| 4 | Timer expires | ⬜ | | |
| 5 | Archive happens | ⬜ | | |

### Archive
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Read-only after expire | ⬜ | | |
| 2 | System message shown | ⬜ | | |
| 3 | Moves to Archived tab | ⬜ | | |
| 4 | Delete archived chat | ⬜ | | |

---

## 🐛 Bugs Found

| # | Bug | Severity | Status | Assignee | Fixed |
|---|-----|----------|--------|----------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## 📈 Daily Standups

### Day 1 (Понеділок)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

### Day 2 (Вівторок)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

### Day 3 (Середа)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

### Day 4 (Четвер)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

### Day 5 (П'ятниця)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

---

## 📊 Sprint Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Tasks Completed | 25 | |
| Real-time latency | < 500ms | |
| Bugs Found | - | |
| Bugs Fixed | - | |

---

## ✅ Definition of Done — Sprint 5

| Criteria | Status |
|----------|--------|
| Tables created | ⬜ |
| RPC functions work | ⬜ |
| Realtime works | ⬜ |
| Chats List Screen | ⬜ |
| Chat Room Screen | ⬜ |
| Timer counts down | ⬜ |
| Auto-archive works | ⬜ |
| 0 Critical Bugs | ⬜ |
| Deployed to Staging | ⬜ |

---

## 🔄 Complete Flow

```
Accept Request
    ↓
create_chat() called
    ↓
Chat + Participants created
System message inserted
    ↓
expires_at = NOW() + 6 hours
    ↓
Supabase Realtime enabled
    ↓
[Chat Active]
Participants receive messages instantly
    ↓
Timer countdown in UI
    ↓
expires_at < NOW()
    ↓
Trigger fires
status = 'archived'
System message: "Чат закрито"
    ↓
[Chat Read-only]
```

---

## 🎯 Sprint 5 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA | | | |
| Product | | | |

**Sprint 5 Status:** 🟡 In Progress / 🟢 Completed / 🔴 Blocked

**Notes:**
