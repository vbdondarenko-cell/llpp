# 🚀 LinkUp Alpha Roadmap — Sprint 5: Chat System
## Мета: Автоматичний чат після схвалення заявки
## Тривалість: 1 тиждень

---

## 📋 Огляд Sprint 5

### Автоматичний Flow:
```
Accept Request
    ↓
Chat Created (participants notified)
    ↓
6 Hour Timer Starts
    ↓
[Chat Active - Messages exchanged]
    ↓
Timer Expires
    ↓
Chat Archived (read-only)
```

### Результат Sprint 5:
- ✅ Автоматичне створення чату після Accept
- ✅ Realtime повідомлення
- ✅ 6-годинний таймер
- ✅ Список активних чатів
- ✅ Архівація після закінчення
- ✅ WebSocket/Realtime integration

---

## 🗄️ Частина 1: Backend — Supabase

### 1.1 Таблиця: chats

```sql
-- Чати для подій
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Привязка до події
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Стан чату
  status TEXT DEFAULT 'active', -- active, archived, deleted
  
  -- Таймер (коли чат закриється)
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Останнє повідомлення (для сортування)
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id)
);

-- Індекси
CREATE INDEX idx_chats_organizer ON chats(organizer_id);
CREATE INDEX idx_chats_status ON chats(status);
CREATE INDEX idx_chats_expires ON chats(expires_at);

-- RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Учасники події можуть бачити чат
CREATE POLICY "Event participants can view chat"
ON chats FOR SELECT
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = chats.event_id
    AND ep.user_id = auth.uid()
    AND ep.status = 'approved'
  )
);

-- Організатор може бачити чат
CREATE POLICY "Organizer can view chat"
ON chats FOR SELECT
USING (
  status IN ('active', 'archived')
  AND organizer_id = auth.uid()
);

-- Оновлення чату
CREATE POLICY "Participants can update chat"
ON chats FOR UPDATE
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = chats.event_id
    AND ep.user_id = auth.uid()
    AND ep.status = 'approved'
  )
);
```

### 1.2 Таблиця: chat_participants

```sql
-- Учасники чату
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Останній перегляд
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  
  -- Notifications
  notifications_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(chat_id, user_id)
);

-- Індекс
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id);

-- RLS
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own participation"
ON chat_participants FOR ALL
USING (user_id = auth.uid());
```

### 1.3 Таблиця: messages

```sql
-- Повідомлення в чаті
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  
  -- Контент
  content TEXT NOT NULL,
  
  -- Тип повідомлення
  message_type TEXT DEFAULT 'text', -- text, system
  
  -- Системне повідомлення (для events)
  is_system BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Для soft delete
  deleted_at TIMESTAMPTZ
);

-- Індекси
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_chat_time ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Учасники чату можуть читати повідомлення
CREATE POLICY "Chat participants can view messages"
ON messages FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.chat_id = messages.chat_id
    AND cp.user_id = auth.uid()
  )
);

-- Учасники можуть писати повідомлення
CREATE POLICY "Chat participants can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.chat_id = messages.chat_id
    AND cp.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = cp.chat_id
      AND c.status = 'active'
    )
  )
);

-- Учасники можуть видаляти свої повідомлення
CREATE POLICY "Users can delete own messages"
ON messages FOR UPDATE
USING (
  sender_id = auth.uid()
  AND deleted_at IS NULL
);
```

### 1.4 RPC Функції

```sql
-- Створення чату (автоматично після Accept)
CREATE OR REPLACE FUNCTION create_chat(p_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id UUID;
  v_event events;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Отримуємо подію
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Перевіряємо чи не існує вже чат
  IF EXISTS (SELECT 1 FROM chats WHERE event_id = p_event_id) THEN
    SELECT id INTO v_chat_id FROM chats WHERE event_id = p_event_id;
    RETURN v_chat_id;
  END IF;
  
  -- Розраховуємо час закриття: event_time + duration + 2 hours buffer
  v_expires_at := (
    v_event.event_date + v_event.event_time::interval + 
    (v_event.duration_minutes || ' minutes')::interval + 
    '2 hours'::interval
  );
  
  -- Обмежуємо максимум 6 годинами
  v_expires_at := LEAST(
    v_expires_at,
    NOW() + '6 hours'::interval
  );
  
  -- Створюємо чат
  INSERT INTO chats (
    event_id,
    organizer_id,
    expires_at
  )
  VALUES (
    p_event_id,
    v_event.organizer_id,
    v_expires_at
  )
  RETURNING id INTO v_chat_id;
  
  -- Додаємо організатора
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, v_event.organizer_id);
  
  -- Додаємо всіх approved учасників
  INSERT INTO chat_participants (chat_id, user_id)
  SELECT v_chat_id, user_id
  FROM event_participants
  WHERE event_id = p_event_id
  AND status = 'approved';
  
  -- Додаємо system message
  INSERT INTO messages (chat_id, sender_id, content, is_system, message_type)
  VALUES (
    v_chat_id,
    v_event.organizer_id,
    'Чат відкрито! Обговоріть деталі зустрічі.',
    TRUE,
    'system'
  );
  
  RETURN v_chat_id;
END;
$$;

-- Відправка повідомлення
CREATE OR REPLACE FUNCTION send_message(
  p_chat_id UUID,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_chat chats;
BEGIN
  -- Отримуємо чат
  SELECT * INTO v_chat
  FROM chats
  WHERE id = p_chat_id;
  
  IF v_chat IS NULL THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;
  
  IF v_chat.status != 'active' THEN
    RAISE EXCEPTION 'Chat is not active';
  END IF;
  
  IF v_chat.expires_at < NOW() THEN
    RAISE EXCEPTION 'Chat has expired';
  END IF;
  
  -- Перевіряємо участь
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = p_chat_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  
  -- Створюємо повідомлення
  INSERT INTO messages (chat_id, sender_id, content)
  VALUES (p_chat_id, auth.uid(), p_content)
  RETURNING id INTO v_message_id;
  
  -- Оновлюємо last_message в чаті
  UPDATE chats SET
    last_message_at = NOW(),
    last_message_preview = LEFT(p_content, 100),
    updated_at = NOW()
  WHERE id = p_chat_id;
  
  -- Оновлюємо unread_count для інших учасників
  UPDATE chat_participants
  SET unread_count = unread_count + 1
  WHERE chat_id = p_chat_id
  AND user_id != auth.uid();
  
  RETURN v_message_id;
END;
$$;

-- Отримати чати користувача
CREATE OR REPLACE FUNCTION get_my_chats()
RETURNS TABLE (
  chat_id UUID,
  event_id UUID,
  event_title TEXT,
  event_date DATE,
  event_time TIME,
  event_location TEXT,
  organizer_id UUID,
  organizer_name TEXT,
  organizer_avatar TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  time_remaining INTERVAL,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER,
  is_organizer BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as chat_id,
    c.event_id,
    e.title as event_title,
    e.event_date,
    e.event_time,
    el.address as event_location,
    c.organizer_id,
    p.display_name as organizer_name,
    p.avatar_url as organizer_avatar,
    c.status,
    c.expires_at,
    (c.expires_at - NOW()) as time_remaining,
    c.last_message_at,
    c.last_message_preview,
    cp.unread_count,
    CASE WHEN c.organizer_id = auth.uid() THEN TRUE ELSE FALSE END as is_organizer
  FROM chats c
  INNER JOIN chat_participants cp ON c.id = cp.chat_id
  INNER JOIN events e ON c.event_id = e.id
  INNER JOIN profiles p ON c.organizer_id = p.id
  LEFT JOIN event_locations el ON e.id = el.event_id
  WHERE cp.user_id = auth.uid()
  AND c.status IN ('active', 'archived')
  ORDER BY 
    CASE WHEN c.status = 'active' THEN 0 ELSE 1 END,
    c.last_message_at DESC NULLS LAST;
END;
$$;

-- Отримати повідомлення чату
CREATE OR REPLACE FUNCTION get_chat_messages(
  p_chat_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  message_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT,
  message_type TEXT,
  is_system BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Перевіряємо участь
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = p_chat_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  
  -- Оновлюємо last_read_at
  UPDATE chat_participants
  SET last_read_at = NOW(), unread_count = 0
  WHERE chat_id = p_chat_id AND user_id = auth.uid();
  
  -- Повертаємо повідомлення
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.sender_id,
    COALESCE(p.display_name, 'System') as sender_name,
    p.avatar_url as sender_avatar,
    m.content,
    m.message_type,
    m.is_system,
    m.created_at
  FROM messages m
  LEFT JOIN profiles p ON m.sender_id = p.id
  WHERE m.chat_id = p_chat_id
  AND m.deleted_at IS NULL
  AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Архівувати чат (для expired)
CREATE OR REPLACE FUNCTION archive_expired_chats()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE chats
  SET status = 'archived', updated_at = NOW()
  WHERE status = 'active'
  AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Видалити чат (тільки архів)
CREATE OR REPLACE FUNCTION delete_chat(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE chats
  SET status = 'deleted', updated_at = NOW()
  WHERE id = p_chat_id
  AND organizer_id = auth.uid()
  AND status = 'archived';
  
  RETURN FOUND;
END;
$$;
```

### 1.5 Realtime Setup

```sql
-- Enable Realtime для messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable Realtime для chats
ALTER PUBLICATION supabase_realtime ADD TABLE chats;

-- Trigger для автоматичного архівування
CREATE OR REPLACE FUNCTION handle_chat_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'archived' THEN
    -- Додаємо system message
    INSERT INTO messages (chat_id, sender_id, content, is_system, message_type)
    VALUES (
      NEW.id,
      NEW.organizer_id,
      '⏰ Час чату закінчився. Тепер чат доступний тільки для читання.',
      TRUE,
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chat_status_change
AFTER UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION handle_chat_expiration();
```

---

## 🎨 Частина 2: Frontend

### 2.1 Структура проекту (оновлена)

```
linkup-telegram-app/
├── screens/
│   ├── home.js
│   ├── event-detail.js
│   ├── create-event.js
│   ├── event-requests.js
│   ├── my-events.js
│   ├── chats-list.js        🆕
│   └── chat-room.js         🆕
├── components/
│   ├── event-card.js
│   ├── request-card.js
│   ├── message-bubble.js    🆕
│   ├── chat-item.js         🆕
│   └── timer-badge.js       🆕
├── services/
│   ├── events.js
│   ├── chats.js             🆕
│   └── realtime.js          🆕
└── utils/
    ├── time.js              🆕
    └── notifications.js
```

### 2.2 Chats Service

```javascript
// services/chats.js

const ChatsService = {
  supabase: null,
  realtimeChannel: null,

  init(supabaseClient) {
    this.supabase = supabaseClient;
    return this;
  },

  // Отримати список чатів
  async getMyChats() {
    const { data, error } = await this.supabase.rpc('get_my_chats');

    if (error) throw error;
    return data || [];
  },

  // Отримати повідомлення чату
  async getMessages(chatId, limit = 50, before = null) {
    const { data, error } = await this.supabase.rpc('get_chat_messages', {
      p_chat_id: chatId,
      p_limit: limit,
      p_before: before
    });

    if (error) throw error;
    return data || [];
  },

  // Відправити повідомлення
  async sendMessage(chatId, content) {
    const { data, error } = await this.supabase.rpc('send_message', {
      p_chat_id: chatId,
      p_content: content
    });

    if (error) throw error;
    return data;
  },

  // Підписка на realtime
  subscribeToChat(chatId, onNewMessage, onStatusChange) {
    // Підписка на повідомлення
    const messagesChannel = this.supabase
      .channel(`chat:${chatId}:messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          if (onNewMessage) onNewMessage(payload.new);
        }
      )
      .subscribe();

    // Підписка на зміну статусу чату
    const chatChannel = this.supabase
      .channel(`chat:${chatId}:status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `id=eq.${chatId}`
        },
        (payload) => {
          if (onStatusChange) onStatusChange(payload.new);
        }
      )
      .subscribe();

    this.realtimeChannel = { messagesChannel, chatChannel };

    return () => {
      this.unsubscribe();
    };
  },

  // Підписка на всі чати
  subscribeToAllChats(onNewMessage, onChatUpdate) {
    const channel = this.supabase
      .channel('all-chats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Перевіряємо чи це наш чат
          const chats = await this.getMyChats();
          const isOurChat = chats.some(c => c.chat_id === payload.new.chat_id);
          
          if (isOurChat && onNewMessage) {
            onNewMessage(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  },

  unsubscribe() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel.messagesChannel);
      this.supabase.removeChannel(this.realtimeChannel.chatChannel);
      this.realtimeChannel = null;
    }
  },

  // Архівувати чат
  async archiveExpiredChats() {
    const { data, error } = await this.supabase.rpc('archive_expired_chats');
    if (error) throw error;
    return data;
  }
};
```

### 2.3 Time Utilities

```javascript
// utils/time.js

const TimeUtils = {
  // Форматування часу до закінчення
  formatTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) {
      return { expired: true, text: 'Чат закритий' };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return {
        expired: false,
        text: `${hours}г ${minutes}хв`,
        hours,
        minutes,
        seconds
      };
    }

    if (minutes > 0) {
      return {
        expired: false,
        text: `${minutes}хв ${seconds}с`,
        hours: 0,
        minutes,
        seconds
      };
    }

    return {
      expired: false,
      text: `${seconds}с`,
      hours: 0,
      minutes: 0,
      seconds
    };
  },

  // Форматування часу повідомлення
  formatMessageTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('uk-UA', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    if (diffDays === 1) {
      return 'Вчора ' + date.toLocaleTimeString('uk-UA', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    if (diffDays < 7) {
      return date.toLocaleDateString('uk-UA', { 
        weekday: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    return date.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short'
    });
  },

  // Форматування дати події
  formatEventDate(date, time) {
    const dateObj = new Date(date);
    const day = dateObj.toLocaleDateString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    const timeStr = time ? time.substring(0, 5) : '';
    return `${day}, ${timeStr}`;
  }
};
```

### 2.4 Chat Item Component

```javascript
// components/chat-item.js

const ChatItem = {
  render(chat) {
    const timeRemaining = TimeUtils.formatTimeRemaining(chat.expires_at);
    const isExpired = timeRemaining.expired || chat.status === 'archived';
    const messageTime = chat.last_message_at 
      ? TimeUtils.formatMessageTime(chat.last_message_at)
      : '';

    return `
      <div class="chat-item" data-chat-id="${chat.chat_id}">
        <div class="chat-avatar">
          <img 
            src="${chat.organizer_avatar || '/img/default-avatar.png'}" 
            alt="${chat.organizer_name}"
          >
          ${chat.is_organizer ? '<span class="organizer-badge">👑</span>' : ''}
        </div>
        
        <div class="chat-content">
          <div class="chat-header">
            <h4>${chat.event_title}</h4>
            <span class="chat-time">${messageTime}</span>
          </div>
          <div class="chat-preview">
            <p>${chat.last_message_preview || 'Чат відкрито...'}</p>
            ${!isExpired ? `
              <span class="timer-badge ${timeRemaining.hours < 1 ? 'urgent' : ''}">
                ⏱️ ${timeRemaining.text}
              </span>
            ` : `
              <span class="archived-badge">📖 Архів</span>
            `}
          </div>
          <div class="chat-meta">
            <span class="event-date">
              📅 ${TimeUtils.formatEventDate(chat.event_date, chat.event_time)}
            </span>
            ${chat.unread_count > 0 ? `
              <span class="unread-badge">${chat.unread_count}</span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
};
```

### 2.5 Message Bubble Component

```javascript
// components/message-bubble.js

const MessageBubble = {
  // Повідомлення користувача
  renderOutgoing(message, currentUserId) {
    const isOwn = message.sender_id === currentUserId;
    const time = TimeUtils.formatMessageTime(message.created_at);

    if (message.is_system) {
      return `
        <div class="message system-message">
          <div class="system-content">
            <span class="system-icon">ℹ️</span>
            <p>${message.content}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="message ${isOwn ? 'outgoing' : 'incoming'}">
        ${!isOwn ? `
          <img 
            src="${message.sender_avatar || '/img/default-avatar.png'}" 
            alt="${message.sender_name}"
            class="message-avatar"
          >
        ` : ''}
        <div class="message-content">
          ${!isOwn ? `<span class="sender-name">${message.sender_name}</span>` : ''}
          <div class="bubble">
            <p>${this.escapeHtml(message.content)}</p>
          </div>
          <span class="message-time">${time}</span>
        </div>
      </div>
    `;
  },

  // Рендер списку повідомлень
  renderMessages(messages, currentUserId) {
    if (messages.length === 0) {
      return `
        <div class="empty-chat">
          <div class="empty-icon">💬</div>
          <p>Повідомлень поки немає</p>
          <p class="empty-sub">Почніть спілкування!</p>
        </div>
      `;
    }

    // Сортуємо по часу (старі зверху)
    const sorted = [...messages].reverse();

    return sorted.map(msg => this.renderOutgoing(msg, currentUserId)).join('');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
```

### 2.6 Chats List Screen

```javascript
// screens/chats-list.js

const ChatsListScreen = {
  container: null,
  chats: [],
  unsubscribeRealtime: null,
  refreshInterval: null,

  init() {
    this.container = document.getElementById('chats-screen');
    return this;
  },

  async load() {
    try {
      LoadingScreen.show();
      
      this.chats = await ChatsService.getMyChats();
      
      LoadingScreen.hide();
      this.render();
      this.subscribeToUpdates();
      this.startRefreshInterval();
      this.attachEvents();
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Error loading chats:', error);
      this.showError();
    }
  },

  render() {
    const activeChats = this.chats.filter(c => c.status === 'active');
    const archivedChats = this.chats.filter(c => c.status === 'archived');

    this.container.innerHTML = `
      <div class="chats-container">
        <header class="chats-header">
          <button class="back-btn" id="chats-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>Чати</h2>
          <div class="header-spacer"></div>
        </header>

        ${this.chats.length === 0 ? `
          <div class="empty-chats">
            ${EmptyState.render('no_chats', {
              action: 'Знайти подію'
            })}
          </div>
        ` : `
          <div class="chats-list">
            ${activeChats.length > 0 ? `
              <div class="chats-section">
                <h3 class="section-title">Активні (${activeChats.length})</h3>
                ${activeChats.map(chat => ChatItem.render(chat)).join('')}
              </div>
            ` : ''}
            
            ${archivedChats.length > 0 ? `
              <div class="chats-section archived">
                <h3 class="section-title">Архів (${archivedChats.length})</h3>
                ${archivedChats.map(chat => ChatItem.render(chat)).join('')}
              </div>
            ` : ''}
          </div>
        `}
      </div>
    `;
  },

  subscribeToUpdates() {
    this.unsubscribeRealtime = ChatsService.subscribeToAllChats(
      (message) => {
        // Оновити список чатів
        this.load();
      },
      (chat) => {
        // Оновити статус чату
        const index = this.chats.findIndex(c => c.chat_id === chat.id);
        if (index !== -1) {
          this.chats[index] = { ...this.chats[index], ...chat };
          this.render();
        }
      }
    );
  },

  startRefreshInterval() {
    // Оновлюємо кожну хвилину (для таймерів)
    this.refreshInterval = setInterval(() => {
      this.updateTimers();
    }, 60000);
  },

  updateTimers() {
    document.querySelectorAll('.chat-item').forEach(item => {
      const chatId = item.dataset.chatId;
      const chat = this.chats.find(c => c.chat_id === chatId);
      
      if (chat) {
        const timeRemaining = TimeUtils.formatTimeRemaining(chat.expires_at);
        const timerBadge = item.querySelector('.timer-badge');
        
        if (timerBadge && !timeRemaining.expired) {
          timerBadge.textContent = `⏱️ ${timeRemaining.text}`;
          
          if (timeRemaining.hours < 1) {
            timerBadge.classList.add('urgent');
          }
        }
      }
    });
  },

  attachEvents() {
    document.getElementById('chats-back')?.addEventListener('click', () => {
      App.navigateTo('home');
    });

    // Chat item clicks
    document.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => {
        const chatId = item.dataset.chatId;
        App.navigateTo('chat-room', { chatId });
      });
    });
  },

  showError() {
    this.container.innerHTML = `
      <div class="error-container">
        ${EmptyState.render('error')}
        <button onclick="ChatsListScreen.load()">Спробувати знову</button>
      </div>
    `;
  },

  destroy() {
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },

  show() {
    this.container.classList.remove('hidden');
    this.load();
  },

  hide() {
    this.container.classList.add('hidden');
    this.destroy();
  }
};
```

### 2.7 Chat Room Screen

```javascript
// screens/chat-room.js

const ChatRoomScreen = {
  container: null,
  chatId: null,
  chat: null,
  messages: [],
  currentUserId: null,
  unsubscribe: null,
  timerInterval: null,
  inputFocused: false,

  init() {
    this.container = document.getElementById('chat-room-screen');
    this.currentUserId = localStorage.getItem('user_id');
    return this;
  },

  async load(chatId) {
    this.chatId = chatId;
    
    try {
      LoadingScreen.show();
      
      // Завантажуємо чат та повідомлення
      const chats = await ChatsService.getMyChats();
      this.chat = chats.find(c => c.chat_id === chatId);
      
      if (!this.chat) {
        throw new Error('Chat not found');
      }

      this.messages = await ChatsService.getMessages(chatId);
      
      LoadingScreen.hide();
      this.render();
      this.subscribeToMessages();
      this.startTimer();
      this.attachEvents();
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Error loading chat:', error);
      this.showError();
    }
  },

  render() {
    const isExpired = this.chat.status === 'archived' || 
                      TimeUtils.formatTimeRemaining(this.chat.expires_at).expired;
    const timeRemaining = TimeUtils.formatTimeRemaining(this.chat.expires_at);

    this.container.innerHTML = `
      <div class="chat-room-container">
        <header class="chat-header">
          <button class="back-btn" id="chat-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          
          <div class="chat-info" id="chat-info">
            <h3>${this.chat.event_title}</h3>
            <div class="chat-status">
              ${isExpired ? `
                <span class="status-archived">📖 Архів</span>
              ` : `
                <span class="status-timer ${timeRemaining.hours < 1 ? 'urgent' : ''}">
                  ⏱️ ${timeRemaining.text}
                </span>
              `}
            </div>
          </div>
          
          <button class="icon-btn" id="chat-menu">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        </header>

        <div class="messages-container" id="messages-container">
          <div class="event-info-banner">
            <div class="banner-content">
              <span class="banner-date">
                📅 ${TimeUtils.formatEventDate(this.chat.event_date, this.chat.event_time)}
              </span>
              ${this.chat.event_location ? `
                <span class="banner-location">
                  📍 ${this.chat.event_location}
                </span>
              ` : ''}
            </div>
          </div>
          
          <div class="messages-list" id="messages-list">
            ${MessageBubble.renderMessages(this.messages, this.currentUserId)}
          </div>
        </div>

        ${isExpired ? `
          <div class="chat-input-disabled">
            <p>⏰ Час чату закінчився. Тепер чат доступний тільки для читання.</p>
          </div>
        ` : `
          <div class="chat-input-container">
            <div class="chat-input-wrapper">
              <textarea 
                id="message-input" 
                placeholder="Повідомлення..."
                rows="1"
                maxlength="1000"
              ></textarea>
              <button class="send-btn" id="send-btn" disabled>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        `}
      </div>
    `;

    // Scroll to bottom
    this.scrollToBottom();
  },

  subscribeToMessages() {
    this.unsubscribe = ChatsService.subscribeToChat(
      this.chatId,
      (message) => {
        // Нове повідомлення
        this.messages.push(message);
        this.appendMessage(message);
        this.scrollToBottom();
        
        // Haptic feedback
        if (message.sender_id !== this.currentUserId) {
          TelegramAPI.hapticFeedback('light');
        }
      },
      (chat) => {
        // Зміна статусу чату
        if (chat.status === 'archived') {
          this.showArchivedNotice();
        }
      }
    );
  },

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.chat.status === 'archived') {
        clearInterval(this.timerInterval);
        return;
      }

      const timeRemaining = TimeUtils.formatTimeRemaining(this.chat.expires_at);
      
      if (timeRemaining.expired) {
        clearInterval(this.timerInterval);
        this.showArchivedNotice();
        return;
      }

      // Оновлюємо таймер в UI
      const statusEl = document.querySelector('.status-timer');
      if (statusEl) {
        statusEl.textContent = `⏱️ ${timeRemaining.text}`;
        if (timeRemaining.hours < 1) {
          statusEl.classList.add('urgent');
        }
      }
    }, 1000);
  },

  appendMessage(message) {
    const list = document.getElementById('messages-list');
    const html = MessageBubble.renderOutgoing(message, this.currentUserId);
    
    const div = document.createElement('div');
    div.innerHTML = html;
    list.appendChild(div.firstElementChild);
  },

  scrollToBottom() {
    const container = document.getElementById('messages-container');
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  },

  showArchivedNotice() {
    // Показуємо system message
    const list = document.getElementById('messages-list');
    const noticeHtml = `
      <div class="message system-message">
        <div class="system-content">
          <span class="system-icon">⏰</span>
          <p>Час чату закінчився. Тепер чат доступний тільки для читання.</p>
        </div>
      </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = noticeHtml;
    list.appendChild(div.firstElementChild);
    this.scrollToBottom();

    // Ховаємо input
    const inputContainer = document.querySelector('.chat-input-container');
    if (inputContainer) {
      inputContainer.innerHTML = `
        <div class="chat-input-disabled">
          <p>⏰ Чат закритий</p>
        </div>
      `;
    }

    TelegramAPI.hapticFeedback('warning');
  },

  attachEvents() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    // Input handling
    messageInput?.addEventListener('input', (e) => {
      const hasText = e.target.value.trim().length > 0;
      sendBtn.disabled = !hasText;
      
      // Auto-resize
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    });

    // Send button
    sendBtn?.addEventListener('click', () => {
      const content = messageInput.value.trim();
      if (content) {
        this.sendMessage(content);
        messageInput.value = '';
        sendBtn.disabled = true;
        messageInput.style.height = 'auto';
      }
    });

    // Enter to send (Shift+Enter for new line)
    messageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (messageInput.value.trim()) {
          this.sendMessage(messageInput.value.trim());
          messageInput.value = '';
          sendBtn.disabled = true;
          messageInput.style.height = 'auto';
        }
      }
    });

    // Back button
    document.getElementById('chat-back')?.addEventListener('click', () => {
      App.navigateTo('chats');
    });

    // Chat menu
    document.getElementById('chat-menu')?.addEventListener('click', () => {
      this.showChatMenu();
    });
  },

  async sendMessage(content) {
    try {
      await ChatsService.sendMessage(this.chatId, content);
      TelegramAPI.hapticFeedback('light');
    } catch (error) {
      console.error('Send error:', error);
      TelegramAPI.showAlert('Помилка відправки: ' + error.message);
    }
  },

  showChatMenu() {
    BottomSheet.open(`
      <div class="chat-menu">
        <h3>${this.chat.event_title}</h3>
        
        <div class="menu-options">
          <button class="menu-item" id="view-event-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            <span>Переглянути подію</span>
          </button>
          
          <button class="menu-item" id="view-participants-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <span>Учасники</span>
          </button>
          
          ${this.chat.status === 'archived' ? `
            <button class="menu-item danger" id="delete-chat-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              <span>Видалити чат</span>
            </button>
          ` : ''}
        </div>
      </div>
    `);

    document.getElementById('view-event-btn')?.addEventListener('click', () => {
      BottomSheet.close();
      App.navigateTo('event-detail', { eventId: this.chat.event_id });
    });

    document.getElementById('view-participants-btn')?.addEventListener('click', () => {
      BottomSheet.close();
      // TODO: Show participants
    });

    document.getElementById('delete-chat-btn')?.addEventListener('click', async () => {
      try {
        await ChatsService.archiveChat(this.chatId);
        BottomSheet.close();
        App.navigateTo('chats');
      } catch (error) {
        TelegramAPI.showAlert('Помилка: ' + error.message);
      }
    });
  },

  showError() {
    this.container.innerHTML = `
      <div class="error-container">
        <button onclick="ChatRoomScreen.load('${this.chatId}')">Спробувати знову</button>
      </div>
    `;
  },

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  },

  show() {
    this.container.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
    this.destroy();
  }
};
```

### 2.8 Automatic Chat Creation Flow

```javascript
// services/notifications.js

// При Accept заявки → автоматично створюється чат
// В EventRequestsScreen:

async acceptRequest(participantId) {
  try {
    LoadingScreen.show('Прийняття...');
    
    const result = await EventsService.acceptRequest(participantId);
    
    if (result.success) {
      // Створюємо чат автоматично
      const chatId = await ChatsService.createChat(this.eventId);
      
      LoadingScreen.hide();
      
      TelegramAPI.hapticFeedback('success');
      TelegramAPI.showAlert(
        '✅ Заявку прийнято!\n\n💬 Чат відкрито автоматично.',
        () => {
          // Відкриваємо чат
          App.navigateTo('chat-room', { chatId });
        }
      );
      
      await this.refresh();
    } else {
      LoadingScreen.hide();
      TelegramAPI.showAlert('❌ ' + (result.error || 'Помилка'));
    }
    
  } catch (error) {
    LoadingScreen.hide();
    console.error('Accept error:', error);
    TelegramAPI.showAlert('❌ Помилка: ' + error.message);
  }
}
```

---

## 📊 Sprint 5: Definition of Done

### Backend
- [ ] Таблиця `chats` створена
- [ ] Таблиця `chat_participants` створена
- [ ] Таблиця `messages` створена
- [ ] RLS policies налаштовані
- [ ] `create_chat()` RPC працює
- [ ] `send_message()` RPC працює
- [ ] `get_my_chats()` RPC працює
- [ ] `get_chat_messages()` RPC працює
- [ ] Realtime subscription працює
- [ ] Trigger для авто-архівування

### Frontend
- [ ] Chats List Screen
- [ ] Chat Room Screen
- [ ] Message Bubbles
- [ ] Timer Display
- [ ] Realtime Updates
- [ ] Send Message
- [ ] Auto-scroll
- [ ] Archived state

### UX
- [ ] Chat auto-created on Accept
- [ ] 6-hour timer visible
- [ ] Haptic feedback on messages
- [ ] System messages
- [ ] Archived notice

---

## ⏱️ Timeline Sprint 5

| День | Backend | Frontend |
|------|---------|----------|
| Пн | Tables + RLS | Chats List Screen |
| Вт | RPC Functions | Chat Room Screen |
| Ср | Realtime Setup | Message Bubbles |
| Чт | Triggers | Timer + Auto-scroll |
| Пт | Testing | Integration |
| Сб | Code Review | Testing |
| Нд | Deploy | Bug Fixes |

---

## 🔄 Complete User Flow

```
User Story: Join → Chat → 6 Hours → Archive

1. User views event
2. Taps "Join"
3. Request sent (if approval required)
4. Organizer sees request
5. Organizer taps "Accept"
6. System creates chat automatically
7. All participants notified
8. Chat appears in Chats list
9. Users exchange messages
10. Timer counts down (6 hours)
11. Timer expires
12. Chat becomes read-only (archived)
13. Chat moves to "Archived" section
```

---

## ▶️ Наступний Sprint

**Sprint 6: Profile & Achievements**

- User Profile Screen
- 25 Achievements System
- Rating System
- Edit Profile

[Дивитись Sprint 6 →](./SPRINT_6_ROADMAP.md)
