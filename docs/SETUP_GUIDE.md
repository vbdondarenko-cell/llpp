# 🚀 Швидкий старт налаштування Фази 1

## День 1: Понеділок — Інфраструктура

### 1. Firebase Setup (30 хвилин)

1. **Створити Firebase проект**
   ```
   https://console.firebase.google.com/
   → Add project → "linkup-beta"
   → Analytics → Enable Google Analytics
   ```

2. **Додати додаток**
   ```
   Project Settings → Add app → Web → Register app
   → Copy firebaseConfig
   ```

3. **Підключити Crashlytics**
   ```
   Engage → Crashlytics → Enable Crashlytics
   ```

### 2. GitHub Setup (20 хвилин)

1. **Створити репозиторій для бета-тесту**
   ```bash
   # Якщо вже є основний репозиторій, створити нову гілку
   git checkout -b beta-testing
   ```

2. **Налаштувати Secrets**
   ```
   Settings → Secrets and variables → Actions
   → New repository secret:
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID
   ```

3. **Створити workflow файл**
   ```bash
   mkdir -p .github/workflows
   # Додати telegram-notify.yml
   ```

---

## День 2: Вівторок — Пошук тестувальників

### 1. Створити форму реєстрації (30 хвилин)

**Google Forms питань:**
```
1. Ваше ім'я (або нікнейм в Telegram)
2. Telegram username (@)
3. Тип пристрою: iOS / Android / Інше
4. Версія OS (наприклад iOS 17.2)
5. Ваше місто проживання
6. Чи є досвід у бета-тестуванні? (Так/Ні)
7. Що вас мотивує тестувати LinkUp?
```

### 2. Текст заклику

```
🔥 ШУКАЄМО БЕТА-ТЕСТУВАЛЬНИКІВ!

LinkUp — новий додаток для пошуку компанії та подій біля вас.

🎁 ЩО ОТРИМАЄТЕ:
• Ранній доступ до додатку
• Вплив на розвиток продукту
• Можливість отримати Premium безкоштовно

📱 ПОТРІБНО:
• iPhone або Android
• Telegram

📝 ЗАПОВНИТИ ФОРМУ:
[посилання на Google Forms]

⏰ Дедлайн: [дата]
```

---

## День 3: Середа — CI/CD та сповіщення

### 1. Telegram Bot для сповіщень (20 хвилин)

1. **Створити бота**
   ```
   @BotFather → /newbot
   → Save token
   ```

2. **Отримати Chat ID**
   ```
   @userinfobot → Start → Copy your ID
   Або створити групу і додати бота туди
   ```

3. **Додати Secrets в GitHub**
   ```
   Settings → Secrets → Actions
   → TELEGRAM_BOT_TOKEN: [токен бота]
   → TELEGRAM_CHAT_ID: [ваш chat_id]
   ```

### 2. GitHub Actions Workflow

Створити файл `.github/workflows/notify.yml`:

```yaml
name: Telegram Notification

on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send message
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            🚀 LinkUp Beta Update!
            Branch: ${{ github.ref_name }}
            Commit: ${{ github.sha }}
            Author: ${{ github.actor }}
            ${{ github.event.compare_url }}
```

---

## День 4: Четвер — Тестові дані

### 1. Notion Database для баг-репортів

**Створити таблицю "Bug Reports":**

| Поле | Тип | Опис |
|------|-----|------|
| Назва | Title | Короткий опис |
| Серйозність | Select | Critical, Major, Minor, Low |
| Пріоритет | Select | P1, P2, P3, P4 |
| Статус | Select | Open, In Progress, Resolved, Closed |
| Пристрій | Multi-select | iOS, Android |
| OS версія | Text | iOS 17.2, Android 14 |
| Скріншот | Files | Зображення |
| Опис | Text | Детальний опис |
| Створив | Person | Автор |
| Дата | Date | Дата створення |

### 2. Тестові події

**Автоматизація (Node.js script):**
```javascript
const testEvents = [
  { name: "Rooftop Party Test", type: "party", lat: 50.4501, lng: 30.5234 },
  { name: "Basketball 3x3 Test", type: "sport", lat: 50.4551, lng: 30.5300 },
  // ... more events
];

// Створити події через API
```

---

## День 5: П'ятниця — Перша збірка

### 1. Збірка Telegram Mini App

```bash
# Перевірити що все працює
npm run build

# Тест локально
npm start
```

### 2. Телеграм Bot Father

1. **Створити Mini App**
   ```
   @BotFather → /newapp
   → Choose name: LinkUp
   → Short description: Find your tribe
   → URL: https://your-domain.com
   ```

### 3. Розсилка тестувальникам

**Повідомлення:**
```
🎉 Вітаємо! Ви отримали доступ до бета-тесту LinkUp!

📱 ЯК ЗАПУСТИТИ:
1. Встановіть Telegram (якщо ще немає)
2. Відкрийте посилання: [посилання на Mini App]
3. Почніть тестування!

📋 ІНСТРУКЦІЯ:
1. Знайдіть баг → Зробіть скріншот
2. Опишіть проблему в нашій групі: [посилання на групу]
3. Або створіть issue в Notion: [посилання]

🐛 ФОРМАТ БАГ-РЕПОРТУ:
- Пристрій: 
- OS:
- Кроки:
- Очікуваний результат:
- Фактичний результат:

Дякуємо за ваш внесок! 🙏
```

---

## 📊 Dashboard для відстеження

### Метрики тижня 1:

| Метрика | Ціль | Статус |
|---------|------|--------|
| Тестувальників | 30+ | ⬜ |
| Тестових подій | 20 | ⬜ |
| Bug reports | - | ⬜ |
| Critical bugs | 0 | ⬜ |
| Crash rate | < 1% | ⬜ |

### Щоденні звіти:

```markdown
## Звіт День [N]

### Виконано:
- [ ] 

### Плани на завтра:
- [ ]

### Проблеми:
- 

### Метрики:
- Тестувальників: X
- Багів відкрито: X
- Багів закрито: X
```

---

## 🔗 Корисні посилання

| Сервіс | Посилання |
|--------|-----------|
| Firebase Console | https://console.firebase.google.com |
| GitHub Actions | https://github.com/features/actions |
| Telegram BotFather | https://t.me/BotFather |
| Notion | https://notion.so |
| Google Analytics | https://analytics.google.com |
