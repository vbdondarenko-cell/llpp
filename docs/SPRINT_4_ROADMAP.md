# 🚀 LinkUp Alpha Roadmap — Sprint 4: Join Flow & Requests
## Мета: Організатор керує учасниками
## Тривалість: 1 тиждень

---

## 📋 Огляд Sprint 4

### Мета Sprint 4:
```
Користувач натискає "Приєднатися" → подає заявку → 
організатор бачить заявку → приймає/відхиляє
```

### Результат Sprint 4:
- ✅ Кнопка "Приєднатися" / "Подати заявку"
- ✅ Список заявок для організатора
- ✅ Прийняти заявку
- ✅ Відхилити заявку
- ✅ Скасувати свою заявку
- ✅ Покинути подію

---

## 🗄️ Частина 1: Backend — Supabase

### 1.1 Оновлена таблиця: event_participants

```sql
-- Вже створена в Sprint 2, потрібно оновити структуру
-- Додаємо повідомлення для заявки
ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS message TEXT;

-- Додаємо індекс для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_participants_pending 
ON event_participants(event_id, status) 
WHERE status = 'pending';
```

### 1.2 RPC Функції

```sql
-- Подати заявку на вступ до події
CREATE OR REPLACE FUNCTION join_event(
  p_event_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event events;
  v_user_id UUID;
  v_existing RECORD;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Отримуємо подію
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF v_event IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found'
    );
  END IF;
  
  -- Перевіряємо чи подія активна
  IF v_event.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event is not active'
    );
  END IF;
  
  -- Перевіряємо чи подія вже почалась
  IF v_event.event_date < CURRENT_DATE OR 
     (v_event.event_date = CURRENT_DATE AND v_event.event_time <= CURRENT_TIME) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event has already started'
    );
  END IF;
  
  -- Перевіряємо чи користувач вже подав заявку
  SELECT * INTO v_existing
  FROM event_participants
  WHERE event_id = p_event_id AND user_id = v_user_id;
  
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already applied or joined',
      'status', v_existing.status
    );
  END IF;
  
  -- Перевіряємо чи є місця
  IF v_event.current_participants >= v_event.max_participants THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No available spots'
    );
  END IF;
  
  -- Перевіряємо чи не користувач є організатором
  IF v_event.organizer_id = v_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are the organizer'
    );
  END IF;
  
  -- Створюємо заявку
  IF v_event.requires_approval THEN
    -- Потрібно схвалення
    INSERT INTO event_participants (event_id, user_id, status, message)
    VALUES (p_event_id, v_user_id, 'pending', p_message);
    
    RETURN jsonb_build_object(
      'success', true,
      'status', 'pending',
      'message', 'Request submitted, waiting for approval'
    );
  ELSE
    -- Відкрита подія - приєднуємось одразу
    INSERT INTO event_participants (event_id, user_id, status)
    VALUES (p_event_id, v_user_id, 'approved');
    
    -- Оновлюємо лічильник
    UPDATE events
    SET current_participants = current_participants + 1
    WHERE id = p_event_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'message', 'Joined successfully'
    );
  END IF;
END;
$$;
```

```sql
-- Прийняти заявку
CREATE OR REPLACE FUNCTION accept_request(
  p_participant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant event_participants;
  v_event events;
  v_result JSONB;
BEGIN
  -- Отримуємо заявку
  SELECT * INTO v_participant
  FROM event_participants
  WHERE id = p_participant_id;
  
  IF v_participant IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;
  
  -- Отримуємо подію
  SELECT * INTO v_event
  FROM events
  WHERE id = v_participant.event_id;
  
  -- Перевіряємо чи користувач є організатором
  IF v_event.organizer_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied'
    );
  END IF;
  
  -- Перевіряємо статус заявки
  IF v_participant.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request is not pending'
    );
  END IF;
  
  -- Перевіряємо чи є місця
  IF v_event.current_participants >= v_event.max_participants THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No available spots'
    );
  END IF;
  
  -- Приймаємо заявку
  UPDATE event_participants
  SET status = 'approved', updated_at = NOW()
  WHERE id = p_participant_id;
  
  -- Оновлюємо лічильник
  UPDATE events
  SET current_participants = current_participants + 1
  WHERE id = v_participant.event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Request accepted'
  );
END;
$$;
```

```sql
-- Відхилити заявку
CREATE OR REPLACE FUNCTION decline_request(
  p_participant_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant event_participants;
  v_event events;
BEGIN
  -- Отримуємо заявку
  SELECT * INTO v_participant
  FROM event_participants
  WHERE id = p_participant_id;
  
  IF v_participant IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;
  
  -- Отримуємо подію
  SELECT * INTO v_event
  FROM events
  WHERE id = v_participant.event_id;
  
  -- Перевіряємо чи користувач є організатором
  IF v_event.organizer_id != auth.uid() THEN
    -- Або сам користувач може відхилити свою заявку
    IF v_participant.user_id != auth.uid() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Access denied'
      );
    END IF;
  END IF;
  
  -- Відхиляємо заявку
  UPDATE event_participants
  SET status = 'rejected', updated_at = NOW()
  WHERE id = p_participant_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Request declined'
  );
END;
$$;
```

```sql
-- Покинути подію
CREATE OR REPLACE FUNCTION leave_event(
  p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant event_participants;
  v_event events;
BEGIN
  -- Отримуємо участь
  SELECT * INTO v_participant
  FROM event_participants
  WHERE event_id = p_event_id AND user_id = auth.uid();
  
  IF v_participant IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not a participant'
    );
  END IF;
  
  -- Отримуємо подію
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  -- Перевіряємо статус
  IF v_participant.status != 'approved' THEN
    -- Просто видаляємо заявку
    DELETE FROM event_participants WHERE id = v_participant.id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Request cancelled'
    );
  END IF;
  
  -- Перевіряємо чи подія вже почалась
  IF v_event.event_date < CURRENT_DATE OR 
     (v_event.event_date = CURRENT_DATE AND v_event.event_time <= CURRENT_TIME) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot leave after event started'
    );
  END IF;
  
  -- Видаляємо участь
  DELETE FROM event_participants WHERE id = v_participant.id;
  
  -- Зменшуємо лічильник
  UPDATE events
  SET current_participants = GREATEST(0, current_participants - 1)
  WHERE id = p_event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Left the event'
  );
END;
$$;
```

```sql
-- Отримати заявки на подію (для організатора)
CREATE OR REPLACE FUNCTION get_event_requests(
  p_event_id UUID,
  p_status TEXT DEFAULT 'pending'
)
RETURNS TABLE (
  participant_id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  user_username TEXT,
  message TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Перевіряємо доступ
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND organizer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    ep.id as participant_id,
    ep.user_id,
    p.display_name as user_name,
    p.avatar_url as user_avatar,
    p.username as user_username,
    ep.message,
    ep.status,
    ep.created_at
  FROM event_participants ep
  INNER JOIN profiles p ON ep.user_id = p.id
  WHERE ep.event_id = p_event_id
  AND (p_status IS NULL OR ep.status = p_status)
  ORDER BY ep.created_at DESC;
END;
$$;
```

```sql
-- Отримати мої заявки/участі
CREATE OR REPLACE FUNCTION get_my_events_status()
RETURNS TABLE (
  participant_id UUID,
  event_id UUID,
  event_title TEXT,
  event_date DATE,
  event_time TIME,
  organizer_name TEXT,
  event_location TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.id as participant_id,
    e.id as event_id,
    e.title as event_title,
    e.event_date,
    e.event_time,
    p.display_name as organizer_name,
    el.address as event_location,
    ep.status,
    ep.created_at
  FROM event_participants ep
  INNER JOIN events e ON ep.event_id = e.id
  INNER JOIN profiles p ON e.organizer_id = p.id
  LEFT JOIN event_locations el ON e.id = el.event_id
  WHERE ep.user_id = auth.uid()
  ORDER BY e.event_date ASC, e.event_time ASC;
END;
$$;
```

---

## 🎨 Частина 2: Frontend

### 2.1 Структура проекту (оновлена)

```
linkup-telegram-app/
├── screens/
│   ├── home.js
│   ├── event-detail.js       🆕 оновлено
│   ├── create-event.js
│   ├── location-picker.js
│   ├── my-events.js          🆕
│   └── event-requests.js     🆕
├── components/
│   ├── event-card.js
│   ├── bottom-sheet.js
│   ├── request-card.js       🆕
│   ├── empty-state.js        🆕
│   └── status-badge.js       🆕
└── services/
    ├── events.js             🆕
    └── notifications.js        🆕
```

### 2.2 Events Service

```javascript
// services/events.js

const EventsService = {
  supabase: null,

  init(supabaseClient) {
    this.supabase = supabaseClient;
    return this;
  },

  // Приєднатися до події
  async joinEvent(eventId, message = null) {
    const { data, error } = await this.supabase.rpc('join_event', {
      p_event_id: eventId,
      p_message: message
    });

    if (error) throw error;
    return data;
  },

  // Прийняти заявку
  async acceptRequest(participantId) {
    const { data, error } = await this.supabase.rpc('accept_request', {
      p_participant_id: participantId
    });

    if (error) throw error;
    return data;
  },

  // Відхилити заявку
  async declineRequest(participantId, reason = null) {
    const { data, error } = await this.supabase.rpc('decline_request', {
      p_participant_id: participantId,
      p_reason: reason
    });

    if (error) throw error;
    return data;
  },

  // Покинути подію
  async leaveEvent(eventId) {
    const { data, error } = await this.supabase.rpc('leave_event', {
      p_event_id: eventId
    });

    if (error) throw error;
    return data;
  },

  // Отримати заявки на подію
  async getEventRequests(eventId, status = 'pending') {
    const { data, error } = await this.supabase.rpc('get_event_requests', {
      p_event_id: eventId,
      p_status: status
    });

    if (error) throw error;
    return data || [];
  },

  // Отримати мої участі
  async getMyEventsStatus() {
    const { data, error } = await this.supabase.rpc('get_my_events_status');

    if (error) throw error;
    return data || [];
  },

  // Отримати деталі події з участю
  async getEventWithParticipation(eventId) {
    const { data, error } = await this.supabase.rpc('get_event_details', {
      p_event_id: eventId
    });

    if (error) throw error;
    return data;
  }
};
```

### 2.3 Request Card Component

```javascript
// components/request-card.js

const RequestCard = {
  // Картка заявки для організатора
  renderRequest(request, isOrganizer = false) {
    const statusClass = `status-${request.status}`;
    const timeAgo = this.formatTimeAgo(request.created_at);

    return `
      <div class="request-card" data-id="${request.participant_id}">
        <div class="request-user">
          <img 
            src="${request.user_avatar || '/img/default-avatar.png'}" 
            alt="${request.user_name}"
            class="request-avatar"
          >
          <div class="request-info">
            <h4>${request.user_name}</h4>
            <p class="request-username">@${request.user_username || 'unknown'}</p>
            ${request.message ? `<p class="request-message">"${request.message}"</p>` : ''}
            <span class="request-time">${timeAgo}</span>
          </div>
        </div>
        
        ${isOrganizer && request.status === 'pending' ? `
          <div class="request-actions">
            <button class="accept-btn" data-id="${request.participant_id}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Прийняти
            </button>
            <button class="decline-btn" data-id="${request.participant_id}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              Відхилити
            </button>
          </div>
        ` : `
          <div class="request-status">
            ${this.renderStatusBadge(request.status)}
          </div>
        `}
      </div>
    `;
  },

  // Картка участі для користувача
  renderMyParticipation(participation) {
    const statusClass = `status-${participation.status}`;
    const eventDate = this.formatEventDate(participation.event_date, participation.event_time);

    return `
      <div class="my-event-card" data-id="${participation.event_id}">
        <div class="event-date-badge">
          <span class="date-day">${this.getDay(participation.event_date)}</span>
          <span class="date-month">${this.getMonth(participation.event_date)}</span>
        </div>
        <div class="event-info">
          <h4>${participation.event_title}</h4>
          <p class="event-organizer">
            від ${participation.organizer_name}
          </p>
          <p class="event-time">${eventDate}</p>
          <p class="event-location">${participation.event_location || ''}</p>
        </div>
        <div class="participation-status">
          ${this.renderStatusBadge(participation.status)}
        </div>
      </div>
    `;
  },

  renderStatusBadge(status) {
    const badges = {
      pending: '<span class="badge pending">⏳ Очікує</span>',
      approved: '<span class="badge approved">✅ Прийнято</span>',
      rejected: '<span class="badge rejected">❌ Відхилено</span>',
      cancelled: '<span class="badge cancelled">🚫 Скасовано</span>'
    };
    return badges[status] || badges.pending;
  },

  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'щойно';
    if (diffMins < 60) return `${diffMins} хв. тому`;
    if (diffHours < 24) return `${diffHours} год. тому`;
    if (diffDays < 7) return `${diffDays} дн. тому`;
    return date.toLocaleDateString('uk-UA');
  },

  formatEventDate(date, time) {
    const dateObj = new Date(date);
    const day = dateObj.toLocaleDateString('uk-UA', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
    const timeStr = time ? time.substring(0, 5) : '';
    return `${day}, ${timeStr}`;
  },

  getDay(date) {
    return new Date(date).getDate();
  },

  getMonth(date) {
    return new Date(date).toLocaleDateString('uk-UA', { month: 'short' });
  }
};
```

### 2.4 Empty State Component

```javascript
// components/empty-state.js

const EmptyState = {
  render(type, options = {}) {
    const states = {
      no_events: {
        icon: '🔍',
        title: 'Немає подій',
        message: 'Спробуй змінити фільтри або створити свою подію'
      },
      no_requests: {
        icon: '📭',
        title: 'Немає заявок',
        message: 'Коли хтось подасть заявку, вона з\'явиться тут'
      },
      no_my_events: {
        icon: '🎯',
        title: 'Немає участі',
        message: 'Приєднайся до подій або створи свою'
      },
      pending_request: {
        icon: '⏳',
        title: 'Заявка на розгляді',
        message: 'Зачекай поки організатор розгляне твою заявку'
      },
      event_full: {
        icon: '👥',
        title: 'Місць немає',
        message: 'Ця подія вже заповнена'
      },
      error: {
        icon: '⚠️',
        title: 'Щось пішло не так',
        message: options.error || 'Спробуй ще раз пізніше'
      }
    };

    const state = states[type] || states.no_events;

    return `
      <div class="empty-state">
        <div class="empty-icon">${state.icon}</div>
        <h3>${state.title}</h3>
        <p>${state.message}</p>
        ${options.action ? `
          <button class="empty-action-btn" id="empty-action">
            ${options.action}
          </button>
        ` : ''}
      </div>
    `;
  }
};
```

### 2.5 Event Detail Screen (оновлений)

```javascript
// screens/event-detail.js

const EventDetailScreen = {
  container: null,
  eventId: null,
  eventData: null,

  init() {
    this.container = document.getElementById('event-detail-screen');
    return this;
  },

  async load(eventId) {
    this.eventId = eventId;
    
    try {
      LoadingScreen.show();
      
      this.eventData = await EventsService.getEventWithParticipation(eventId);
      
      LoadingScreen.hide();
      this.render();
      this.attachEvents();
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Error loading event:', error);
      this.showError();
    }
  },

  render() {
    const event = this.eventData;
    
    this.container.innerHTML = `
      <div class="event-detail-container">
        <header class="detail-header">
          <button class="back-btn" id="detail-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <div class="header-actions">
            ${event.is_organizer ? `
              <button class="icon-btn" id="manage-event-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </header>

        <div class="detail-content">
          <!-- Cover Image -->
          <div class="detail-cover">
            ${event.cover_image_url ? `
              <img src="${event.cover_image_url}" alt="${event.title}">
            ` : `
              <div class="cover-placeholder">
                <span class="category-icon">${this.getCategoryIcon(event.category)}</span>
              </div>
            `}
            <div class="cover-overlay">
              <span class="category-badge ${event.category}">${this.getCategoryLabel(event.category)}</span>
            </div>
          </div>

          <!-- Event Info -->
          <div class="detail-body">
            <h1 class="event-title">${event.title}</h1>
            
            <!-- Organizer -->
            <div class="organizer-section">
              <img 
                src="${event.organizer_avatar || '/img/default-avatar.png'}" 
                alt="${event.organizer_name}"
                class="organizer-avatar"
              >
              <div class="organizer-info">
                <span class="organizer-label">Організатор</span>
                <span class="organizer-name">${event.organizer_name}</span>
                ${event.organizer_rating ? `
                  <div class="organizer-rating">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <span>${event.organizer_rating}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Event Details -->
            <div class="info-section">
              <div class="info-row">
                <div class="info-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2z"/>
                  </svg>
                </div>
                <div class="info-content">
                  <p class="info-label">Дата та час</p>
                  <p class="info-value">${this.formatDateTime(event.event_date, event.event_time)}</p>
                  <p class="info-sub">Тривалість: ${event.duration_minutes} хв</p>
                </div>
              </div>

              <div class="info-row">
                <div class="info-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                </div>
                <div class="info-content">
                  <p class="info-label">Місце</p>
                  <p class="info-value">${event.place_name || event.address || 'Не вказано'}</p>
                  ${event.address ? `<p class="info-sub">${event.address}</p>` : ''}
                </div>
              </div>

              <div class="info-row">
                <div class="info-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>
                  </svg>
                </div>
                <div class="info-content">
                  <p class="info-label">Учасники</p>
                  <div class="participants-display">
                    <span class="participants-count">
                      ${event.current_participants}/${event.max_participants}
                    </span>
                    <div class="participants-bar">
                      <div class="bar-fill" style="width: ${(event.current_participants / event.max_participants) * 100}%"></div>
                    </div>
                    ${event.current_participants >= event.max_participants ? `
                      <span class="full-badge">Повністю</span>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>

            <!-- Description -->
            ${event.description ? `
              <div class="description-section">
                <h3>Про подію</h3>
                <p>${event.description}</p>
              </div>
            ` : ''}

            <!-- Join Status -->
            ${event.is_joined ? this.renderJoinStatus(event) : ''}
          </div>
        </div>

        <!-- Action Footer -->
        ${!event.is_organizer ? `
          <div class="detail-footer">
            ${this.renderActionButton(event)}
          </div>
        ` : `
          <div class="detail-footer organizer">
            <button class="action-btn secondary" id="view-requests-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              Заявки (${event.pending_count || 0})
            </button>
            <button class="action-btn primary" id="edit-event-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Редагувати
            </button>
          </div>
        `}
      </div>
    `;
  },

  renderJoinStatus(event) {
    const statusMessages = {
      pending: '⏳ Твоя заявка на розгляді',
      approved: '✅ Ти прийнятий! Можеш йти на подію',
      rejected: '❌ На жаль, заявку відхилено'
    };

    return `
      <div class="join-status status-${event.join_status}">
        <div class="status-icon">
          ${event.join_status === 'pending' ? '⏳' : event.join_status === 'approved' ? '✅' : '❌'}
        </div>
        <div class="status-content">
          <p class="status-title">${statusMessages[event.join_status] || ''}</p>
          ${event.join_status !== 'rejected' ? `
            <button class="leave-btn" id="leave-event-btn">
              ${event.join_status === 'approved' ? 'Покинути подію' : 'Скасувати заявку'}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  renderActionButton(event) {
    // Якщо повністю
    if (event.current_participants >= event.max_participants && !event.is_joined) {
      return `
        <button class="action-btn disabled" disabled>
          Місць немає
        </button>
      `;
    }

    // Якщо вже приєднався
    if (event.is_joined && event.join_status === 'approved') {
      return `
        <button class="action-btn secondary" id="leave-btn">
          Вийти з події
        </button>
      `;
    }

    // Кнопка приєднання
    return `
      <button class="action-btn primary" id="join-btn">
        ${event.requires_approval ? 'Подати заявку' : 'Приєднатися'}
      </button>
    `;
  },

  attachEvents() {
    // Back button
    document.getElementById('detail-back')?.addEventListener('click', () => {
      App.navigateTo('home');
    });

    // Join button
    document.getElementById('join-btn')?.addEventListener('click', () => {
      this.showJoinModal();
    });

    // Leave button
    document.getElementById('leave-btn')?.addEventListener('click', () => {
      this.leaveEvent();
    });

    // Leave event (status view)
    document.getElementById('leave-event-btn')?.addEventListener('click', () => {
      this.leaveEvent();
    });

    // View requests (organizer)
    document.getElementById('view-requests-btn')?.addEventListener('click', () => {
      App.navigateTo('event-requests', { eventId: this.eventId });
    });

    // Edit event (organizer)
    document.getElementById('edit-event-btn')?.addEventListener('click', () => {
      App.navigateTo('edit-event', { eventId: this.eventId });
    });
  },

  showJoinModal() {
    const event = this.eventData;
    
    if (event.requires_approval) {
      // Показуємо модалку з повідомленням
      BottomSheet.open(`
        <div class="join-modal">
          <h3>Подати заявку</h3>
          <p>Напиши коротко чому хочеш приєднатися (необов'язково)</p>
          <textarea 
            id="join-message" 
            placeholder="Привіт! Мене звати... хотів би приєднатися..."
            maxlength="200"
          ></textarea>
          <div class="modal-actions">
            <button class="cancel-btn" onclick="BottomSheet.close()">Скасувати</button>
            <button class="submit-btn" id="submit-join">Відправити</button>
          </div>
        </div>
      `);

      document.getElementById('submit-join')?.addEventListener('click', () => {
        const message = document.getElementById('join-message')?.value || '';
        this.joinEvent(message);
      });
    } else {
      // Приєднуємось одразу
      this.joinEvent();
    }
  },

  async joinEvent(message = null) {
    try {
      LoadingScreen.show('Приєднання...');
      
      const result = await EventsService.joinEvent(this.eventId, message);
      
      LoadingScreen.hide();
      BottomSheet.close();
      
      if (result.success) {
        TelegramAPI.hapticFeedback('success');
        
        if (result.status === 'approved') {
          TelegramAPI.showAlert('✅ Ти приєднаний до події!');
        } else {
          TelegramAPI.showAlert('⏳ Заявку відправлено. Очікуй схвалення!');
        }
        
        // Перезавантажуємо деталі
        await this.load(this.eventId);
      } else {
        TelegramAPI.showAlert('❌ ' + (result.error || 'Помилка'));
      }
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Join error:', error);
      TelegramAPI.showAlert('❌ Помилка: ' + error.message);
    }
  },

  async leaveEvent() {
    const confirmed = await TelegramAPI.showConfirm('Покинути цю подію?');
    
    if (!confirmed) return;

    try {
      LoadingScreen.show('Вихід...');
      
      const result = await EventsService.leaveEvent(this.eventId);
      
      LoadingScreen.hide();
      
      if (result.success) {
        TelegramAPI.hapticFeedback('warning');
        TelegramAPI.showAlert('👋 Ти покинув подію');
        await this.load(this.eventId);
      } else {
        TelegramAPI.showAlert('❌ ' + (result.error || 'Помилка'));
      }
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Leave error:', error);
      TelegramAPI.showAlert('❌ Помилка: ' + error.message);
    }
  },

  showError() {
    this.container.innerHTML = `
      <div class="error-container">
        ${EmptyState.render('error', { error: 'Не вдалося завантажити подію' })}
        <button class="back-btn" onclick="App.navigateTo('home')">На головну</button>
      </div>
    `;
  },

  getCategoryIcon(category) {
    const icons = {
      party: '🎉', sport: '⚽', food: '🍕', music: '🎵',
      art: '🎨', outdoor: '🏕️', game: '🎮', talk: '💬',
      dating: '💕', networking: '💼', study: '📚', other: '✨'
    };
    return icons[category] || '📍';
  },

  getCategoryLabel(category) {
    const labels = {
      party: 'Party', sport: 'Спорт', food: 'Їжа', music: 'Музика',
      art: 'Мистецтво', outdoor: 'На природі', game: 'Ігри', talk: 'Трепет',
      dating: 'Побачення', networking: 'Нетворкінг', study: 'Навчання', other: 'Інше'
    };
    return labels[category] || category;
  },

  formatDateTime(date, time) {
    const dateObj = new Date(date);
    const day = dateObj.toLocaleDateString('uk-UA', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    const timeStr = time ? time.substring(0, 5) : '';
    return `${day}, ${timeStr}`;
  },

  show() {
    this.container.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

### 2.6 Event Requests Screen

```javascript
// screens/event-requests.js

const EventRequestsScreen = {
  container: null,
  eventId: null,
  requests: [],
  currentTab: 'pending',

  init() {
    this.container = document.getElementById('requests-screen');
    return this;
  },

  async load(eventId) {
    this.eventId = eventId;
    
    try {
      LoadingScreen.show();
      
      this.requests = await EventsService.getEventRequests(eventId, null);
      
      LoadingScreen.hide();
      this.render();
      this.attachEvents();
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Error loading requests:', error);
      TelegramAPI.showAlert('Помилка завантаження');
    }
  },

  render() {
    const pending = this.requests.filter(r => r.status === 'pending');
    const approved = this.requests.filter(r => r.status === 'approved');
    const rejected = this.requests.filter(r => r.status === 'rejected');

    this.container.innerHTML = `
      <div class="requests-container">
        <header class="requests-header">
          <button class="back-btn" id="requests-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>Заявки</h2>
          <span class="pending-count">${pending.length}</span>
        </header>

        <div class="requests-tabs">
          <button class="tab-btn ${this.currentTab === 'pending' ? 'active' : ''}" data-tab="pending">
            Очікують (${pending.length})
          </button>
          <button class="tab-btn ${this.currentTab === 'approved' ? 'active' : ''}" data-tab="approved">
            Прийняті (${approved.length})
          </button>
          <button class="tab-btn ${this.currentTab === 'rejected' ? 'active' : ''}" data-tab="rejected">
            Відхилені (${rejected.length})
          </button>
        </div>

        <div class="requests-list" id="requests-list">
          ${this.renderRequestsList()}
        </div>
      </div>
    `;
  },

  renderRequestsList() {
    const filtered = this.requests.filter(r => r.status === this.currentTab);

    if (filtered.length === 0) {
      const emptyTypes = {
        pending: 'no_requests',
        approved: 'no_requests',
        rejected: 'no_requests'
      };
      return EmptyState.render(emptyTypes[this.currentTab]);
    }

    return filtered.map(request => 
      RequestCard.renderRequest(request, true)
    ).join('');
  },

  attachEvents() {
    // Back button
    document.getElementById('requests-back')?.addEventListener('click', () => {
      App.navigateTo('event-detail', { eventId: this.eventId });
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const list = document.getElementById('requests-list');
        list.innerHTML = this.renderRequestsList();
        this.attachRequestActions();
        
        TelegramAPI.hapticFeedback('light');
      });
    });

    // Request actions
    this.attachRequestActions();
  },

  attachRequestActions() {
    // Accept buttons
    document.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const participantId = btn.dataset.id;
        await this.acceptRequest(participantId);
      });
    });

    // Decline buttons
    document.querySelectorAll('.decline-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const participantId = btn.dataset.id;
        await this.declineRequest(participantId);
      });
    });
  },

  async acceptRequest(participantId) {
    try {
      LoadingScreen.show('Прийняття...');
      
      const result = await EventsService.acceptRequest(participantId);
      
      LoadingScreen.hide();
      
      if (result.success) {
        TelegramAPI.hapticFeedback('success');
        TelegramAPI.showAlert('✅ Заявку прийнято!');
        await this.refresh();
      } else {
        TelegramAPI.showAlert('❌ ' + (result.error || 'Помилка'));
      }
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Accept error:', error);
      TelegramAPI.showAlert('❌ Помилка: ' + error.message);
    }
  },

  async declineRequest(participantId) {
    try {
      LoadingScreen.show('Відхилення...');
      
      const result = await EventsService.declineRequest(participantId);
      
      LoadingScreen.hide();
      
      if (result.success) {
        TelegramAPI.hapticFeedback('warning');
        TelegramAPI.showAlert('❌ Заявку відхилено');
        await this.refresh();
      } else {
        TelegramAPI.showAlert('❌ ' + (result.error || 'Помилка'));
      }
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Decline error:', error);
      TelegramAPI.showAlert('❌ Помилка: ' + error.message);
    }
  },

  async refresh() {
    this.requests = await EventsService.getEventRequests(this.eventId, null);
    this.render();
    this.attachEvents();
  },

  show() {
    this.container.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

### 2.7 My Events Screen

```javascript
// screens/my-events.js

const MyEventsScreen = {
  container: null,
  participations: [],
  currentTab: 'upcoming',

  init() {
    this.container = document.getElementById('my-events-screen');
    return this;
  },

  async load() {
    try {
      LoadingScreen.show();
      
      this.participations = await EventsService.getMyEventsStatus();
      
      LoadingScreen.hide();
      this.render();
      this.attachEvents();
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Error loading my events:', error);
    }
  },

  render() {
    const upcoming = this.participations.filter(p => 
      p.status === 'pending' || p.status === 'approved'
    );
    const past = this.participations.filter(p => 
      p.status === 'rejected' || p.status === 'cancelled' ||
      (p.status === 'approved' && this.isPast(p.event_date, p.event_time))
    );

    this.container.innerHTML = `
      <div class="my-events-container">
        <header class="my-events-header">
          <button class="back-btn" id="my-events-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>Мої події</h2>
        </header>

        <div class="my-events-tabs">
          <button class="tab-btn ${this.currentTab === 'upcoming' ? 'active' : ''}" data-tab="upcoming">
            Майбутні (${upcoming.length})
          </button>
          <button class="tab-btn ${this.currentTab === 'past' ? 'active' : ''}" data-tab="past">
            Минулі (${past.length})
          </button>
        </div>

        <div class="my-events-list" id="my-events-list">
          ${this.renderEventsList()}
        </div>
      </div>
    `;
  },

  renderEventsList() {
    const now = new Date();
    let filtered;
    
    if (this.currentTab === 'upcoming') {
      filtered = this.participations.filter(p => 
        (p.status === 'pending' || p.status === 'approved') &&
        !this.isPast(p.event_date, p.event_time)
      );
    } else {
      filtered = this.participations.filter(p => 
        p.status === 'rejected' ||
        this.isPast(p.event_date, p.event_time)
      );
    }

    if (filtered.length === 0) {
      return EmptyState.render('no_my_events');
    }

    return filtered.map(p => 
      RequestCard.renderMyParticipation(p)
    ).join('');
  },

  isPast(date, time) {
    const eventDate = new Date(date);
    const [hours, minutes] = (time || '00:00').split(':');
    eventDate.setHours(parseInt(hours), parseInt(minutes));
    return eventDate < new Date();
  },

  attachEvents() {
    document.getElementById('my-events-back')?.addEventListener('click', () => {
      App.navigateTo('home');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const list = document.getElementById('my-events-list');
        list.innerHTML = this.renderEventsList();
        
        this.attachCardEvents();
        TelegramAPI.hapticFeedback('light');
      });
    });

    this.attachCardEvents();
  },

  attachCardEvents() {
    document.querySelectorAll('.my-event-card').forEach(card => {
      card.addEventListener('click', () => {
        const eventId = card.dataset.id;
        App.navigateTo('event-detail', { eventId });
      });
    });
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

---

## 📊 Sprint 4: Definition of Done

### Backend
- [ ] RPC `join_event()` працює
- [ ] RPC `accept_request()` працює
- [ ] RPC `decline_request()` працює
- [ ] RPC `leave_event()` працює
- [ ] RPC `get_event_requests()` працює
- [ ] RPC `get_my_events_status()` працює
- [ ] Валідація: не повторювати заявку
- [ ] Валідація: перевірка місць

### Frontend
- [ ] Join button на event detail
- [ ] Join modal з повідомленням
- [ ] Leave event functionality
- [ ] Requests screen (organizer)
- [ ] Accept/Decline buttons
- [ ] My Events screen
- [ ] Tab switching (pending/approved/rejected)

### UX
- [ ] Повідомлення про успіх/помилку
- [ ] Haptic feedback
- [ ] Loading states
- [ ] Empty states

---

## ⏱️ Timeline Sprint 4

| День | Backend | Frontend |
|------|---------|----------|
| Пн | RPC functions | Event detail updates |
| Вт | Validation | Join modal |
| Ср | Testing | Requests screen |
| Чт | Fixes | My Events screen |
| Пт | Testing | Integration |
| Сб | Code Review | Testing |
| Нд | Deploy | Bug Fixes |

---

## ▶️ Наступний Sprint

**Sprint 5: Chat System**

- Real-time chat
- 6-hour auto-delete
- Message notifications
- Chat list

[Дивитись Sprint 5 →](./SPRINT_5_ROADMAP.md)
