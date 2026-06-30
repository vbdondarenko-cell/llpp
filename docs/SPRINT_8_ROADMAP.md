# 🚀 Sprint 8: Профіль користувача (User Profile)

## 🎯 Мета Sprint 8
Створити повноцінний, функціональний профіль користувача з можливістю редагування, перегляду статистики та інтеграцією з досягненнями.

---

## 📋 Компоненти профілю

| # | Компонент | Опис | Пріоритет |
|---|-----------|------|-----------|
| 1 | **Фото** | Аватар, cover, зміна фото | 🔴 Високий |
| 2 | **Рейтинг** | Зірки, відгуки, оцінки | 🔴 Високий |
| 3 | **Досягнення** | Система досягнень (Sprint 7) | ✅ Готово |
| 4 | **Інтереси** | Теги, категорії, редагування | 🟡 Середній |
| 5 | **Premium** | Статус підписки, бейдж PRO | 🟡 Середній |
| 6 | **Статистика** | Події, друзі, повідомлення, рейтинг | 🔴 Високий |

---

## 🎨 UI/UX Покращення

### 1. Profile Header
```
┌────────────────────────────────────┐
│  [Cover Image - gradient/photo]    │
│                                    │
│      ┌─────┐                      │
│      │ 👤  │  Андрій Шевченко     │
│      │PRO  │  @andriy_s           │
│      └─────┘  ⭐ 4.8 (324)        │
│                                    │
│   [Подій: 23] [Друзів: 156]       │
└────────────────────────────────────┘
```

### 2. Stats Cards
| Статистика | Значення | Джерело |
|------------|----------|---------|
| Рейтинг | ⭐ 4.8 | Середнє від користувачів |
| Подій | 23 | COUNT(events) |
| Друзів | 156 | COUNT(friendships) |
| Повідомлень | 1,247 | COUNT(messages) |
| Досягнень | 3/7 | COUNT(user_achievements) |

### 3. Premium Badge
- Візуальний индикатор PRO статусу
- Різні кольори для active/expired
- Countdown до закінчення підписки

---

## 🏗️ Архітектура

### Frontend Components
| # | Component | Status |
|---|-----------|--------|
| 1 | Profile Header (avatar, cover, name) | ⬜ |
| 2 | Stats Overview | ⬜ |
| 3 | Achievements Section | ✅ |
| 4 | Interests Editor | ⬜ |
| 5 | Premium Card | ⬜ |
| 6 | Edit Profile Modal | ⬜ |
| 7 | Photo Upload Component | ⬜ |

### Backend (Supabase)
| # | Table/Function | Status |
|---|----------------|--------|
| 1 | Таблиця `profiles` (оновлення) | ⬜ |
| 2 | Таблиця `user_stats` | ⬜ |
| 3 | Storage bucket для фото | ⬜ |
| 4 | RPC `get_profile_stats()` | ⬜ |
| 5 | RPC `update_profile()` | ⬜ |
| 6 | RPC `upload_avatar()` | ⬜ |

---

## 📱 Screens & Modals

### 1. Edit Profile Modal
```
┌────────────────────────────────────┐
│  Редагування профілю          [X]  │
├────────────────────────────────────┤
│                                    │
│      ┌─────────────────┐           │
│      │   [Photo]       │ [📷]       │
│      └─────────────────┘           │
│                                    │
│  Ім'я:                             │
│  [________________________]        │
│                                    │
│  Username:                          │
│  [________________________]        │
│                                    │
│  Біо:                              │
│  [________________________]         │
│  [________________________]         │
│                                    │
│  City:                              │
│  [Київ               ▼]             │
│                                    │
│  [Зберегти зміни]                  │
└────────────────────────────────────┘
```

### 2. Achievements Expanded Modal
```
┌────────────────────────────────────┐
│  Мої досягнення               [X]  │
├────────────────────────────────────┤
│                                    │
│         🎯 🔥 🚀 👑               │
│         🤝 ⭐ 💬                   │
│                                    │
│  Розблоковано: 3/7                │
│  ████████░░░░░░░░░  43%          │
│                                    │
│  ┌────────────────────────────┐    │
│  │ 🎯 Перша подія      ✅     │    │
│  ├────────────────────────────┤    │
│  │ 🔥 10 подій         ✅     │    │
│  ├────────────────────────────┤    │
│  │ 🚀 50 подій         ⬜     │    │
│  └────────────────────────────┘    │
│                                    │
└────────────────────────────────────┘
```

---

## 📊 Завдання

### Backend Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Розширити таблицю `profiles` | ⬜ |
| 2 | Створити Storage bucket | ⬜ |
| 3 | Додати RLS policies | ⬜ |
| 4 | Створити RPC `get_profile_stats()` | ⬜ |
| 5 | Створити RPC `update_profile()` | ⬜ |
| 6 | Створити RPC `get_user_rating()` | ⬜ |
| 7 | Додати trigger на оновлення stats | ⬜ |

### Frontend Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Покращити Profile Header UI | ⬜ |
| 2 | Додати Stats Cards grid | ⬜ |
| 3 | Реалізувати Edit Profile Modal | ⬜ |
| 4 | Додати Photo Upload | ⬜ |
| 5 | Інтегрувати Achievements (Sprint 7) | ✅ |
| 6 | Додати Premium Status indicator | ⬜ |
| 7 | Responsive design | ⬜ |

---

## 🔗 Data Flow

```
┌──────────────┐     ┌──────────────┐
│  Telegram    │────▶│  Frontend    │
│  WebApp      │     │  Profile UI  │
└──────────────┘     └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Supabase    │
                      │  - profiles  │
                      │  - stats     │
                      │  - storage   │
                      └──────────────┘
```

---

## 📈 Success Criteria

| Metric | Target |
|--------|--------|
| Profile load time | < 500ms |
| Edit save time | < 1s |
| Photo upload | < 3s |
| UI consistency | 100% |
| Mobile responsive | ✅ |

---

## 📅 Timeline

| День | Завдання |
|------|----------|
| День 1 | Backend: tables, RPC, storage |
| День 2 | Frontend: Profile UI, Edit Modal |
| День 3 | Photo upload, Stats integration |
| День 4 | Testing, polishing |

---

## 🎨 Design Tokens

### Profile Colors
```css
--profile-header-bg: var(--bg-tertiary);
--profile-avatar-ring: var(--accent-gradient);
--stats-card-bg: var(--bg-card);
--premium-gold: linear-gradient(135deg, #f59e0b, #d97706);
--achievement-glow: var(--accent-gradient);
```

### Typography
- Profile Name: 24px, weight 700
- Username: 14px, weight 400, color muted
- Stats Value: 20px, weight 700
- Stats Label: 12px, weight 500
