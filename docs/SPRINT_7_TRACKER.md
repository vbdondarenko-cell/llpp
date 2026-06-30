# 📊 Sprint 7: Досягнення — Tracker

## Мета: Система досягнень для мотивації користувачів

---

## 📅 Sprint Timeline
**Дата початку:** _______________  
**Дата закінчення:** _______________  
**Scrum Master:** _______________

---

## ✅ Backend Tasks

### 🗄️ Database Schema
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Створити таблицю `achievements` | | ⬜ | |
| 1.2 | Створити таблицю `user_achievements` | | ⬜ | |
| 1.3 | Додати indexes | | ⬜ | |

### 🔒 RLS Policies
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | RLS для `achievements` | | ⬜ | |
| 2.2 | RLS для `user_achievements` | | ⬜ | |

### ⚡ RPC Functions
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | `get_user_achievements()` | | ⬜ | |
| 3.2 | `check_event_achievements(user_id)` | | ⬜ | |
| 3.3 | `check_message_achievements(user_id)` | | ⬜ | |
| 3.4 | `unlock_achievement(user_id, achievement_id)` | | ⬜ | |
| 3.5 | Тестування RPC функцій | | ⬜ | |

### 🔔 Triggers
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Trigger на `events` INSERT | | ⬜ | |
| 4.2 | Trigger на `messages` INSERT | | ⬜ | |
| 4.3 | Trigger на `premium_purchases` INSERT | | ⬜ | |
| 4.4 | Trigger на `friendships` INSERT | | ⬜ | |

---

## ✅ Frontend Tasks

### 🎨 UI Components
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Оновити achievements grid (7 items) | | ✅ | |
| 1.2 | Progress counter (X/7) | | ✅ | |
| 1.3 | Achievement Badge styles | | ⬜ | |
| 1.4 | Notification Toast component | | ✅ | |

### 🔌 Integrations
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | Підключити Supabase SDK | | ⬜ | |
| 2.2 | `fetchUserAchievements()` | | ⬜ | |
| 2.3 | Real-time updates (subscriptions) | | ⬜ | |
| 2.4 | Error handling | | ⬜ | |

### 🎬 Animations
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Unlock animation | | ⬜ | |
| 3.2 | Progress bar animation | | ⬜ | |
| 3.3 | Notification slide-in/out | | ⬜ | |

---

## 📋 Досягнення — Деталі

| ID | Назва | Іконка | Trigger Event | Backend Check |
|----|-------|--------|---------------|---------------|
| 1 | Перша подія | 🎯 | events INSERT | COUNT >= 1 |
| 2 | 10 подій | 🔥 | events INSERT | COUNT >= 10 |
| 3 | 50 подій | 🚀 | events INSERT | COUNT >= 50 |
| 4 | 100 подій | 👑 | events INSERT | COUNT >= 100 |
| 5 | Перший друг | 🤝 | friendships INSERT | COUNT >= 1 |
| 6 | Перший Premium | ⭐ | premium_purchases INSERT | COUNT >= 1 |
| 7 | 100 повідомлень | 💬 | messages INSERT | COUNT >= 100 |

---

## 🧪 Testing Checklist

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Створити подію → отримати "Перша подія" | ⬜ | |
| 2 | Створити 10 подій → отримати "10 подій" | ⬜ | |
| 3 | Купити Premium → отримати "Перший Premium" | ⬜ | |
| 4 | Написати 100 повідомлень → отримати "100 повідомлень" | ⬜ | |
| 5 | Notification з'являється при розблокуванні | ⬜ | |
| 6 | Progress counter оновлюється | ⬜ | |
| 7 | Locked досягнення виглядають сірими | ⬜ | |
| 8 | Unlocked досягнення з підсвіткою | ⬜ | |

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

---

## 📊 Sprint Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Tasks Completed | 15 | |
| Bugs Found | - | |
| Bugs Fixed | - | |
| Velocity | - | |

---

## ✅ Definition of Done — Sprint 7

| Criteria | Status |
|----------|--------|
| Всі 7 досягнень працюють | ⬜ |
| Backend функції протестовані | ⬜ |
| Frontend інтегровано з Supabase | ⬜ |
| Notification анімація працює | ⬜ |
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

## 🎯 Sprint 7 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA | | | |
| Product | | | |

**Sprint 7 Status:** 🟡 In Progress / 🟢 Completed / 🔴 Blocked

**Notes:**
