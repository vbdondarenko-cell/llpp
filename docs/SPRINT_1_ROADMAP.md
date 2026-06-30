# 🚀 LinkUp Alpha Roadmap — Sprint 1: Foundation
## Мета: Працюючий каркас застосунку
## Тривалість: 1 тиждень

---

## 📋 Огляд Sprint 1

### Мета Sprint 1:
```
Користувач відкриває Mini App → авторизується → 
проходить онбординг → потрапляє на головний екран
```

### Результат Sprint 1:
- ✅ Telegram авторизація працює
- ✅ Профіль користувача створюється
- ✅ Інтереси зберігаються
- ✅ Онбординг пройдено
- ✅ Головний екран завантажується

---

## 🗄️ Частина 1: Backend — Supabase

### 1.1 Структура проекту Supabase

```
Supabase Project: linkup-alpha

Tables:
├── profiles
├── interests  
├── user_interests
└── user_settings

Functions (RPC):
├── create_profile()
├── update_profile()
├── get_profile()
├── set_interests()
└── get_interests()
```

### 1.2 Таблиця: profiles

```sql
-- Створення таблиці profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Telegram дані
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  telegram_photo_url TEXT,
  
  -- Профіль
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  
  -- Системні поля
  is_premium BOOLEAN DEFAULT FALSE,
  is_onboarded BOOLEAN DEFAULT FALSE,
  preferred_language TEXT DEFAULT 'uk',
  preferred_theme TEXT DEFAULT 'dark',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Користувач бачить тільки свій профіль
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Користувач може редагувати тільки свій профіль
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Всі можуть бачити публічні профілі (для майбутнього)
CREATE POLICY "Anyone can view public profiles"
  ON profiles FOR SELECT
  USING (is_onboarded = TRUE);
```

### 1.3 Таблиця: interests

```sql
-- Таблиця interestss (статичні дані)
CREATE TABLE interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_uk TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji
  category TEXT NOT NULL, -- music, sport, food, art, etc.
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

-- Дефолтні інтереси
INSERT INTO interests (slug, name_uk, name_ru, name_en, icon, category, sort_order) VALUES
('music', 'Музика', 'Музыка', 'Music', '🎵', 'entertainment', 1),
('party', 'Party', 'Party', 'Party', '🎉', 'entertainment', 2),
('sport', 'Спорт', 'Спорт', 'Sport', '⚽', 'active', 3),
('fitness', 'Фітнес', 'Фитнес', 'Fitness', '💪', 'active', 4),
('food', 'Їжа', 'Еда', 'Food', '🍕', 'lifestyle', 5),
('coffee', 'Кава', 'Кофе', 'Coffee', '☕', 'lifestyle', 6),
('art', 'Мистецтво', 'Искусство', 'Art', '🎨', 'culture', 7),
('movies', 'Кіно', 'Кино', 'Movies', '🎬', 'entertainment', 8),
('reading', 'Книги', 'Книги', 'Reading', '📚', 'culture', 9),
('travel', 'Подорожі', 'Путешествия', 'Travel', '✈️', 'lifestyle', 10),
('gaming', 'Ігри', 'Игры', 'Gaming', '🎮', 'entertainment', 11),
('tech', 'Технології', 'Технологии', 'Tech', '💻', 'professional', 12),
('business', 'Бізнес', 'Бизнес', 'Business', '💼', 'professional', 13),
('networking', 'Нетворкінг', 'Нетворкинг', 'Networking', '🤝', 'professional', 14),
('nature', 'Природа', 'Природа', 'Nature', '🌲', 'active', 15),
('photography', 'Фотографія', 'Фотография', 'Photography', '📸', 'culture', 16);

-- RLS для interests
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active interests"
  ON interests FOR SELECT
  USING (is_active = TRUE);
```

### 1.4 Таблиця: user_interests

```sql
-- Звязок користувач-інтереси
CREATE TABLE user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, interest_id)
);

-- RLS
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own interests"
  ON user_interests FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view user interests"
  ON user_interests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = user_id AND is_onboarded = TRUE
    )
  );
```

### 1.5 Таблиця: user_settings

```sql
-- Налаштування користувача
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Сповіщення
  notify_new_events BOOLEAN DEFAULT TRUE,
  notify_event_requests BOOLEAN DEFAULT TRUE,
  notify_chat_messages BOOLEAN DEFAULT TRUE,
  notify_nearby BOOLEAN DEFAULT TRUE,
  
  -- Геолокація
  location_enabled BOOLEAN DEFAULT TRUE,
  location_sharing BOOLEAN DEFAULT TRUE,
  
  -- Приватність
  show_on_map BOOLEAN DEFAULT TRUE,
  allow_dm BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id);
```

### 1.6 RPC Функції

```sql
-- Створення профілю (при авторизації)
CREATE OR REPLACE FUNCTION create_profile(
  p_telegram_id BIGINT,
  p_telegram_username TEXT,
  p_telegram_first_name TEXT,
  p_telegram_last_name TEXT,
  p_telegram_photo_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Перевіряємо чи профіль вже існує
  SELECT id INTO v_user_id
  FROM profiles
  WHERE telegram_id = p_telegram_id;
  
  -- Якщо вже є - повертаємо існуючий
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- Створюємо користувача в auth
  INSERT INTO auth.users (raw_user_meta_data)
  VALUES (
    jsonb_build_object(
      'telegram_id', p_telegram_id,
      'telegram_username', p_telegram_username
    )
  )
  RETURNING id INTO v_user_id;
  
  -- Створюємо профіль
  INSERT INTO profiles (
    id,
    telegram_id,
    telegram_username,
    telegram_first_name,
    telegram_last_name,
    telegram_photo_url,
    display_name,
    avatar_url,
    is_onboarded
  )
  VALUES (
    v_user_id,
    p_telegram_id,
    p_telegram_username,
    p_telegram_first_name,
    p_telegram_last_name,
    p_telegram_photo_url,
    COALESCE(p_telegram_first_name, 'User' || p_telegram_id),
    p_telegram_photo_url,
    FALSE
  );
  
  -- Створюємо дефолтні налаштування
  INSERT INTO user_settings (user_id)
  VALUES (v_user_id);
  
  RETURN v_user_id;
END;
$$;

-- Оновлення профілю
CREATE OR REPLACE FUNCTION update_profile(
  p_user_id UUID,
  p_username TEXT,
  p_display_name TEXT,
  p_bio TEXT,
  p_avatar_url TEXT,
  p_is_onboarded BOOLEAN DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles SET
    username = COALESCE(p_username, username),
    display_name = COALESCE(p_display_name, display_name),
    bio = COALESCE(p_bio, bio),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    is_onboarded = COALESCE(p_is_onboarded, is_onboarded),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING *;
END;
$$;

-- Встановлення інтересів користувача
CREATE OR REPLACE FUNCTION set_user_interests(
  p_interest_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Видаляємо старі інтереси
  DELETE FROM user_interests
  WHERE user_id = auth.uid();
  
  -- Вставляємо нові
  INSERT INTO user_interests (user_id, interest_id)
  SELECT auth.uid(), unnest(p_interest_ids);
END;
$$;

-- Отримання інтересів користувача
CREATE OR REPLACE FUNCTION get_user_interests()
RETURNS TABLE (
  interest_id UUID,
  slug TEXT,
  name TEXT,
  icon TEXT,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.slug,
    CASE 
      WHEN (SELECT preferred_language FROM profiles WHERE id = auth.uid()) = 'ru' THEN i.name_ru
      WHEN (SELECT preferred_language FROM profiles WHERE id = auth.uid()) = 'en' THEN i.name_en
      ELSE i.name_uk
    END,
    i.icon,
    i.category
  FROM interests i
  INNER JOIN user_interests ui ON i.id = ui.interest_id
  WHERE ui.user_id = auth.uid();
END;
$$;
```

---

## 🎨 Частина 2: Frontend

### 2.1 Структура проекту

```
linkup-telegram-app/
├── index.html
├── styles.css
├── app.js
├── lib/
│   ├── supabase.js
│   └── telegram.js
├── screens/
│   ├── splash.js
│   ├── login.js
│   ├── onboarding.js
│   └── home.js
└── components/
    ├── interest-chip.js
    └── loading.js
```

### 2.2 Telegram WebApp Integration

```javascript
// lib/telegram.js

const TelegramAPI = {
  init() {
    this.sdk = window.Telegram.WebApp;
    this.sdk.ready();
    this.sdk.expand();
    this.sdk.enableClosingConfirmation();
    
    // Отримуємо дані користувача
    this.user = this.sdk.initDataUnsafe?.user || {};
    
    return this;
  },

  getUserData() {
    return {
      telegram_id: this.user.id,
      telegram_username: this.user.username || null,
      telegram_first_name: this.user.first_name,
      telegram_last_name: this.user.last_name || null,
      telegram_photo_url: this.user.photo_url || null
    };
  },

  validateInitData() {
    // Валідація initData на backend
    // https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    return this.sdk.initData;
  },

  close() {
    this.sdk.close();
  },

  hapticFeedback(type = 'light') {
    this.sdk.HapticFeedback.impactOccurred(type);
  },

  showAlert(message) {
    this.sdk.showAlert(message);
  },

  showConfirm(message) {
    return this.sdk.showConfirm(message);
  }
};
```

### 2.3 Supabase Integration

```javascript
// lib/supabase.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// Auth через Telegram
async function signInWithTelegram(telegramData) {
  // В реальному проекті - валідація на бекенді
  // Тут для простоти - прямий запис
  const { data, error } = await supabase.rpc('create_profile', {
    p_telegram_id: telegramData.telegram_id,
    p_telegram_username: telegramData.telegram_username,
    p_telegram_first_name: telegramData.telegram_first_name,
    p_telegram_last_name: telegramData.telegram_last_name,
    p_telegram_photo_url: telegramData.telegram_photo_url
  });

  if (error) throw error;
  return data;
}

// Отримання профілю
async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// Оновлення профілю
async function updateProfile(userId, updates) {
  const { data, error } = await supabase.rpc('update_profile', {
    p_user_id: userId,
    p_username: updates.username,
    p_display_name: updates.display_name,
    p_bio: updates.bio,
    p_avatar_url: updates.avatar_url,
    p_is_onboarded: updates.is_onboarded
  });

  if (error) throw error;
  return data;
}

// Отримання інтересів
async function getInterests() {
  const { data, error } = await supabase
    .from('interests')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data;
}

// Збереження інтересів користувача
async function setUserInterests(interestIds) {
  const { error } = await supabase.rpc('set_user_interests', {
    p_interest_ids: interestIds
  });

  if (error) throw error;
}

// Отримання інтересів користувача
async function getUserInterests() {
  const { data, error } = await supabase.rpc('get_user_interests');

  if (error) throw error;
  return data;
}

export {
  supabase,
  signInWithTelegram,
  getProfile,
  updateProfile,
  getInterests,
  setUserInterests,
  getUserInterests
};
```

### 2.4 Splash Screen

```javascript
// screens/splash.js

const SplashScreen = {
  container: null,

  init() {
    this.container = document.getElementById('splash-screen');
    this.render();
    return this;
  },

  render() {
    this.container.innerHTML = `
      <div class="splash-content">
        <div class="logo-container">
          <div class="logo-glow"></div>
          <svg class="logo-icon" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="url(#logoGradient)" stroke-width="4" fill="none"/>
            <circle cx="35" cy="40" r="8" fill="url(#logoGradient)"/>
            <circle cx="65" cy="40" r="8" fill="url(#logoGradient)"/>
            <path d="M35 60 Q50 75 65 60" stroke="url(#logoGradient)" stroke-width="4" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        <h1 class="logo-text">LinkUp</h1>
        <p class="tagline">Find Your Tribe</p>
      </div>
      <div class="splash-particles"></div>
    `;
  },

  async show() {
    this.container.classList.remove('hidden');
    this.container.classList.remove('fade-out');
    
    // Анімація появи
    await this.animateIn();
    
    // Перевірка авторизації
    const isLoggedIn = await this.checkAuth();
    
    // Затримка для показу логотипу
    await this.delay(1500);
    
    // Анімація зникнення
    await this.animateOut();
    
    return isLoggedIn;
  },

  async checkAuth() {
    // Перевіряємо чи користувач вже авторизований
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      return { isLoggedIn: true, userId: storedUserId };
    }
    return { isLoggedIn: false };
  },

  animateIn() {
    return new Promise(resolve => {
      const content = this.container.querySelector('.splash-content');
      content.style.opacity = '0';
      content.style.transform = 'translateY(20px)';
      
      requestAnimationFrame(() => {
        content.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
        setTimeout(resolve, 500);
      });
    });
  },

  animateOut() {
    return new Promise(resolve => {
      this.container.classList.add('fade-out');
      setTimeout(resolve, 500);
    });
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

### 2.5 Login Screen

```javascript
// screens/login.js

const LoginScreen = {
  container: null,

  init() {
    this.container = document.getElementById('login-screen');
    this.render();
    this.attachEvents();
    return this;
  },

  render() {
    this.container.innerHTML = `
      <div class="login-container">
        <div class="login-header">
          <div class="login-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
        </div>
        
        <div class="login-content">
          <h1>Вітаємо в LinkUp!</h1>
          <p>Увійдіть через Telegram для продовження</p>
          
          <button class="login-btn" id="telegram-login-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Увійти через Telegram
          </button>
        </div>
        
        <div class="login-footer">
          <p>Продовжуючи, ви погоджуєтесь з</p>
          <a href="#">Умовами використання</a>
          <span>та</span>
          <a href="#">Політикою конфіденційності</a>
        </div>
      </div>
    `;
  },

  attachEvents() {
    const loginBtn = document.getElementById('telegram-login-btn');
    loginBtn.addEventListener('click', () => this.handleLogin());
  },

  async handleLogin() {
    try {
      // Отримуємо дані з Telegram
      const telegramData = TelegramAPI.getUserData();
      
      // Показуємо loading
      LoadingScreen.show();
      
      // Авторизуємо користувача
      const userId = await signInWithTelegram(telegramData);
      
      // Зберігаємо ID користувача
      localStorage.setItem('user_id', userId);
      
      // Перевіряємо чи пройшов онбординг
      const profile = await getProfile(userId);
      
      LoadingScreen.hide();
      
      if (profile.is_onboarded) {
        // Вже пройшов онбординг → на головну
        App.navigateTo('home');
      } else {
        // Потрібно пройти онбординг
        App.navigateTo('onboarding');
      }
      
    } catch (error) {
      LoadingScreen.hide();
      TelegramAPI.showAlert('Помилка авторизації. Спробуйте ще раз.');
      console.error('Login error:', error);
    }
  },

  show() {
    this.container.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

### 2.6 Onboarding Screen

```javascript
// screens/onboarding.js

const OnboardingScreen = {
  container: null,
  currentStep: 1,
  selectedInterests: [],
  allInterests: [],

  async init() {
    this.container = document.getElementById('onboarding-screen');
    this.render();
    await this.loadInterests();
    this.attachEvents();
    return this;
  },

  async loadInterests() {
    try {
      this.allInterests = await getInterests();
      this.renderInterests();
    } catch (error) {
      console.error('Error loading interests:', error);
    }
  },

  render() {
    this.container.innerHTML = `
      <div class="onboarding-container">
        <!-- Step 1: Welcome -->
        <div class="onboarding-step active" data-step="1">
          <div class="step-content">
            <div class="step-icon">👋</div>
            <h1>Привіт!</h1>
            <p>Давай налаштуємо твій профіль, щоб знаходити найкращі події для тебе</p>
            <button class="primary-btn" id="start-onboarding">Почати</button>
          </div>
        </div>
        
        <!-- Step 2: Profile -->
        <div class="onboarding-step" data-step="2">
          <div class="step-content">
            <h2>Розкажи про себе</h2>
            <div class="profile-form">
              <div class="avatar-upload">
                <img id="avatar-preview" src="${TelegramAPI.user?.photo_url || ''}" alt="Avatar">
                <button class="change-avatar">Змінити</button>
              </div>
              <input type="text" id="display-name" placeholder="Як тебе називати?" maxlength="30">
              <input type="text" id="username" placeholder="Username (необов'язково)" maxlength="20">
              <textarea id="bio" placeholder="Про себе..." maxlength="150"></textarea>
            </div>
            <button class="primary-btn" id="save-profile">Далі</button>
          </div>
        </div>
        
        <!-- Step 3: Interests -->
        <div class="onboarding-step" data-step="3">
          <div class="step-content">
            <h2>Твої інтереси</h2>
            <p>Обери те, що тобі подобається (мін. 3)</p>
            <div class="interests-grid" id="interests-grid">
              <!-- Інтереси будуть додані динамічно -->
            </div>
            <p class="selected-count"><span id="interest-count">0</span>/25 обрано</p>
            <button class="primary-btn" id="save-interests" disabled>Далі</button>
          </div>
        </div>
        
        <!-- Step 4: Complete -->
        <div class="onboarding-step" data-step="4">
          <div class="step-content">
            <div class="step-icon">🎉</div>
            <h1>Готово!</h1>
            <p>Тепер ти можеш знаходити події та компанію біля себе</p>
            <button class="primary-btn" id="complete-onboarding">До головного екрану</button>
          </div>
        </div>
      </div>
      
      <!-- Progress dots -->
      <div class="progress-dots">
        <span class="dot active" data-step="1"></span>
        <span class="dot" data-step="2"></span>
        <span class="dot" data-step="3"></span>
        <span class="dot" data-step="4"></span>
      </div>
    `;
  },

  renderInterests() {
    const grid = document.getElementById('interests-grid');
    if (!grid) return;

    grid.innerHTML = this.allInterests.map(interest => `
      <button class="interest-chip ${this.selectedInterests.includes(interest.id) ? 'selected' : ''}" 
              data-id="${interest.id}">
        <span class="interest-icon">${interest.icon}</span>
        <span class="interest-name">${this.getLocalizedName(interest)}</span>
      </button>
    `).join('');

    // Attach click events
    grid.querySelectorAll('.interest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.toggleInterest(chip.dataset.id);
        TelegramAPI.hapticFeedback('light');
      });
    });
  },

  getLocalizedName(interest) {
    const lang = localStorage.getItem('preferred_language') || 'uk';
    return interest[`name_${lang}`] || interest.name_uk;
  },

  toggleInterest(interestId) {
    const index = this.selectedInterests.indexOf(interestId);
    if (index > -1) {
      this.selectedInterests.splice(index, 1);
    } else {
      this.selectedInterests.push(interestId);
    }
    this.updateUI();
  },

  updateUI() {
    // Update chip states
    document.querySelectorAll('.interest-chip').forEach(chip => {
      const isSelected = this.selectedInterests.includes(chip.dataset.id);
      chip.classList.toggle('selected', isSelected);
    });

    // Update counter
    const countEl = document.getElementById('interest-count');
    if (countEl) {
      countEl.textContent = this.selectedInterests.length;
    }

    // Update button state
    const saveBtn = document.getElementById('save-interests');
    if (saveBtn) {
      saveBtn.disabled = this.selectedInterests.length < 3;
    }
  },

  attachEvents() {
    // Step 1: Start
    document.getElementById('start-onboarding')?.addEventListener('click', () => {
      this.goToStep(2);
    });

    // Step 2: Save Profile
    document.getElementById('save-profile')?.addEventListener('click', () => {
      this.saveProfile();
    });

    // Step 3: Save Interests
    document.getElementById('save-interests')?.addEventListener('click', () => {
      this.saveInterests();
    });

    // Step 4: Complete
    document.getElementById('complete-onboarding')?.addEventListener('click', () => {
      this.completeOnboarding();
    });
  },

  goToStep(step) {
    this.currentStep = step;
    
    // Update step visibility
    document.querySelectorAll('.onboarding-step').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.step) === step);
    });

    // Update progress dots
    document.querySelectorAll('.progress-dots .dot').forEach(d => {
      d.classList.toggle('active', parseInt(d.dataset.step) === step);
    });

    TelegramAPI.hapticFeedback('light');
  },

  async saveProfile() {
    const userId = localStorage.getItem('user_id');
    const displayName = document.getElementById('display-name')?.value?.trim();
    
    if (!displayName) {
      TelegramAPI.showAlert('Вкажи своє ім\'я');
      return;
    }

    try {
      LoadingScreen.show();
      
      await updateProfile(userId, {
        display_name: displayName,
        username: document.getElementById('username')?.value?.trim() || null,
        bio: document.getElementById('bio')?.value?.trim() || null
      });

      LoadingScreen.hide();
      this.goToStep(3);
    } catch (error) {
      LoadingScreen.hide();
      TelegramAPI.showAlert('Помилка збереження. Спробуй ще раз.');
      console.error('Save profile error:', error);
    }
  },

  async saveInterests() {
    const userId = localStorage.getItem('user_id');

    try {
      LoadingScreen.show();
      
      await setUserInterests(this.selectedInterests);
      
      LoadingScreen.hide();
      this.goToStep(4);
    } catch (error) {
      LoadingScreen.hide();
      TelegramAPI.showAlert('Помилка збереження. Спробуй ще раз.');
      console.error('Save interests error:', error);
    }
  },

  async completeOnboarding() {
    const userId = localStorage.getItem('user_id');

    try {
      LoadingScreen.show();
      
      await updateProfile(userId, {
        is_onboarded: true
      });

      LoadingScreen.hide();
      App.navigateTo('home');
    } catch (error) {
      LoadingScreen.hide();
      TelegramAPI.showAlert('Помилка. Спробуй ще раз.');
      console.error('Complete onboarding error:', error);
    }
  },

  show() {
    this.container.classList.remove('hidden');
    this.currentStep = 1;
    this.selectedInterests = [];
    this.render();
    this.renderInterests();
    this.updateUI();
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

### 2.7 Home Screen

```javascript
// screens/home.js

const HomeScreen = {
  container: null,

  init() {
    this.container = document.getElementById('home-screen');
    this.render();
    this.attachEvents();
    return this;
  },

  render() {
    this.container.innerHTML = `
      <div class="home-container">
        <!-- Header -->
        <header class="home-header">
          <div class="header-left">
            <button class="location-btn" id="location-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              <span class="location-name">Київ</span>
              <svg class="chevron" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
              </svg>
            </button>
          </div>
          <h1 class="header-title">LinkUp</h1>
          <div class="header-right">
            <button class="icon-btn" id="search-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5z"/>
              </svg>
            </button>
            <button class="icon-btn" id="settings-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>
          </div>
        </header>
        
        <!-- Map placeholder -->
        <div class="map-container" id="map-container">
          <div class="map-placeholder">
            <div class="map-content">
              <p>🗺️ Карта завантажується...</p>
            </div>
          </div>
        </div>
        
        <!-- Filter chips -->
        <div class="filter-section">
          <div class="filter-chips">
            <button class="filter-chip active" data-filter="all">Усі</button>
            <button class="filter-chip" data-filter="party">🎉 Party</button>
            <button class="filter-chip" data-filter="sport">⚽ Спорт</button>
            <button class="filter-chip" data-filter="food">🍕 Їжа</button>
            <button class="filter-chip" data-filter="music">🎵 Музика</button>
          </div>
        </div>
        
        <!-- Events list -->
        <div class="events-section">
          <div class="section-header">
            <h2>Поблизу вас</h2>
            <button class="see-all-btn">Дивитись усі</button>
          </div>
          <div class="events-list" id="events-list">
            <div class="empty-state">
              <p>😔 Поки що немає подій поблизу</p>
              <p>Створи першу!</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  attachEvents() {
    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.loadEvents(chip.dataset.filter);
      });
    });

    // Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      App.navigateTo('settings');
    });
  },

  async loadEvents(filter = 'all') {
    // TODO: Load events from Supabase
    console.log('Loading events with filter:', filter);
  },

  show() {
    this.container.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

### 2.8 App Router

```javascript
// app.js (оновлений)

const App = {
  currentScreen: null,
  screens: {},

  async init() {
    // Ініціалізуємо Telegram
    TelegramAPI.init();
    
    // Ініціалізуємо screens
    this.screens = {
      splash: SplashScreen.init(),
      login: LoginScreen.init(),
      onboarding: await OnboardingScreen.init(),
      home: HomeScreen.init()
    };

    // Завантажуємо перший screen
    await this.start();
  },

  async start() {
    // Показуємо splash
    const { isLoggedIn } = await this.screens.splash.show();
    this.screens.splash.hide();

    if (isLoggedIn) {
      // Перевіряємо онбординг
      const userId = localStorage.getItem('user_id');
      const profile = await getProfile(userId);
      
      if (profile.is_onboarded) {
        this.navigateTo('home');
      } else {
        this.navigateTo('onboarding');
      }
    } else {
      this.navigateTo('login');
    }
  },

  navigateTo(screenName) {
    // Ховаємо поточний screen
    if (this.currentScreen && this.screens[this.currentScreen]) {
      this.screens[this.currentScreen].hide();
    }

    // Показуємо новий screen
    if (this.screens[screenName]) {
      this.screens[screenName].show();
      this.currentScreen = screenName;
    }
  }
};

// Loading Screen
const LoadingScreen = {
  container: null,

  init() {
    this.createElement();
    return this;
  },

  createElement() {
    if (document.getElementById('loading-screen')) return;
    
    const el = document.createElement('div');
    el.id = 'loading-screen';
    el.className = 'loading-screen hidden';
    el.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
    `;
    document.body.appendChild(el);
    this.container = el;
  },

  show() {
    this.container.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  LoadingScreen.init();
  App.init();
});
```

---

## 📊 Sprint 1: Definition of Done

### Backend
- [ ] Supabase проект створено
- [ ] Всі таблиці створені з RLS
- [ ] RPC функції протестовані
- [ ] Валідація initData працює

### Frontend
- [ ] Splash Screen показується
- [ ] Telegram авторизація працює
- [ ] Онбординг проходиться
- [ ] Інтереси зберігаються
- [ ] Головний екран завантажується
- [ ] Навігація працює

### QA
- [ ] Тест на iOS (Safari)
- [ ] Тест на Android (Chrome)
- [ ] Edge cases перевірені

---

## ⏱️ Timeline Sprint 1

| День | Backend | Frontend |
|------|---------|----------|
| Пн | Supabase setup, Tables | Project setup |
| Вт | Tables, RLS | Splash, Telegram API |
| Ср | RPC Functions | Login, Auth |
| Чт | Testing, Fixes | Onboarding |
| Пт | Testing, Fixes | Home, Navigation |
| Сб | Code Review | Testing |
| Нд | Deploy to Staging | Bug Fixes |

---

## 🔗 Корисні посилання

| Ресурс | Посилання |
|--------|-----------|
| Supabase Docs | https://supabase.com/docs |
| Telegram WebApp | https://core.telegram.org/bots/webapps |
| Supabase Auth | https://supabase.com/docs/guides/auth |
| RLS Policy | https://supabase.com/docs/guides/auth/row-level-security |

---

## ▶️ Наступний Sprint

**Sprint 2: Map & Events**

- [ ] MapBox Integration
- [ ] Create Event Flow
- [ ] Event Listing
- [ ] Event Details

[Дивитись Sprint 2 →](./SPRINT_2_ROADMAP.md)
