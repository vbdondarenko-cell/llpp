# 📊 Sprint 10: Закрита Alpha — Tracker

## Мета: Провести закритое Alpha-тестування LinkUp

---

## 📅 Sprint Timeline
**Дата початку:** _______________  
**Дата закінчення:** _______________  
**QA Lead:** _______________

---

## ✅ Backend Setup Tasks

### 🗄️ Database
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Створити всі таблиці | | ⬜ | |
| 1.2 | Налаштувати indexes | | ⬜ | |
| 1.3 | Створити triggers | | ⬜ | |

### 🔒 RLS Policies
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | profiles | | ⬜ | |
| 2.2 | events | | ⬜ | |
| 2.3 | messages | | ⬜ | |
| 2.4 | event_requests | | ⬜ | |
| 2.5 | achievements | | ⬜ | |
| 2.6 | premiums | | ⬜ | |

### ⚡ RPC Functions
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | get_profile_full() | | ⬜ | |
| 3.2 | update_profile() | | ⬜ | |
| 3.3 | get_user_stats() | | ⬜ | |
| 3.4 | create_event() | | ⬜ | |
| 3.5 | request_to_join() | | ⬜ | |
| 3.6 | approve_request() | | ⬜ | |
| 3.7 | send_message() | | ⬜ | |
| 3.8 | get_messages() | | ⬜ | |
| 3.9 | check_achievements() | | ⬜ | |
| 3.10 | purchase_premium() | | ⬜ | |

### 🔄 Realtime
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Messages subscription | | ⬜ | |
| 4.2 | Requests subscription | | ⬜ | |
| 4.3 | Achievements subscription | | ⬜ | |
| 4.4 | Events subscription | | ⬜ | |

---

## ✅ Frontend Tasks

### 🔐 Authentication
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Telegram WebApp init | | ⬜ | |
| 1.2 | Data validation | | ⬜ | |
| 1.3 | Session handling | | ⬜ | |
| 1.4 | Error handling | | ⬜ | |

### 🗺️ Map
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | MapBox integration | | ⬜ | |
| 2.2 | Geolocation | | ⬜ | |
| 2.3 | Event markers | | ⬜ | |
| 2.4 | Filters | | ⬜ | |

### 📅 Events
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | List view | | ⬜ | |
| 3.2 | Detail view | | ⬜ | |
| 3.3 | Create form | | ⬜ | |
| 3.4 | Filters | | ⬜ | |

### 📋 Requests
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Submit request | | ⬜ | |
| 4.2 | View requests | | ⬜ | |
| 4.3 | Approve/Reject | | ⬜ | |

### 💬 Chats
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 5.1 | Chat list | | ⬜ | |
| 5.2 | Messages view | | ⬜ | |
| 5.3 | Send message | | ⬜ | |
| 5.4 | 6-hour timer | | ⬜ | |
| 5.5 | Archive | | ⬜ | |

### ⭐ Premium
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 6.1 | Purchase flow | | ⬜ | |
| 6.2 | Telegram Stars | | ⬜ | |
| 6.3 | PRO badge | | ⬜ | |

### 🏆 Achievements
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 7.1 | Progress tracking | | ⬜ | |
| 7.2 | Unlock logic | | ⬜ | |
| 7.3 | Toast notifications | | ⬜ | |

### 🔔 Push Notifications
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 8.1 | Permission request | | ⬜ | |
| 8.2 | Push setup | | ⬜ | |
| 8.3 | Notification types | | ⬜ | |

---

## 🧪 Testing Checklist

### Functional Tests
| # | Feature | Test Case | Status | Notes |
|---|---------|-----------|--------|-------|
| 1 | Telegram Login | Успішний вхід | ⬜ | |
| 2 | Telegram Login | Невалідні дані | ⬜ | |
| 3 | Map | Завантаження карти | ⬜ | |
| 4 | Map | Геолокація | ⬜ | |
| 5 | Map | Маркери подій | ⬜ | |
| 6 | Events | Перегляд списку | ⬜ | |
| 7 | Events | Створення | ⬜ | |
| 8 | Events | Фільтри | ⬜ | |
| 9 | Requests | Подача | ⬜ | |
| 10 | Requests | Схвалення | ⬜ | |
| 11 | Requests | Відхилення | ⬜ | |
| 12 | Chat | Відправка | ⬜ | |
| 13 | Chat | Отримання | ⬜ | |
| 14 | Chat | Realtime | ⬜ | |
| 15 | Premium | Покупка | ⬜ | |
| 16 | Achievements | Розблокування | ⬜ | |
| 17 | Push | Дозвіл | ⬜ | |
| 18 | Push | Отримання | ⬜ | |

### Security Tests
| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | RLS - User isolation | ⬜ | |
| 2 | RLS - Admin access | ⬜ | |
| 3 | Auth - Token validation | ⬜ | |
| 4 | Rate limiting | ⬜ | |

### Performance Tests
| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Load time < 3s | ⬜ | |
| 2 | Map responsiveness | ⬜ | |
| 3 | Chat latency < 500ms | ⬜ | |

---

## 🐛 Bugs Found

| # | Bug | Severity | Status | Assignee | Fixed |
|---|-----|----------|--------|----------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |

---

## 👥 Alpha Testers

| # | Tester | Device | OS | Status |
|---|--------|--------|-----|--------|
| 1 | | | | ⬜ |
| 2 | | | | ⬜ |
| 3 | | | | ⬜ |
| 4 | | | | ⬜ |
| 5 | | | | ⬜ |
| 6 | | | | ⬜ |
| 7 | | | | ⬜ |
| 8 | | | | ⬜ |
| 9 | | | | ⬜ |
| 10 | | | | ⬜ |

---

## 📊 Test Results

### Devices Tested
| Device | Browser | Telegram | Status |
|--------|---------|----------|--------|
| | | | ⬜ |
| | | | ⬜ |
| | | | ⬜ |

### Metrics
| Metric | Target | Actual |
|--------|--------|--------|
| Critical Bugs | 0 | |
| Major Bugs | < 5 | |
| Minor Bugs | < 20 | |
| Test Coverage | 100% | |
| Alpha Users | 20-50 | |

---

## 📈 Daily Standups

### Day 1
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

### Day 2
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

### Day 3
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

### Day 4
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

### Day 5
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокеры:**  
- 

---

## ✅ Definition of Done — Sprint 10

| Criteria | Status |
|----------|--------|
| Backend розгорнуто | ⬜ |
| RLS налаштовано | ⬜ |
| RPC функції працюють | ⬜ |
| Realtime підписки працюють | ⬜ |
| Push notifications працюють | ⬜ |
| 20+ тестувальників | ⬜ |
| 0 Critical Bugs | ⬜ |
| < 5 Major Bugs | ⬜ |

---

## 📝 Retrospective Notes

### Що пройшло добре:
-

### Що можна покращити:
-

### Action Items для наступного Sprint:
-

---

## 🎯 Sprint 10 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA Lead | | | |
| Product | | | |

**Sprint 10 Status:** 🟡 In Progress / 🟢 Completed / 🔴 Blocked

**Notes:**
