# 🚀 Sprint 9: Адмін-панель (Admin Panel)

## 🎯 Мета Sprint 9
Створити адмін-панель для модерації контенту та керування користувачами.

---

## 📋 Функції адмін-панелі

### 📊 Dashboard (Статистика)
| Метрика | Опис |
|---------|------|
| Всього користувачів | Загальна кількість |
| Активних сьогодні | DAU |
| Всього подій | Кількість подій |
| Активних подій | Ongoing events |
| Всього Premium | Підписок |
| Скарги | Open reports |

### 👥 Користувачі (Users)
| Функція | Опис |
|---------|------|
| Список користувачів | Таблиця з пагінацією |
| Пошук | За ім'ям, email, telegram |
| Деталі профілю | Перегляд профілю |
| Бани | Тимчасове/постійне блокування |
| Роль | Користувач / Модератор / Адмін |

### 📅 Події (Events)
| Функція | Опис |
|---------|------|
| Список подій | Таблиця з фільтрами |
| Статус | Активні / Завершені / Скасовані |
| Видалення | Видалення події |
| Причина | Обов'язкова причина видалення |

### 💬 Чати (Chats)
| Функція | Опис |
|---------|------|
| Активні чати | Список чатів |
| Повідомлення | Перегляд повідомлень |
| Видалення повідомлення | Видалення конкретного повідомлення |

### 💎 Premium
| Функція | Опис |
|---------|------|
| Активні підписки | Список Premium |
| Історія покупок | Лог покупок |
| Відкликання Premium | Скасування підписки |

### 🚨 Reports (Скарги)
| Функція | Опис |
|---------|------|
| Відкриті скарги | Список відкритих |
| Обробка скарги | Прийняти/відхилити |
| Історія | Оброблені скарги |

---

## 🎨 UI/UX Дизайн

### Admin Dashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│  🔗 LinkUp Admin                           [👤 Admin ▼]   │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                 │
│  📊 Dash │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│          │  │ 1.2K│ │ 234 │ │ 56  │ │ 12  │            │
│  👥 Users│  │Users│ │Events│ │Premium│ │Reports│            │
│          │  └─────┘ └─────┘ └─────┘ └─────┘            │
│  📅 Events│                                                 │
│          │  Recent Activity                                │
│  💬 Chats │  ─────────────────                            │
│          │  • User banned: @andriy_s                      │
│  💎 Premium│  • Event deleted: Rooftop Party              │
│          │  • Report resolved: Spam                       │
│  🚨 Reports│                                                │
│          │                                                 │
└──────────┴─────────────────────────────────────────────────┘
```

### Users Table
| Колонка | Опис |
|---------|------|
| Avatar | Фото користувача |
| Name | Ім'я та username |
| Events | Кількість подій |
| Premium | Статус Premium |
| Status | Активний / Заблокований |
| Actions | BAN / Edit / View |

### Event Card
```
┌────────────────────────────────────────┐
│  🎉 Rooftop Party                      │
│  📍 Київ, вул. Хрещатик 1            │
│  👥 12/20 учасників                   │
│  👤 @andriy_s                         │
│  📅 15.07.2024 20:00                 │
├────────────────────────────────────────┤
│  [👁️ View] [✏️ Edit] [🗑️ Delete]    │
└────────────────────────────────────────┘
```

---

## 🏗️ Архітектура

### Frontend (admin-panel.html)
| Component | Status |
|-----------|--------|
| Admin Layout | ⬜ |
| Sidebar Navigation | ⬜ |
| Stats Cards | ⬜ |
| Users Table | ⬜ |
| Events Table | ⬜ |
| Chats View | ⬜ |
| Premium View | ⬜ |
| Reports View | ⬜ |

### Backend (Supabase)
| Table/Function | Status |
|----------------|--------|
| Таблиця `admin_logs` | ⬜ |
| RPC `get_admin_stats()` | ⬜ |
| RPC `ban_user(user_id, reason, duration)` | ⬜ |
| RPC `unban_user(user_id)` | ⬜ |
| RPC `delete_event(event_id, reason)` | ⬜ |
| RPC `delete_message(message_id)` | ⬜ |
| RPC `resolve_report(report_id, action)` | ⬜ |
| RPC `revoke_premium(user_id)` | ⬜ |

### Security
| Feature | Description |
|---------|-------------|
| Role Check | Тільки role = 'admin' |
| Action Logging | Всі дії записуються |
| Rate Limiting | Захист від спаму |
| Audit Trail | Повна історія дій |

---

## 📋 Admin Actions

### 🔨 Ban User
```javascript
{
  user_id: "uuid",
  reason: "Spam / Inappropriate content / Other",
  duration: "permanent" | "7 days" | "30 days",
  notify_user: true
}
```

### 🗑️ Delete Event
```javascript
{
  event_id: "uuid",
  reason: "Spam / Duplicate / Inappropriate / Other",
  notify_creator: true
}
```

### 📝 Resolve Report
```javascript
{
  report_id: "uuid",
  action: "dismiss" | "warn_user" | "ban_user" | "delete_content"
}
```

---

## 📊 Завдання

### Backend Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Таблиця `admin_logs` | ⬜ |
| 2 | RLS policies для admin | ⬜ |
| 3 | RPC `get_admin_stats()` | ⬜ |
| 4 | RPC `ban_user()` | ⬜ |
| 5 | RPC `unban_user()` | ⬜ |
| 6 | RPC `delete_event()` | ⬜ |
| 7 | RPC `delete_message()` | ⬜ |
| 8 | RPC `resolve_report()` | ⬜ |
| 9 | RPC `revoke_premium()` | ⬜ |

### Frontend Tasks
| # | Task | Status |
|---|------|--------|
| 1 | admin-panel.html | ⬜ |
| 2 | admin-layout.css | ⬜ |
| 3 | admin-app.js | ⬜ |
| 4 | Dashboard view | ⬜ |
| 5 | Users view | ⬜ |
| 6 | Events view | ⬜ |
| 7 | Chats view | ⬜ |
| 8 | Premium view | ⬜ |
| 9 | Reports view | ⬜ |

---

## 🔒 Security Requirements

1. **Authentication**
   - Telegram WebApp Data validation
   - Check user role from database

2. **Authorization**
   - Only admins can access `/admin-panel.html`
   - Role check on every admin action

3. **Audit**
   - All actions logged to `admin_logs`
   - Timestamp, admin_id, action, target_id

4. **Rate Limiting**
   - Max 10 bans per minute
   - Max 100 queries per minute

---

## 📈 Success Criteria

| Metric | Target |
|--------|--------|
| Admin panel load time | < 1s |
| Actions response time | < 500ms |
| All CRUD operations | Working |
| Audit logging | Complete |
| Security checks | All passed |

---

## 📅 Timeline

| День | Завдання |
|------|----------|
| День 1 | Backend: tables, RPC, security |
| День 2 | Frontend: layout, dashboard |
| День 3 | Frontend: tables, modals |
| День 4 | Integration, testing |
