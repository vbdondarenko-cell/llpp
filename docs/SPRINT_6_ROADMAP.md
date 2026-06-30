# 🚀 LinkUp Alpha Roadmap — Sprint 6: Premium & Monetization
## Мета: Інтеграція Telegram Stars для Premium підписки
## Тривалість: 1 тиждень

---

## 📋 Огляд Sprint 6

### Telegram Stars Integration:
```
User taps "Buy Premium"
    ↓
Telegram Payment (Stars)
    ↓
Server-Side Verification
    ↓
Premium Status Activated
    ↓
Expiration Calculated
```

### Premium Plans:

| Plan | Price | Duration | Savings |
|------|-------|----------|---------|
| Daily | 25 ⭐ | 1 day | - |
| Weekly | 100 ⭐ | 7 days | ~14% |
| Monthly | 400 ⭐ | 30 days | ~47% |
| Yearly | 1500 ⭐ | 365 days | ~70% |

### Результат Sprint 6:
- ✅ Telegram Stars інтеграція
- ✅ Premium статус в базі
- ✅ Термін дії Premium
- ✅ Premium Screen UI
- ✅ Premium Badge
- ✅ Premium Features

---

## 🗄️ Частина 1: Backend — Supabase

### 1.1 Оновлення таблиці: profiles

```sql
-- Додаємо Premium поля
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_plan TEXT, -- daily, weekly, monthly, yearly
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ;

-- Індекс для швидкого пошуку premium користувачів
CREATE INDEX IF NOT EXISTS idx_profiles_premium 
ON profiles(is_premium) 
WHERE is_premium = TRUE;

-- Функція для перевірки Premium статусу
CREATE OR REPLACE FUNCTION is_user_premium(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT is_premium, premium_expires_at INTO v_is_premium, v_expires_at
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_is_premium IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Перевіряємо чи не закінчився Premium
  IF v_is_premium AND (v_expires_at IS NULL OR v_expires_at > NOW()) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Функція для активації Premium
CREATE OR REPLACE FUNCTION activate_premium(
  p_user_id UUID DEFAULT auth.uid(),
  p_plan TEXT, -- daily, weekly, monthly, yearly
  p_days INTEGER -- кількість днів
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_expires_at TIMESTAMPTZ;
  v_current_expires TIMESTAMPTZ;
BEGIN
  -- Отримуємо поточний статус
  SELECT premium_expires_at INTO v_current_expires
  FROM profiles
  WHERE id = p_user_id;
  
  -- Якщо вже є Premium і він не закінчився - додаємо до поточної дати
  IF v_current_expires > NOW() THEN
    v_new_expires_at := v_current_expires + (p_days || ' days')::interval;
  ELSE
    -- Інакше - новий термін від сейчас
    v_new_expires_at := NOW() + (p_days || ' days')::interval;
  END IF;
  
  -- Оновлюємо профіль
  UPDATE profiles SET
    is_premium = TRUE,
    premium_plan = p_plan,
    premium_started_at = COALESCE(premium_started_at, NOW()),
    premium_expires_at = v_new_expires_at,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'is_premium', TRUE,
    'expires_at', v_new_expires_at,
    'plan', p_plan
  );
END;
$$;

-- Функція для деактивації (cron job буде викликати)
CREATE OR REPLACE FUNCTION deactivate_expired_premium()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE profiles SET
    is_premium = FALSE,
    premium_plan = NULL,
    updated_at = NOW()
  WHERE is_premium = TRUE
  AND premium_expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Функція для отримання Premium статусу
CREATE OR REPLACE FUNCTION get_premium_status(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object(
      'is_premium', FALSE
    );
  END IF;
  
  RETURN jsonb_build_object(
    'is_premium', 
      v_profile.is_premium 
      AND (v_profile.premium_expires_at IS NULL OR v_profile.premium_expires_at > NOW()),
    'expires_at', v_profile.premium_expires_at,
    'plan', v_profile.premium_plan,
    'started_at', v_profile.premium_started_at,
    'time_remaining', 
      CASE 
        WHEN v_profile.premium_expires_at > NOW() 
        THEN (v_profile.premium_expires_at - NOW())::interval
        ELSE NULL
      END
  );
END;
$$;
```

### 1.2 Таблиця: payment_history

```sql
-- Історія платежів
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Telegram Payment Data
  telegram_payload TEXT, -- Unique payment identifier
  telegram_provider_token TEXT,
  telegram_invoice_payload TEXT,
  telegram_amount INT, -- In stars
  telegram_charge_id TEXT, -- Telegram payment ID
  
  -- Subscription Details
  plan TEXT NOT NULL, -- daily, weekly, monthly, yearly
  days INT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  verified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- Індекси
CREATE INDEX idx_payment_user ON payment_history(user_id);
CREATE INDEX idx_payment_status ON payment_history(status);
CREATE INDEX idx_payment_telegram_id ON payment_history(telegram_charge_id);

-- RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
ON payment_history FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service can manage payments"
ON payment_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = TRUE
  )
);
```

### 1.3 RPC для платежів

```sql
-- Створення invoice для Telegram
CREATE OR REPLACE FUNCTION create_premium_invoice(
  p_plan TEXT -- daily, weekly, monthly, yearly
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_payload TEXT;
  v_amount INT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Ціни в Stars
  CASE p_plan
    WHEN 'daily' THEN 
      v_amount := 25;
      v_title := 'LinkUp Premium - 1 день';
      v_description := 'Один день Premium доступу';
    WHEN 'weekly' THEN 
      v_amount := 100;
      v_title := 'LinkUp Premium - Тиждень';
      v_description := 'Тиждень Premium доступу';
    WHEN 'monthly' THEN 
      v_amount := 400;
      v_title := 'LinkUp Premium - Місяць';
      v_description := 'Місяць Premium доступу';
    WHEN 'yearly' THEN 
      v_amount := 1500;
      v_title := 'LinkUp Premium - Рік';
      v_description := 'Рік Premium доступу';
    ELSE
      RAISE EXCEPTION 'Invalid plan';
  END CASE;
  
  -- Генеруємо унікальний payload
  v_payload := v_user_id::text || '_' || p_plan || '_' || EXTRACT(EPOCH FROM NOW())::text;
  
  RETURN jsonb_build_object(
    'amount', v_amount,
    'title', v_title,
    'description', v_description,
    'payload', v_payload
  );
END;
$$;

-- Підтвердження платежу (викликається після Telegram webhook)
CREATE OR REPLACE FUNCTION verify_payment(
  p_telegram_charge_id TEXT,
  p_telegram_payload TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload_parts TEXT[];
  v_user_id UUID;
  v_plan TEXT;
  v_days INT;
BEGIN
  -- Розпарсюємо payload: user_id_plan_timestamp
  v_payload_parts := string_to_array(p_telegram_payload, '_');
  v_user_id := v_payload_parts[1]::UUID;
  v_plan := v_payload_parts[2];
  
  -- Перевіряємо що це наш користувач
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Invalid payload';
  END IF;
  
  -- Розраховуємо дні
  CASE v_plan
    WHEN 'daily' THEN v_days := 1;
    WHEN 'weekly' THEN v_days := 7;
    WHEN 'monthly' THEN v_days := 30;
    WHEN 'yearly' THEN v_days := 365;
  END CASE;
  
  -- Активуємо Premium
  PERFORM activate_premium(v_user_id, v_plan, v_days);
  
  -- Оновлюємо статус платежу
  UPDATE payment_history SET
    status = 'completed',
    verified = TRUE,
    verified_at = NOW(),
    telegram_charge_id = p_telegram_charge_id
  WHERE telegram_payload = p_telegram_payload
  AND user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Payment verified and premium activated'
  );
END;
$$;

-- Отримання історії платежів
CREATE OR REPLACE FUNCTION get_payment_history()
RETURNS TABLE (
  id UUID,
  plan TEXT,
  days INT,
  status TEXT,
  created_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.id,
    ph.plan,
    ph.days,
    ph.status,
    ph.created_at,
    ph.verified_at
  FROM payment_history ph
  WHERE ph.user_id = auth.uid()
  ORDER BY ph.created_at DESC;
END;
$$;
```

### 1.4 Premium Features Logic

```sql
-- Перевірка Premium для лімітів (оновлена логіка)
CREATE OR REPLACE FUNCTION get_user_event_limit(p_user_id UUID DEFAULT auth.uid())
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_user_premium(p_user_id) THEN
    RETURN 50; -- Premium: більше подій
  ELSE
    RETURN 10; -- Free: стандартний ліміт
  END IF;
END;
$$;

-- Перевірка Premium для фільтрів
CREATE OR REPLACE FUNCTION get_user_filter_limit(p_user_id UUID DEFAULT auth.uid())
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_user_premium(p_user_id) THEN
    RETURN 100; -- Premium: більше фільтрів
  ELSE
    RETURN 10; -- Free: стандартний ліміт
  END IF;
END;
$$;
```

---

## 🎨 Частина 2: Frontend

### 2.1 Premium Plans Data

```javascript
// data/premium-plans.js

const PREMIUM_PLANS = [
  {
    id: 'daily',
    name: '1 день',
    days: 1,
    stars: 25,
    description: 'Спробувати Premium',
    badge: null,
    features: null
  },
  {
    id: 'weekly',
    name: 'Тиждень',
    days: 7,
    stars: 100,
    description: 'Найкраще для подорожей',
    badge: 'Вигідно',
    features: null
  },
  {
    id: 'monthly',
    name: 'Місяць',
    days: 30,
    stars: 400,
    description: 'Популярний вибір',
    badge: 'Популярне',
    features: null
  },
  {
    id: 'yearly',
    name: 'Рік',
    days: 365,
    stars: 1500,
    description: 'Максимальна вигода',
    badge: 'Знижка 70%',
    features: null
  }
];

const PREMIUM_FEATURES = [
  {
    icon: '✨',
    title: 'Безлімітні події',
    description: 'Створюй до 50 подій'
  },
  {
    icon: '🔍',
    title: 'Пріоритет у пошуку',
    description: 'Твої події вище в результатах'
  },
  {
    icon: '🎨',
    title: 'Розширені фільтри',
    description: '100+ фільтрів для пошуку'
  },
  {
    icon: '⭐',
    title: 'VIP-підтримка',
    description: 'Пріоритетна підтримка 24/7'
  },
  {
    icon: '📊',
    title: 'Аналітика',
    description: 'Детальна статистика подій'
  },
  {
    icon: '🎁',
    title: 'Ексклюзивні можливості',
    description: 'Ранній доступ до нових фіч'
  }
];
```

### 2.2 Premium Service

```javascript
// services/premium.js

const PremiumService = {
  supabase: null,

  init(supabaseClient) {
    this.supabase = supabaseClient;
    return this;
  },

  // Отримати Premium статус
  async getStatus() {
    const { data, error } = await this.supabase.rpc('get_premium_status');
    
    if (error) throw error;
    return data;
  },

  // Перевірити чи Premium
  async isPremium() {
    try {
      const status = await this.getStatus();
      return status?.is_premium || false;
    } catch {
      return false;
    }
  },

  // Отримати історію платежів
  async getPaymentHistory() {
    const { data, error } = await this.supabase.rpc('get_payment_history');
    
    if (error) throw error;
    return data || [];
  },

  // Отримати дані для invoice
  async createInvoice(planId) {
    const { data, error } = await this.supabase.rpc('create_premium_invoice', {
      p_plan: planId
    });
    
    if (error) throw error;
    return data;
  },

  // Форматування часу
  formatTimeRemaining(expiresAt) {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} д. ${hours} год.`;
    }
    return `${hours} год.`;
  }
};
```

### 2.3 Premium Screen

```javascript
// screens/premium-screen.js

const PremiumScreen = {
  container: null,
  status: null,
  plans: PREMIUM_PLANS,
  features: PREMIUM_FEATURES,

  init() {
    this.container = document.getElementById('premium-screen');
    return this;
  },

  async load() {
    try {
      LoadingScreen.show();
      
      this.status = await PremiumService.getStatus();
      
      LoadingScreen.hide();
      this.render();
      this.attachEvents();
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Error loading premium:', error);
    }
  },

  render() {
    const isPremium = this.status?.is_premium;
    const expiresAt = this.status?.expires_at;
    const timeRemaining = PremiumService.formatTimeRemaining(expiresAt);

    this.container.innerHTML = `
      <div class="premium-screen">
        <header class="premium-header">
          <button class="back-btn" id="premium-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>Premium</h2>
          <div class="header-spacer"></div>
        </header>

        ${isPremium ? this.renderActivePremium(timeRemaining) : this.renderUpgradePremium()}

        <!-- Features -->
        <div class="premium-features">
          <h3>Що ти отримуєш</h3>
          <div class="features-list">
            ${this.features.map(f => `
              <div class="feature-item">
                <div class="feature-icon">${f.icon}</div>
                <div class="feature-content">
                  <h4>${f.title}</h4>
                  <p>${f.description}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Plans -->
        ${!isPremium ? `
          <div class="premium-plans">
            <h3>Обери план</h3>
            <div class="plans-list">
              ${this.plans.map(plan => `
                <button class="plan-card" data-plan="${plan.id}">
                  <div class="plan-header">
                    <span class="plan-name">${plan.name}</span>
                    ${plan.badge ? `<span class="plan-badge ${plan.badge === 'Популярне' ? 'popular' : ''}">${plan.badge}</span>` : ''}
                  </div>
                  <div class="plan-price">
                    <span class="stars-icon">⭐</span>
                    <span class="price">${plan.stars}</span>
                  </div>
                  <p class="plan-description">${plan.description}</p>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Payment History -->
        ${isPremium ? `
          <div class="payment-history">
            <h3>Історія платежів</h3>
            <div class="history-list" id="history-list">
              <p class="no-history">Завантаження...</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderActivePremium(timeRemaining) {
    return `
      <div class="premium-status active">
        <div class="status-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
          </svg>
        </div>
        <div class="status-content">
          <h2>LinkUp Premium</h2>
          ${timeRemaining ? `
            <p class="status-expires">Активний до: ${this.formatDate(this.status.expires_at)}</p>
            <p class="status-time">Залишилось: ${timeRemaining}</p>
          ` : `
            <p class="status-unlimited">Безстроковий Premium</p>
          `}
        </div>
        <div class="premium-badge">
          <span>PRO</span>
        </div>
      </div>
    `;
  },

  renderUpgradePremium() {
    return `
      <div class="premium-hero">
        <div class="hero-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
          </svg>
        </div>
        <h2>Розблокуй безмежні можливості</h2>
        <p>Отримай максимум від LinkUp з Premium</p>
        <button class="upgrade-btn" id="upgrade-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/>
          </svg>
          Придбати Premium
        </button>
      </div>
    `;
  },

  async loadPaymentHistory() {
    try {
      const history = await PremiumService.getPaymentHistory();
      
      const list = document.getElementById('history-list');
      if (!list) return;

      if (history.length === 0) {
        list.innerHTML = '<p class="no-history">Немає платежів</p>';
        return;
      }

      list.innerHTML = history.map(p => `
        <div class="history-item">
          <div class="history-info">
            <span class="history-plan">${this.getPlanName(p.plan)}</span>
            <span class="history-date">${this.formatDate(p.created_at)}</span>
          </div>
          <div class="history-status ${p.status}">
            ${p.status === 'completed' ? '✅' : p.status === 'pending' ? '⏳' : '❌'}
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading history:', error);
    }
  },

  getPlanName(planId) {
    const plan = this.plans.find(p => p.id === planId);
    return plan ? plan.name : planId;
  },

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  },

  attachEvents() {
    // Back button
    document.getElementById('premium-back')?.addEventListener('click', () => {
      App.navigateTo('profile');
    });

    // Upgrade button
    document.getElementById('upgrade-btn')?.addEventListener('click', () => {
      this.showPlanSelector();
    });

    // Plan cards
    document.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => {
        const planId = card.dataset.plan;
        this.selectPlan(planId);
      });
    });

    // Load payment history if premium
    if (this.status?.is_premium) {
      this.loadPaymentHistory();
    }
  },

  showPlanSelector() {
    BottomSheet.open(`
      <div class="plan-selector">
        <h3>Обери план Premium</h3>
        <div class="selector-plans">
          ${this.plans.map(plan => `
            <button class="selector-plan" data-plan="${plan.id}">
              <div class="selector-info">
                <span class="selector-name">${plan.name}</span>
                <span class="selector-price">⭐ ${plan.stars}</span>
              </div>
              ${plan.badge ? `<span class="selector-badge">${plan.badge}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `);

    document.querySelectorAll('.selector-plan').forEach(btn => {
      btn.addEventListener('click', () => {
        BottomSheet.close();
        this.selectPlan(btn.dataset.plan);
      });
    });
  },

  async selectPlan(planId) {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) return;

    // Запит на підтвердження
    const confirmed = await TelegramAPI.showConfirm(
      `Придбати ${plan.name} за ⭐ ${plan.stars}?`
    );

    if (!confirmed) return;

    try {
      LoadingScreen.show('Підготовка платежу...');

      // Отримуємо дані для invoice
      const invoiceData = await PremiumService.createInvoice(planId);

      LoadingScreen.hide();

      // Викликаємо Telegram Payment
      await this.initiatePayment(invoiceData, plan);

    } catch (error) {
      LoadingScreen.hide();
      console.error('Payment error:', error);
      TelegramAPI.showAlert('Помилка: ' + error.message);
    }
  },

  async initiatePayment(invoiceData, plan) {
    // Telegram WebApp Payment
    // https://core.telegram.org/bots/webapps#payments
    
    const botId = await TelegramAPI.getBotId(); // Ваш bot ID
    
    const paymentData = {
      apiId: YOUR_API_ID,
      apiHash: YOUR_API_HASH,
      botId: botId,
      title: invoiceData.title,
      description: invoiceData.description,
      payload: invoiceData.payload,
      currency: 'XTR', // Telegram Stars
      prices: [{ label: invoiceData.title, amount: invoiceData.amount }]
    };

    try {
      // Використовуємо Telegram Payments
      const result = await Telegram.WebApp.openInvoice(paymentData.payload);
      
      // Telegram автоматично обробляє платіж і викликає onInvoiceClosed
      Telegram.WebApp.onInvoiceClosed = async (invoiceId, status) => {
        if (status === 'paid') {
          await this.handlePaymentSuccess(plan);
        } else {
          TelegramAPI.showAlert('Платіж скасовано');
        }
      };

    } catch (error) {
      console.error('Payment initiation error:', error);
      
      // Fallback: показуємо QR код або альтернативний метод
      TelegramAPI.showAlert('Помилка ініціалізації платежу');
    }
  },

  async handlePaymentSuccess(plan) {
    try {
      LoadingScreen.show('Підтвердження...');

      // Запит на сервер для активації
      // В реальному додатку це буде webhook від Telegram
      const response = await fetch('/api/premium/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: plan.id,
          user_id: localStorage.getItem('user_id')
        })
      });

      const result = await response.json();

      LoadingScreen.hide();

      if (result.success) {
        TelegramAPI.hapticFeedback('success');
        TelegramAPI.showAlert(
          `🎉 Premium ${plan.name} активовано!\n\nДякуємо за підтримку!`,
          () => {
            this.load(); // Перезавантажуємо екран
          }
        );
      } else {
        TelegramAPI.showAlert('Помилка активації: ' + result.error);
      }

    } catch (error) {
      LoadingScreen.hide();
      console.error('Activation error:', error);
      TelegramAPI.showAlert('Помилка активації Premium');
    }
  },

  show() {
    this.container.classList.remove('hidden');
    this.load();
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

### 2.4 Premium Badge Component

```javascript
// components/premium-badge.js

const PremiumBadge = {
  // Маленький badge для профілю
  renderSmall() {
    return `
      <span class="premium-badge-small">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/>
        </svg>
        PRO
      </span>
    `;
  },

  // Badge для карток
  renderCard() {
    return `
      <div class="premium-card-badge">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
        </svg>
        <span>Premium</span>
      </div>
    `;
  },

  // Large badge для header
  renderLarge() {
    return `
      <div class="premium-badge-large">
        <div class="badge-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
          </svg>
        </div>
        <span class="badge-text">LinkUp Premium</span>
      </div>
    `;
  }
};
```

### 2.5 Telegram Bot Setup (Backend)

```javascript
// server/telegram-bot.js (Node.js example)

const { Composer, Grammy, session } = require('grammy');
const { api, FlowError } = require('grammy');

const bot = new Grammy({
  token: process.env.TELEGRAM_BOT_TOKEN
});

// Handle /start
bot.command('start', async (ctx) => {
  await ctx.reply('Вітаємо в LinkUp Premium! 🌟');
});

// Payment webhook handler
bot.on('pre_checkout_query', async (ctx) => {
  // Підтверджуємо pre-checkout
  await ctx.answerPreCheckoutQuery(true);
});

bot.on('successful_payment', async (ctx) => {
  const payment = ctx.message.successful_payment;
  
  console.log('Payment received:', {
    userId: ctx.from.id,
    amount: payment.total_amount,
    currency: payment.currency,
    invoicePayload: payment.invoice_payload
  });

  // Тут викликаєте ваш backend для активації Premium
  try {
    await fetch('https://your-api.com/premium/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_SECRET
      },
      body: JSON.stringify({
        telegram_user_id: ctx.from.id,
        payment_payload: payment.invoice_payload,
        charge_id: payment.provider_payment_charge_id
      })
    });

    await ctx.reply('✅ Premium активовано! Дякуємо за покупку!');
  } catch (error) {
    console.error('Activation error:', error);
    await ctx.reply('❌ Виникла помилка. Зверніться до підтримки.');
  }
});

// Start bot
bot.start();
```

### 2.6 Integration Example

```javascript
// Приклад використання Premium в профілі

// Profile Screen - показуємо Premium badge
const profileHtml = `
  <div class="profile-header">
    <img src="${avatar}" alt="Avatar" class="avatar">
    ${isPremium ? PremiumBadge.renderSmall() : ''}
  </div>
`;

// Event Card - Premium indicator
const eventCardHtml = `
  <div class="event-card ${isPremium ? 'premium-featured' : ''}">
    ${isPremium ? '<span class="premium-featured-badge">⭐ Premium</span>' : ''}
    ...
  </div>
`;

// Premium Gate - показуємо lock для non-premium
const premiumFeatureHtml = `
  ${hasPremium ? featureContent : `
    <div class="premium-gate">
      <span class="lock-icon">🔒</span>
      <p>Доступно тільки для Premium</p>
      <button onclick="App.navigateTo('premium')">Отримати Premium</button>
    </div>
  `}
`;
```

---

## 📊 Sprint 6: Definition of Done

### Backend
- [ ] Premium fields added to profiles
- [ ] `is_user_premium()` function
- [ ] `activate_premium()` function
- [ ] `deactivate_expired_premium()` function
- [ ] `get_premium_status()` function
- [ ] `payment_history` table
- [ ] `create_premium_invoice()` function
- [ ] `verify_payment()` function
- [ ] Telegram Bot payment handlers

### Frontend
- [ ] Premium Screen UI
- [ ] Plan cards display
- [ ] Features list
- [ ] Telegram Stars payment flow
- [ ] Payment success handling
- [ ] Premium Badge component
- [ ] Active Premium state
- [ ] Payment history

### Telegram Integration
- [ ] Bot configured for payments
- [ ] Webhook handler
- [ ] Payment verification
- [ ] Premium activation

---

## ⏱️ Timeline Sprint 6

| День | Backend | Frontend |
|------|---------|----------|
| Пн | Database fields | Premium Screen UI |
| Вт | RPC functions | Plan selector |
| Ср | Payment table | Payment flow |
| Чт | Telegram Bot | Success handling |
| Пт | Testing | Integration |
| Сб | Code Review | Testing |
| Нд | Deploy | Bug Fixes |

---

## 💰 Premium Pricing

| Plan | Stars | Days | Effective/day |
|------|-------|------|----------------|
| Daily | 25 | 1 | 25.00 |
| Weekly | 100 | 7 | 14.29 |
| Monthly | 400 | 30 | 13.33 |
| Yearly | 1500 | 365 | 4.11 |

**Savings vs Daily:**
- Weekly: ~43% cheaper
- Monthly: ~47% cheaper
- Yearly: ~84% cheaper

---

## 🔗 Telegram Payments Documentation

| Resource | Link |
|-----------|------|
| Telegram Payments | https://core.telegram.org/bots/payments |
| Payment Provider | https://core.telegram.org/bots/payments#payment-providers |
| WebApp Payments | https://core.telegram.org/bots/webapps#payments |

---

## ▶️ Наступний Sprint

**Sprint 7: Polish & Launch**

- Push Notifications
- Analytics
- Performance Optimization
- Launch Checklist

[Дивитись Sprint 7 →](./SPRINT_7_ROADMAP.md)
