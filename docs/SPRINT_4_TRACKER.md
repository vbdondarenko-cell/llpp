# 📊 Sprint 4: Join Flow & Requests — Tracker
## Мета: Організатор керує учасниками

---

## 📅 Sprint Timeline
**Дата початку:** _______________  
**Дата закінчення:** _______________  
**Scrum Master:** _______________

---

## ✅ Backend Tasks

### ⚡ RPC Functions
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | `join_event()` | | ⬜ | |
| 1.2 | `accept_request()` | | ⬜ | |
| 1.3 | `decline_request()` | | ⬜ | |
| 1.4 | `leave_event()` | | ⬜ | |
| 1.5 | `get_event_requests()` | | ⬜ | |
| 1.6 | `get_my_events_status()` | | ⬜ | |

### 🔒 Validation
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | No duplicate requests | | ⬜ | |
| 2.2 | Check available spots | | ⬜ | |
| 2.3 | Check event not started | | ⬜ | |
| 2.4 | Organizer can't join own event | | ⬜ | |
| 2.5 | Owner can accept/decline | | ⬜ | |

---

## ✅ Frontend Tasks

### 🔘 Join Flow
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Join button on event detail | | ⬜ | |
| 3.2 | Join modal with message | | ⬜ | |
| 3.3 | Immediate join for open events | | ⬜ | |
| 3.4 | Leave event button | | ⬜ | |
| 3.5 | Cancel request button | | ⬜ | |

### 📋 Requests Screen
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Requests list view | | ⬜ | |
| 4.2 | Tab switching | | ⬜ | |
| 4.3 | Accept button | | ⬜ | |
| 4.4 | Decline button | | ⬜ | |
| 4.5 | Empty state | | ⬜ | |

### 📱 My Events Screen
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 5.1 | My participations list | | ⬜ | |
| 5.2 | Tab switching | | ⬜ | |
| 5.3 | Upcoming events | | ⬜ | |
| 5.4 | Past events | | ⬜ | |
| 5.5 | Navigate to event detail | | ⬜ | |

### 🔄 Status Updates
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 6.1 | Update participant count | | ⬜ | |
| 6.2 | Update join button state | | ⬜ | |
| 6.3 | Refresh after action | | ⬜ | |

---

## 🧪 Testing Checklist

### Join Flow
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Join open event | ⬜ | | |
| 2 | Join closed event (request) | ⬜ | | |
| 3 | Submit message | ⬜ | | |
| 4 | Leave event | ⬜ | | |
| 5 | Cancel request | ⬜ | | |
| 6 | Duplicate join | ⬜ | | |
| 7 | Join full event | ⬜ | | |
| 8 | Join own event | ⬜ | | |

### Organizer Flow
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | View pending requests | ⬜ | | |
| 2 | Accept request | ⬜ | | |
| 3 | Decline request | ⬜ | | |
| 4 | Update participant count | ⬜ | | |
| 5 | Accept when full | ⬜ | | |

### Edge Cases
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Join after event started | ⬜ | | |
| 2 | Leave after event started | ⬜ | | |
| 3 | Accept already approved | ⬜ | | |
| 4 | Decline already declined | ⬜ | | |

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
| Tasks Completed | 20 | |
| Join flow works | ✓ | |
| Requests screen | ✓ | |
| Bugs Found | - | |
| Bugs Fixed | - | |

---

## ✅ Definition of Done — Sprint 4

| Criteria | Status |
|----------|--------|
| `join_event()` RPC works | ⬜ |
| `accept_request()` RPC works | ⬜ |
| `decline_request()` RPC works | ⬜ |
| Join button works | ⬜ |
| Requests screen works | ⬜ |
| My Events screen works | ⬜ |
| 0 Critical Bugs | ⬜ |
| Deployed to Staging | ⬜ |

---

## 🔗 User Flow

```
User Story 1: Join Event
1. User views event → "Приєднатися" button
2. For closed events → Modal with message
3. Submit request → Status: pending
4. Organizer sees request → Accept/Decline
5. If accepted → User can see "Approved" status

User Story 2: Manage Event
1. Organizer opens event detail
2. Sees "Заявки" button with count
3. Opens requests screen
4. Sees pending requests
5. Accepts/Declines each request
6. Participant count updates
```

---

## 🎯 Sprint 4 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA | | | |
| Product | | | |

**Sprint 4 Status:** 🟡 In Progress / 🟢 Completed / 🔴 Blocked

**Notes:**
