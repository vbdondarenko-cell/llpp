# 🚀 Sprint 7: Досягнення (Achievements System)

## 🎯 Мета Sprint 7
Розробити систему досягнень для мотивації користувачів та залученості до додатку.

---

## 📋 Список досягнень

| ID | Назва | Іконка | Опис | Умова отримання |
|----|-------|--------|------|-----------------|
| 1 | Перша подія | 🎯 | Створив першу подію | 1 created event |
| 2 | 10 подій | 🔥 | Створив 10 подій | 10 created events |
| 3 | 50 подій | 🚀 | Створив 50 подій | 50 created events |
| 4 | 100 подій | 👑 | Створив 100 подій | 100 created events |
| 5 | Перший друг | 🤝 | Додав першого друга | 1 friend added |
| 6 | Перший Premium | ⭐ | Оформив Premium підписку | Premium purchased |
| 7 | 100 повідомлень | 💬 | Написав 100 повідомлень | 100 messages sent |

---

## 🏗️ Архітектура системи

### Frontend (UI)
- [ ] **Achievements Grid** — відображення сітки досягнень у профілі
- [ ] **Progress Counter** — показник прогресу (X/7)
- [ ] **Achievement Badge** — стилізація unlocked/locked станів
- [ ] **Notification Toast** — спливаюче сповіщення при розблокуванні

### Backend (Supabase)
- [ ] **Таблиця `achievements`** — список всіх досягнень
- [ ] **Таблиця `user_achievements`** — прогрес користувача
- [ ] **RPC функція `check_achievements()`** — перевірка та надання досягнень
- [ ] **Trigger на створення події** — автоматична перевірка after insert
- [ ] **Trigger на повідомлення** — підрахунок повідомлень

### Events Tracking
- [ ] При створенні події → +1 до лічильника
- [ ] При досягненні 1, 10, 50, 100 → розблокування відповідного досягнення
- [ ] При покупці Premium → розблокування "Перший Premium"
- [ ] При додаванні друга → розблокування "Перший друг"
- [ ] При відправці 100 повідомлень → розблокування "100 повідомлень"

---

## 📊 Завдання

### Backend Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Створити таблицю `achievements` | ⬜ |
| 2 | Створити таблицю `user_achievements` | ⬜ |
| 3 | Додати RLS policies | ⬜ |
| 4 | Створити RPC `check_event_achievements()` | ⬜ |
| 5 | Створити RPC `check_message_achievements()` | ⬜ |
| 6 | Додати тригер на `events` INSERT | ⬜ |
| 7 | Додати тригер на `messages` INSERT | ⬜ |
| 8 | Тестування RPC функцій | ⬜ |

### Frontend Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Оновити HTML achievements grid | ✅ |
| 2 | Додати JS логіку досягнень | ✅ |
| 3 | Додати CSS стилі notification | ✅ |
| 4 | Інтегрувати з Supabase | ⬜ |
| 5 | Додати API для отримання прогресу | ⬜ |
| 6 | Анімація розблокування | ⬜ |

---

## 🔗 Інтеграції

### Event Flow
```
Користувач створює подію
        ↓
Supabase: events INSERT
        ↓
Trigger: check_event_achievements()
        ↓
Оновлення user_achievements
        ↓
Frontend: fetch user achievements
        ↓
Відображення розблокованого досягнення
        ↓
Toast notification
```

### Message Flow
```
Користувач пише повідомлення
        ↓
Supabase: messages INSERT
        ↓
Trigger: check_message_achievements()
        ↓
Оновлення user_achievements
        ↓
Frontend: оновлення progress counter
```

---

## 📈 Success Criteria

| Metric | Target |
|--------|--------|
| Досягнень реалізовано | 7/7 |
| часу на розробку | 3 дні |
| Код покритий тестами | >80% |

---

## 📅 Timeline

| День | Завдання |
|------|----------|
| День 1 | Backend: таблиці, RLS, RPC функції |
| День 2 | Frontend: інтеграція, API |
| День 3 | Тестування, стилізація, оптимізація |

---

## 🎨 Design Reference

### Achievement States
- **Locked**: opacity 0.5, grayscale filter, dashed border
- **Unlocked**: full color, gradient background, glow effect

### Notification Animation
- Slide in from top: 300ms ease
- Bounce icon: 500ms
- Auto-dismiss: 3 секунди
- Slide out: 300ms ease
