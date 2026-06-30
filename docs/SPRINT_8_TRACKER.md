# 📊 Sprint 8: Профіль — Tracker

## Мета: Покращити профіль користувача з фото, статистикою, рейтингом та досягненнями

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
| 1.1 | Розширити `profiles` (bio, city, cover_url) | | ⬜ | |
| 1.2 | Створити `user_stats` table | | ⬜ | |
| 1.3 | Створити Storage bucket `avatars` | | ⬜ | |
| 1.4 | Створити Storage bucket `covers` | | ⬜ | |
| 1.5 | Додати indexes | | ⬜ | |

### 🔒 RLS Policies
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | RLS для `profiles` | | ⬜ | |
| 2.2 | RLS для `user_stats` | | ⬜ | |
| 2.3 | RLS для Storage | | ⬜ | |

### ⚡ RPC Functions
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | `get_profile_full(user_id)` | | ⬜ | |
| 3.2 | `get_profile_stats(user_id)` | | ⬜ | |
| 3.3 | `update_profile(user_id, data)` | | ⬜ | |
| 3.4 | `upload_avatar(user_id, file)` | | ⬜ | |
| 3.5 | `get_user_rating(user_id)` | | ⬜ | |
| 3.6 | Тестування RPC | | ⬜ | |

### 🔔 Triggers
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Trigger оновлення stats | | ⬜ | |
| 4.2 | Trigger перерахунку рейтингу | | ⬜ | |

---

## ✅ Frontend Tasks

### 🎨 UI Components
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Profile Header (cover, avatar, info) | | ⬜ | |
| 1.2 | Stats Overview Cards | | ⬜ | |
| 1.3 | Achievements Section (Sprint 7) | | ✅ | |
| 1.4 | Interests Section | | ✅ | |
| 1.5 | Premium Card | | ⬜ | |
| 1.6 | Menu Items | | ✅ | |

### 📝 Modals
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | Edit Profile Modal | | ⬜ | |
| 2.2 | Achievements Expanded Modal | | ⬜ | |
| 2.3 | Photo Upload Modal | | ⬜ | |

### 🔌 Integrations
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Підключити Supabase SDK | | ⬜ | |
| 3.2 | `fetchProfile()` | | ⬜ | |
| 3.3 | `updateProfile()` | | ⬜ | |
| 3.4 | `uploadPhoto()` | | ⬜ | |
| 3.5 | Real-time profile updates | | ⬜ | |

### 🎬 Animations
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Profile header parallax | | ⬜ | |
| 4.2 | Stats counter animation | | ⬜ | |
| 4.3 | Modal transitions | | ⬜ | |

---

## 📋 Profile Components — Деталі

### 1. 📷 Фото
| Елемент | Опис |
|---------|------|
| Avatar | 100x100px, border-radius: 50% |
| Cover | 100% width, height: 120px |
| Change Avatar | Кнопка на аватарі |
| Change Cover | Кнопка на cover |

### 2. ⭐ Рейтинг
| Елемент | Опис |
|---------|------|
| Value | 1.0 - 5.0 |
| Stars | 5 зірок (filled/empty) |
| Reviews Count | (324) відгуків |
| Source | Середнє від учасників подій |

### 3. 🏆 Досягнення
| Статус | Вигляд |
|--------|--------|
| Locked | Сірий, opacity 0.5 |
| Unlocked | Кольоровий, glow ефект |
| Progress | X/7 досягнень |

### 4. 🎯 Інтереси
| Статус | Вигляд |
|--------|--------|
| Default | bg: tertiary, border-radius: full |
| Selected | bg: accent, text: white |
| Add More | dashed border |

### 5. 💎 Premium
| Статус | Вигляд |
|--------|--------|
| Active | PRO badge, gold gradient |
| Expired | Standard badge, muted |
| None | Hidden |

### 6. 📊 Статистика
| Метрика | Джерело |
|---------|---------|
| Рейтинг | user_ratings.average |
| Подій | COUNT(events WHERE user_id) |
| Друзів | COUNT(friendships) |
| Повідомлень | COUNT(messages) |
| Досягнень | COUNT(user_achievements) |

---

## 🧪 Testing Checklist

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Завантаження профілю | ⬜ | |
| 2 | Зміна аватара | ⬜ | |
| 3 | Зміна cover | ⬜ | |
| 4 | Редагування імені | ⬜ | |
| 5 | Зміна інтересів | ⬜ | |
| 6 | Відкриття досягнень | ⬜ | |
| 7 | Premium статус відображається | ⬜ | |
| 8 | Статистика оновлюється | ⬜ | |
| 9 | Мобільна версія | ⬜ | |
| 10 | Desktop версія | ⬜ | |

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
| Tasks Completed | 20 | |
| Bugs Found | - | |
| Bugs Fixed | - | |
| Velocity | - | |

---

## ✅ Definition of Done — Sprint 8

| Criteria | Status |
|----------|--------|
| Profile UI покращено | ⬜ |
| Edit Profile працює | ⬜ |
| Photo Upload працює | ⬜ |
| Stats оновлюються | ⬜ |
| Achievements інтегровано | ✅ |
| Mobile responsive | ⬜ |
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

## 🎯 Sprint 8 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA | | | |
| Product | | | |

**Sprint 8 Status:** 🟡 In Progress / 🟢 Completed / 🔴 Blocked

**Notes:**
