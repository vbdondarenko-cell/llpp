# 🚀 Sprint 10: Закрита Alpha — Тестування

## 🎯 Мета Sprint 10
Провести закритое Alpha-тестування LinkUp з фокусом на перевірку всіх ключових функцій.

---

## 📋 Що тестуємо

### 1. Telegram Login
| Функція | Тест-кейси |
|---------|------------|
| Авторизація | Вхід через Telegram WebApp |
| Дані користувача | Telegram ID, username, photo_url |
| Валідація | initData validation |
| Помилки | Невалідні дані |

### 2. Карта (Map)
| Функція | Тест-кейси |
|---------|------------|
| Завантаження | MapBox GL завантаження |
| Маркери | Відображення подій на карті |
| Геолокація | Визначення позиції користувача |
| Фільтри | Категорії подій |

### 3. Події (Events)
| Функція | Тест-кейси |
|---------|------------|
| Створення | Форма створення події |
| Перегляд | Деталі події |
| Фільтри | Пошук за категорією |
| Статус | Активні/Завершені |

### 4. Заявки (Requests)
| Функція | Тест-кейси |
|---------|------------|
| Подача | Запит на вступ |
| Статус | Очікує/Прийнято/Відхилено |
| Сповіщення | Push про статус |

### 5. Чати (Chats)
| Функція | Тест-кейси |
|---------|------------|
| Відкриття | Чат після схвалення |
| Повідомлення | Текстові повідомлення |
| Таймер | 6 годин auto-delete |
| Архів | Завершені чати |

### 6. Premium
| Функція | Тест-кейси |
|---------|------------|
| Покупка | Telegram Stars |
| Статус | PRO badge |
| Функції | Розблоковані можливості |

### 7. Досягнення (Achievements)
| Функція | Тест-кейси |
|---------|------------|
| Розблокування | Автоматичне отримання |
| Прогрес | Лічильник X/7 |
| Сповіщення | Toast notification |

### 8. Push Notifications
| Функція | Тест-кейси |
|---------|------------|
| Дозвіл | Запит на сповіщення |
| Прихід | Отримання push |
| Типи | Заявки, чати, нагадування |

---

## 🔧 Backend Components

### 1. RLS (Row Level Security)

#### Profiles Table
```sql
-- Користувач бачить тільки свій профіль
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Оновлення тільки свого профілю
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);
```

#### Events Table
```sql
-- Бачимо всі активні події
CREATE POLICY "Anyone can view active events"
  ON events FOR SELECT
  USING (status = 'active');

-- Створюємо події
CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);
```

#### Chat Messages
```sql
-- Бачимо тільки свої чати
CREATE POLICY "Users can view own chats"
  ON messages FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM event_participants
    WHERE event_id = messages.event_id
  ));
```

### 2. RPC Functions

#### User Management
```sql
-- Отримати профіль з stats
get_profile_full(user_id uuid)
  RETURNS json

-- Оновити профіль
update_profile(data jsonb)
  RETURNS void

-- Отримати статистику
get_user_stats(user_id uuid)
  RETURNS json
```

#### Events
```sql
-- Створити подію
create_event(data jsonb)
  RETURNS uuid

-- Приєднатися до події
join_event(event_id uuid)
  RETURNS void

-- Подати заявку
request_to_join(event_id uuid)
  RETURNS void
```

#### Chat
```sql
-- Надіслати повідомлення
send_message(event_id uuid, content text)
  RETURNS uuid

-- Отримати повідомлення
get_messages(event_id uuid, since timestamp)
  RETURNS json
```

#### Achievements
```sql
-- Перевірити досягнення
check_achievements(user_id uuid, action text)
  RETURNS json
```

### 3. Realtime Subscriptions

```javascript
// Підписка на нові повідомлення
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `event_id=eq.${eventId}`
  }, handleNewMessage)
  .subscribe();

// Підписка на заявки
supabase
  .channel('requests')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'event_requests'
  }, handleNewRequest)
  .subscribe();

// Підписка на досягнення
supabase
  .channel('achievements')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'user_achievements'
  }, handleNewAchievement)
  .subscribe();
```

---

## 📊 Тестування по компонентах

### Frontend Testing
| # | Component | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Telegram Login | ⬜ | | |
| 2 | Map View | ⬜ | | |
| 3 | Events List | ⬜ | | |
| 4 | Event Detail | ⬜ | | |
| 5 | Create Event | ⬜ | | |
| 6 | Join Request | ⬜ | | |
| 7 | Chat | ⬜ | | |
| 8 | Profile | ⬜ | | |
| 9 | Achievements | ⬜ | | |
| 10 | Premium | ⬜ | | |
| 11 | Settings | ⬜ | | |

### Backend Testing
| # | Component | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | RLS Policies | ⬜ | | |
| 2 | RPC Functions | ⬜ | | |
| 3 | Realtime | ⬜ | | |
| 4 | Auth | ⬜ | | |

---

## 🧪 Test Scenarios

### Critical Path
```
1. Встановити Telegram
2. Відкрити Mini App
3. Авторизуватися через Telegram
4. Переглянути карту з подіями
5. Створити подію
6. Подати заявку на іншу подію
7. Отримати схвалення
8. Написати в чат
9. Отримати досягнення
10. Купити Premium
```

### Edge Cases
- Offline mode
- Slow connection
- Token expiration
- Rate limiting
- Empty states

---

## 📱 Пристрої для тестування

### iOS
| Пристрій | OS | Telegram | Статус |
|----------|-----|----------|--------|
| iPhone 14 | iOS 17 | Latest | ⬜ |
| iPhone 13 | iOS 16 | Latest | ⬜ |
| iPhone SE | iOS 15 | Latest | ⬜ |

### Android
| Пристрій | OS | Telegram | Статус |
|----------|-----|----------|--------|
| Samsung S23 | Android 14 | Latest | ⬜ |
| Pixel 7 | Android 13 | Latest | ⬜ |
| Xiaomi | MIUI 14 | Latest | ⬜ |

---

## 📈 Success Criteria

| Metric | Target | Actual |
|--------|--------|--------|
| Test Coverage | 100% | |
| Critical Bugs | 0 | |
| Major Bugs | < 5 | |
| Minor Bugs | < 20 | |
| Alpha Users | 20-50 | |

---

## 🎯 Definition of Done

- ✅ Всі critical bugs виправлено
- ✅ RLS policies працюють
- ✅ RPC functions протестовані
- ✅ Realtime підписки працюють
- ✅ Push notifications працюють
- ✅ 20+ тестувальників
- ✅ Alpha закрита успішно
