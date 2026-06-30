# 📊 Sprint 9: Адмін-панель — Tracker

## Мета: Створити адмін-панель для модерації контенту та керування користувачами

---

## 📅 Sprint Timeline
**Дата початку:** _______________  
**Дата закінчення:** _______________  
**Scrum Master:** _______________

---

## ✅ Backend Tasks

### 🗄️ Database
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Таблиця `admin_logs` | | ⬜ | |
| 1.2 | Таблиця `bans` | | ⬜ | |
| 1.3 | Таблиця `reports` | | ⬜ | |
| 1.4 | Додати role до `profiles` | | ⬜ | |

### 🔒 RLS Policies
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | RLS для `admin_logs` | | ⬜ | |
| 2.2 | RLS для `bans` | | ⬜ | |
| 2.3 | RLS для `reports` | | ⬜ | |
| 2.4 | Admin-only access | | ⬜ | |

### ⚡ RPC Functions
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | `get_admin_stats()` | | ⬜ | |
| 3.2 | `get_users_list(page, limit, search)` | | ⬜ | |
| 3.3 | `get_events_list(page, limit, status)` | | ⬜ | |
| 3.4 | `get_reports_list(status)` | | ⬜ | |
| 3.5 | `get_premiums_list()` | | ⬜ | |
| 3.6 | `ban_user(user_id, reason, duration)` | | ⬜ | |
| 3.7 | `unban_user(user_id)` | | ⬜ | |
| 3.8 | `delete_event(event_id, reason)` | | ⬜ | |
| 3.9 | `delete_message(message_id)` | | ⬜ | |
| 3.10 | `resolve_report(report_id, action)` | | ⬜ | |
| 3.11 | `revoke_premium(user_id)` | | ⬜ | |
| 3.12 | Тестування RPC | | ⬜ | |

---

## ✅ Frontend Tasks

### 🎨 Layout
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | admin-panel.html | | ⬜ | |
| 1.2 | admin-layout.css | | ⬜ | |
| 1.3 | admin-app.js | | ⬜ | |

### 📊 Dashboard
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | Stats Cards | | ⬜ | |
| 2.2 | Recent Activity | | ⬜ | |
| 2.3 | Quick Actions | | ⬜ | |

### 👥 Users View
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Users Table | | ⬜ | |
| 3.2 | Search & Filters | | ⬜ | |
| 3.3 | Pagination | | ⬜ | |
| 3.4 | User Detail Modal | | ⬜ | |
| 3.5 | Ban Modal | | ⬜ | |

### 📅 Events View
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Events Table | | ⬜ | |
| 4.2 | Status Filters | | ⬜ | |
| 4.3 | Event Detail Modal | | ⬜ | |
| 4.4 | Delete Event Modal | | ⬜ | |

### 💬 Chats View
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 5.1 | Chats List | | ⬜ | |
| 5.2 | Messages View | | ⬜ | |
| 5.3 | Delete Message | | ⬜ | |

### 💎 Premium View
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 6.1 | Premiums Table | | ⬜ | |
| 6.2 | Purchase History | | ⬜ | |
| 6.3 | Revoke Modal | | ⬜ | |

### 🚨 Reports View
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 7.1 | Reports Table | | ⬜ | |
| 7.2 | Report Detail Modal | | ⬜ | |
| 7.3 | Resolve Actions | | ⬜ | |

---

## 📋 Admin Functions — Деталі

### Dashboard Stats
| Metric | Endpoint | Widget |
|--------|----------|--------|
| Total Users | `COUNT(profiles)` | Card |
| Active Today | `COUNT(where last_login > today)` | Card |
| Total Events | `COUNT(events)` | Card |
| Active Premium | `COUNT(premiums where active)` | Card |
| Open Reports | `COUNT(reports where status='open')` | Card |

### User Actions
| Action | Modal | Confirm |
|--------|-------|---------|
| View Profile | User Detail | No |
| Ban User | Ban Modal | Yes |
| Unban User | Confirm | Yes |
| Change Role | Role Modal | Yes |

### Event Actions
| Action | Modal | Confirm |
|--------|-------|---------|
| View Event | Event Detail | No |
| Delete Event | Delete Modal | Yes |
| Cancel Event | Cancel Modal | Yes |

### Report Actions
| Action | Modal | Confirm |
|--------|-------|---------|
| View Report | Report Detail | No |
| Dismiss | Confirm | Yes |
| Warn User | Warn Modal | Yes |
| Ban User | Ban Modal | Yes |
| Delete Content | Delete Modal | Yes |

---

## 🧪 Testing Checklist

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Admin login/access | ⬜ | |
| 2 | View dashboard | ⬜ | |
| 3 | Search users | ⬜ | |
| 4 | Ban user | ⬜ | |
| 5 | Unban user | ⬜ | |
| 6 | Delete event | ⬜ | |
| 7 | Delete message | ⬜ | |
| 8 | Resolve report | ⬜ | |
| 9 | Revoke premium | ⬜ | |
| 10 | View audit logs | ⬜ | |
| 11 | Non-admin access denied | ⬜ | |

---

## 🐛 Bugs Found

| # | Bug | Severity | Status | Assignee | Fixed |
|---|-----|----------|--------|----------|-------|
| 1 | | | | | |
| 2 | | | | | |

---

## 📈 Daily Standups

### Day 1 (Понеділок)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

### Day 2 (Вівторок)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

### Day 3 (Середа)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

### Day 4 (Четвер)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

---

## 📊 Sprint Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Tasks Completed | 25 | |
| Bugs Found | - | |
| Bugs Fixed | - | |
| Velocity | - | |

---

## ✅ Definition of Done — Sprint 9

| Criteria | Status |
|----------|--------|
| Dashboard працює | ⬜ |
| Users CRUD працює | ⬜ |
| Events CRUD працює | ⬜ |
| Reports працює | ⬜ |
| Premium management працює | ⬜ |
| Audit logging працює | ⬜ |
| Security checks passed | ⬜ |
| 0 Critical Bugs | ⬜ |
| Code Review Passed | ⬜ |

---

## 📝 Retrospective Notes

### Що пройшло добре:
-

### Що можна покращити:
-

### Action Items для наступного Sprint:
-

---

## 🎯 Sprint 9 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA | | | |
| Product | | | |

**Sprint 9 Status:** 🟡 In Progress / 🟢 Completed / 🔴 Blocked

**Notes:**
