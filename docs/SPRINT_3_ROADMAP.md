# 🚀 LinkUp Alpha Roadmap — Sprint 3: Create Event
## Мета: Будь-який користувач може створити подію менш ніж за хвилину
## Тривалість: 1 тиждень

---

## 📋 Огляд Sprint 3

### Мета Sprint 3:
```
Користувач натискає "+" → заповнює коротку форму → 
публікує подію за 60 секунд
```

### Результат Sprint 3:
- ✅ Форма створення події
- ✅ Вибір фото
- ✅ Вибір дати та часу
- ✅ Вибір локації
- ✅ Встановлення кількості учасників
- ✅ Вибір категорії
- ✅ Завантаження фото в Storage
- ✅ Ліміти (2-50 учасників)

---

## 🗄️ Частина 1: Backend — Supabase

### 1.1 Storage Bucket для фото

```sql
-- Створення Storage bucket (через Dashboard або SQL)

-- Або через SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload event photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view event photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-photos');

CREATE POLICY "Users can delete own event photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 1.2 Оновлена таблиця: events

```sql
-- Додаємо колонку для фото
ALTER TABLE events
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Додаємо індекс
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
```

### 1.3 Оновлена RPC функція: create_event

```sql
-- Оновлена функція створення події з фото
CREATE OR REPLACE FUNCTION create_event(
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_event_type TEXT DEFAULT 'public',
  p_max_participants INTEGER DEFAULT 10,
  p_event_date DATE,
  p_event_time TIME,
  p_duration_minutes INTEGER DEFAULT 120,
  p_requires_approval BOOLEAN DEFAULT TRUE,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_place_name TEXT DEFAULT NULL,
  p_place_type TEXT DEFAULT NULL,
  p_cover_image_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_user_id UUID;
  v_event_count INTEGER;
BEGIN
  -- Отримуємо ID користувача
  v_user_id := auth.uid();
  
  -- Перевірка ліміту подій на користувача (макс 10 активних)
  SELECT COUNT(*) INTO v_event_count
  FROM events
  WHERE organizer_id = v_user_id
  AND status = 'active'
  AND event_date >= CURRENT_DATE;
  
  IF v_event_count >= 10 THEN
    RAISE EXCEPTION 'Maximum number of active events reached (10)';
  END IF;
  
  -- Перевірка валідності категорії
  IF p_category NOT IN ('party', 'sport', 'food', 'music', 'art', 'outdoor', 'game', 'talk', 'dating', 'networking', 'study', 'other') THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;
  
  -- Перевірка ліміту учасників
  IF p_max_participants < 2 OR p_max_participants > 50 THEN
    RAISE EXCEPTION 'Participants must be between 2 and 50';
  END IF;
  
  -- Перевірка дати (не раніше сьогодні)
  IF p_event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Event date cannot be in the past';
  END IF;
  
  -- Створюємо подію
  INSERT INTO events (
    title,
    description,
    organizer_id,
    category,
    event_type,
    max_participants,
    event_date,
    event_time,
    duration_minutes,
    requires_approval,
    cover_image_url
  )
  VALUES (
    p_title,
    p_description,
    v_user_id,
    p_category,
    p_event_type,
    p_max_participants,
    p_event_date,
    p_event_time,
    p_duration_minutes,
    p_requires_approval,
    p_cover_image_url
  )
  RETURNING id INTO v_event_id;
  
  -- Створюємо локацію
  INSERT INTO event_locations (
    event_id,
    latitude,
    longitude,
    address,
    city,
    place_name,
    place_type
  )
  VALUES (
    v_event_id,
    p_latitude,
    p_longitude,
    p_address,
    p_city,
    p_place_name,
    p_place_type
  );
  
  RETURN v_event_id;
END;
$$;

-- Оновлення події
CREATE OR REPLACE FUNCTION update_event(
  p_event_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_max_participants INTEGER DEFAULT NULL,
  p_event_date DATE DEFAULT NULL,
  p_event_time TIME DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT NULL,
  p_requires_approval BOOLEAN DEFAULT NULL,
  p_cover_image_url TEXT DEFAULT NULL
)
RETURNS events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event events;
BEGIN
  -- Перевіряємо що користувач є організатором
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id
  AND organizer_id = auth.uid();
  
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;
  
  -- Перевіряємо що подія ще не почалась
  IF v_event.event_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot update event that has already started';
  END IF;
  
  -- Оновлюємо
  UPDATE events SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    category = COALESCE(p_category, category),
    event_type = COALESCE(p_event_type, event_type),
    max_participants = COALESCE(p_max_participants, max_participants),
    event_date = COALESCE(p_event_date, event_date),
    event_time = COALESCE(p_event_time, event_time),
    duration_minutes = COALESCE(p_duration_minutes, duration_minutes),
    requires_approval = COALESCE(p_requires_approval, requires_approval),
    cover_image_url = COALESCE(p_cover_image_url, cover_image_url),
    updated_at = NOW()
  WHERE id = p_event_id
  RETURNING * INTO v_event;
  
  RETURN v_event;
END;
$$;

-- Скасування події
CREATE OR REPLACE FUNCTION cancel_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Перевіряємо що користувач є організатором
  UPDATE events
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_event_id
  AND organizer_id = auth.uid()
  AND status = 'active';
  
  RETURN FOUND;
END;
$$;
```

### 1.4 RPC для завантаження фото

```sql
-- Генерація URL для завантаження
CREATE OR REPLACE FUNCTION get_upload_url(
  p_event_id UUID,
  p_filename TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_path TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Перевіряємо що подія належить користувачу
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND organizer_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;
  
  -- Генеруємо шлях до файлу
  v_path := v_user_id::text || '/' || p_event_id::text || '/' || p_filename;
  
  RETURN jsonb_build_object(
    'path', v_path,
    'bucket_id', 'event-photos'
  );
END;
$$;
```

---

## 🎨 Частина 2: Frontend

### 2.1 Структура проекту (оновлена)

```
linkup-telegram-app/
├── index.html
├── styles.css
├── app.js
├── lib/
│   ├── supabase.js
│   ├── telegram.js
│   ├── mapbox.js
│   └── storage.js          🆕
├── screens/
│   ├── splash.js
│   ├── login.js
│   ├── onboarding.js
│   ├── home.js
│   ├── create-event.js     🆕
│   ├── event-detail.js
│   └── location-picker.js  🆕
├── components/
│   ├── interest-chip.js
│   ├── loading.js
│   ├── map-marker.js
│   ├── event-card.js
│   ├── bottom-sheet.js
│   ├── category-picker.js  🆕
│   ├── date-picker.js       🆕
│   └── time-picker.js       🆕
└── utils/
    ├── geolocation.js
    ├── distance.js
    └── validation.js        🆕
```

### 2.2 Storage Service

```javascript
// lib/storage.js

const Storage = {
  bucket: 'event-photos',
  supabase: null,

  init(supabaseClient) {
    this.supabase = supabaseClient;
    return this;
  },

  // Завантаження фото
  async uploadEventPhoto(eventId, file, onProgress) {
    const userId = localStorage.getItem('user_id');
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}.${ext}`;
    const path = `${userId}/${eventId}/${filename}`;

    // Ресайз зображення перед завантаженням
    const resizedFile = await this.resizeImage(file, 1200, 800);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, resizedFile, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          if (onProgress) {
            onProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        }
      });

    if (error) throw error;

    // Отримуємо публічний URL
    return this.getPublicUrl(path);
  },

  // Отримання публічного URL
  getPublicUrl(path) {
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  // Видалення фото
  async deletePhoto(path) {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) throw error;
    return true;
  },

  // Ресайз зображення
  async resizeImage(file, maxWidth, maxHeight) {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Розрахунок нових розмірів
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          }));
        }, 'image/jpeg', 0.85);
      };

      img.src = URL.createObjectURL(file);
    });
  },

  // Завантаження через presigned URL (альтернатива)
  async uploadWithPresignedUrl(presignedData, file) {
    const response = await fetch(presignedData.url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return presignedData.path;
  }
};
```

### 2.3 Category Picker Component

```javascript
// components/category-picker.js

const CategoryPicker = {
  selected: null,
  onChange: null,

  init(onChange) {
    this.onChange = onChange;
    return this;
  },

  render(selectedCategory = null) {
    this.selected = selectedCategory;
    
    return `
      <div class="category-picker">
        <h3>Тип події</h3>
        <div class="category-grid">
          ${this.getCategories().map(cat => `
            <button 
              class="category-item ${this.selected === cat.id ? 'selected' : ''}"
              data-category="${cat.id}"
            >
              <span class="category-icon">${cat.icon}</span>
              <span class="category-name">${cat.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  getCategories() {
    return [
      { id: 'party', name: 'Party', icon: '🎉' },
      { id: 'sport', name: 'Спорт', icon: '⚽' },
      { id: 'food', name: 'Їжа', icon: '🍕' },
      { id: 'music', name: 'Музика', icon: '🎵' },
      { id: 'art', name: 'Мистецтво', icon: '🎨' },
      { id: 'outdoor', name: 'На природі', icon: '🏕️' },
      { id: 'game', name: 'Ігри', icon: '🎮' },
      { id: 'talk', name: 'Трепет', icon: '💬' },
      { id: 'dating', name: 'Побачення', icon: '💕' },
      { id: 'networking', name: 'Нетворкінг', icon: '💼' },
      { id: 'study', name: 'Навчання', icon: '📚' },
      { id: 'other', name: 'Інше', icon: '✨' }
    ];
  },

  attachEvents(container) {
    container.querySelectorAll('.category-item').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.category-item').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selected = btn.dataset.category;
        
        if (this.onChange) {
          this.onChange(this.selected);
        }
        
        TelegramAPI.hapticFeedback('light');
      });
    });
  },

  getValue() {
    return this.selected;
  },

  validate() {
    return this.selected !== null;
  }
};
```

### 2.4 Date & Time Pickers

```javascript
// components/date-picker.js

const DatePicker = {
  minDate: null,
  selected: null,
  onChange: null,

  init(options = {}) {
    this.minDate = options.minDate || new Date();
    this.onChange = options.onChange || null;
    return this;
  },

  render(selectedDate = null) {
    this.selected = selectedDate;
    
    // Форматуємо min date для input
    const minDateStr = this.formatDateForInput(this.minDate);
    
    return `
      <div class="date-picker">
        <label for="event-date">Дата</label>
        <input 
          type="date" 
          id="event-date" 
          class="form-input"
          min="${minDateStr}"
          value="${selectedDate ? this.formatDateForInput(selectedDate) : ''}"
        >
        <p class="picker-hint">Можна обрати будь-який день від сьогодні</p>
      </div>
    `;
  },

  formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  attachEvents(container) {
    const input = container.querySelector('#event-date');
    if (input) {
      input.addEventListener('change', (e) => {
        this.selected = new Date(e.target.value);
        
        if (this.onChange) {
          this.onChange(this.selected);
        }
      });
    }
  },

  getValue() {
    return this.selected;
  },

  validate() {
    if (!this.selected) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.selected >= today;
  }
};

// components/time-picker.js

const TimePicker = {
  selected: null,
  onChange: null,

  init(options = {}) {
    this.onChange = options.onChange || null;
    return this;
  },

  render(selectedTime = null) {
    this.selected = selectedTime;
    
    return `
      <div class="time-picker">
        <label for="event-time">Час</label>
        <input 
          type="time" 
          id="event-time" 
          class="form-input"
          value="${selectedTime || '18:00'}"
        >
        <p class="picker-hint">Обери зручний час для події</p>
      </div>
    `;
  },

  attachEvents(container) {
    const input = container.querySelector('#event-time');
    if (input) {
      input.addEventListener('change', (e) => {
        this.selected = e.target.value;
        
        if (this.onChange) {
          this.onChange(this.selected);
        }
      });
    }
  },

  getValue() {
    return this.selected;
  },

  validate() {
    return this.selected !== null && this.selected !== '';
  }
};
```

### 2.5 Participants Selector

```javascript
// components/participants-selector.js

const ParticipantsSelector = {
  min: 2,
  max: 50,
  value: 10,
  onChange: null,

  init(options = {}) {
    this.min = options.min || 2;
    this.max = options.max || 50;
    this.value = options.value || 10;
    this.onChange = options.onChange || null;
    return this;
  },

  render() {
    return `
      <div class="participants-selector">
        <label>Кількість учасників</label>
        <div class="selector-controls">
          <button class="selector-btn minus" id="decrease-participants" ${this.value <= this.min ? 'disabled' : ''}>
            −
          </button>
          <div class="selector-value">
            <span id="participant-count">${this.value}</span>
            <span class="selector-unit">осіб</span>
          </div>
          <button class="selector-btn plus" id="increase-participants" ${this.value >= this.max ? 'disabled' : ''}>
            +
          </button>
        </div>
        <input 
          type="range" 
          id="participants-range" 
          min="${this.min}" 
          max="${this.max}" 
          value="${this.value}"
        >
        <div class="range-labels">
          <span>${this.min}</span>
          <span>${this.max}</span>
        </div>
      </div>
    `;
  },

  attachEvents(container) {
    const decreaseBtn = container.querySelector('#decrease-participants');
    const increaseBtn = container.querySelector('#increase-participants');
    const rangeInput = container.querySelector('#participants-range');
    const countDisplay = container.querySelector('#participant-count');

    decreaseBtn?.addEventListener('click', () => {
      if (this.value > this.min) {
        this.value--;
        this.updateUI(container);
        this.triggerChange();
        TelegramAPI.hapticFeedback('light');
      }
    });

    increaseBtn?.addEventListener('click', () => {
      if (this.value < this.max) {
        this.value++;
        this.updateUI(container);
        this.triggerChange();
        TelegramAPI.hapticFeedback('light');
      }
    });

    rangeInput?.addEventListener('input', (e) => {
      this.value = parseInt(e.target.value);
      this.updateUI(container);
      this.triggerChange();
    });
  },

  updateUI(container) {
    const decreaseBtn = container.querySelector('#decrease-participants');
    const increaseBtn = container.querySelector('#increase-participants');
    const rangeInput = container.querySelector('#participants-range');
    const countDisplay = container.querySelector('#participant-count');

    if (countDisplay) countDisplay.textContent = this.value;
    if (rangeInput) rangeInput.value = this.value;
    if (decreaseBtn) decreaseBtn.disabled = this.value <= this.min;
    if (increaseBtn) increaseBtn.disabled = this.value >= this.max;
  },

  triggerChange() {
    if (this.onChange) {
      this.onChange(this.value);
    }
  },

  getValue() {
    return this.value;
  },

  validate() {
    return this.value >= this.min && this.value <= this.max;
  }
};
```

### 2.6 Location Picker

```javascript
// screens/location-picker.js

const LocationPicker = {
  container: null,
  mapManager: null,
  selectedLocation: null,
  onSelect: null,

  async init(options = {}) {
    this.onSelect = options.onSelect || null;
    this.container = document.getElementById('location-picker-screen');
    
    await this.render();
    await this.initMap();
    this.attachEvents();
    
    return this;
  },

  async render() {
    const location = await Geolocation.getCurrentPosition();
    
    this.container.innerHTML = `
      <div class="location-picker-screen">
        <header class="picker-header">
          <button class="back-btn" id="picker-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>Обери локацію</h2>
          <button class="confirm-btn" id="picker-confirm" disabled>Готово</button>
        </header>
        
        <div class="picker-map" id="picker-map"></div>
        
        <div class="picker-search">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input type="text" id="location-search" placeholder="Пошук місця...">
        </div>
        
        <div class="selected-location" id="selected-location">
          <p class="no-selection">Натисни на карту, щоб обрати місце</p>
        </div>
        
        <div class="quick-locations">
          <h4>Поблизу</h4>
          <div class="quick-list" id="quick-locations">
            <div class="quick-loading">Завантаження...</div>
          </div>
        </div>
      </div>
    `;
  },

  async initMap() {
    const location = await Geolocation.getCurrentPosition();
    
    this.mapManager = await MapManager.init('picker-map');
    this.mapManager.map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 14
    });

    // Додаємо маркер для вибору
    this.setupMapClick();
  },

  setupMapClick() {
    const self = this;
    
    this.mapManager.map.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      await this.selectLocation(lat, lng);
    });
  },

  async selectLocation(lat, lng) {
    // Зупиняємо спостереження за геолокацією
    if (this.locationWatch) {
      Geolocation.clearWatch(this.locationWatch);
    }

    this.selectedLocation = { latitude: lat, longitude: lng };

    // Отримуємо адресу через MapBox Geocoding
    await this.reverseGeocode(lat, lng);

    // Оновлюємо UI
    const confirmBtn = document.getElementById('picker-confirm');
    if (confirmBtn) {
      confirmBtn.disabled = false;
    }

    // Показуємо маркер
    if (this.selectionMarker) {
      this.selectionMarker.remove();
    }

    const el = document.createElement('div');
    el.className = 'selection-marker';
    el.innerHTML = '📍';

    this.selectionMarker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(this.mapManager.map);

    TelegramAPI.hapticFeedback('medium');
  },

  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=uk`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        
        this.selectedLocation = {
          ...this.selectedLocation,
          address: place.place_name,
          place_name: place.text,
          city: this.extractCity(place),
          place_type: this.guessPlaceType(place)
        };

        this.updateSelectedUI();
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      this.selectedLocation.address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      this.updateSelectedUI();
    }
  },

  extractCity(feature) {
    const city = feature.context?.find(c => 
      c.id.startsWith('place')
    );
    return city?.text || 'Київ';
  },

  guessPlaceType(feature) {
    const category = feature.properties?.category || '';
    const name = feature.text?.toLowerCase() || '';
    
    if (category.includes('restaurant') || name.includes('кафе') || name.includes('ресторан')) {
      return 'restaurant';
    }
    if (category.includes('bar') || name.includes('бар') || name.includes('паб')) {
      return 'bar';
    }
    if (category.includes('cafe') || name.includes('coffee')) {
      return 'cafe';
    }
    if (category.includes('park')) {
      return 'park';
    }
    if (category.includes('beach')) {
      return 'beach';
    }
    return 'street';
  },

  updateSelectedUI() {
    const container = document.getElementById('selected-location');
    if (!container) return;

    container.innerHTML = `
      <div class="selected-info">
        <div class="selected-icon">📍</div>
        <div class="selected-details">
          <p class="place-name">${this.selectedLocation.place_name || 'Обране місце'}</p>
          <p class="place-address">${this.selectedLocation.address || ''}</p>
        </div>
      </div>
    `;
  },

  attachEvents() {
    // Back button
    document.getElementById('picker-back')?.addEventListener('click', () => {
      this.close();
    });

    // Confirm button
    document.getElementById('picker-confirm')?.addEventListener('click', () => {
      if (this.selectedLocation && this.onSelect) {
        this.onSelect(this.selectedLocation);
      }
      this.close();
    });

    // Search
    document.getElementById('location-search')?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await this.searchPlaces(e.target.value);
      }
    });
  },

  async searchPlaces(query) {
    if (!query) return;

    const location = this.mapManager.currentLocation;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&proximity=${location.longitude},${location.latitude}&language=uk&limit=5`
      );
      const data = await response.json();

      this.showSearchResults(data.features || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  },

  showSearchResults(features) {
    const container = document.getElementById('quick-locations');
    
    if (features.length === 0) {
      container.innerHTML = '<p class="no-results">Нічого не знайдено</p>';
      return;
    }

    container.innerHTML = features.map(feature => `
      <button class="quick-item" data-lat="${feature.center[1]}" data-lng="${feature.center[0]}">
        <span class="quick-icon">📍</span>
        <div class="quick-info">
          <p class="quick-name">${feature.text}</p>
          <p class="quick-address">${feature.place_name}</p>
        </div>
      </button>
    `).join('');

    container.querySelectorAll('.quick-item').forEach(item => {
      item.addEventListener('click', async () => {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        
        this.mapManager.map.flyTo({ center: [lng, lat], zoom: 16 });
        await this.selectLocation(lat, lng);
      });
    });
  },

  close() {
    if (this.mapManager) {
      this.mapManager.destroy();
    }
    App.navigateTo('create-event');
  },

  show() {
    this.container.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

### 2.7 Create Event Screen

```javascript
// screens/create-event.js

const CreateEventScreen = {
  container: null,
  formData: {
    title: '',
    description: '',
    category: null,
    event_date: null,
    event_time: '18:00',
    latitude: null,
    longitude: null,
    address: '',
    place_name: '',
    place_type: 'street',
    max_participants: 10,
    requires_approval: true,
    cover_image: null,
    cover_image_url: null
  },
  currentStep: 0,
  steps: ['category', 'basics', 'location', 'participants', 'review'],

  init() {
    this.container = document.getElementById('create-event-screen');
    this.render();
    this.attachEvents();
    return this;
  },

  render() {
    this.container.innerHTML = `
      <div class="create-event-container">
        <header class="create-header">
          <button class="back-btn" id="create-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>Створити подію</h2>
          <div class="step-indicator">
            <span id="current-step">1</span>/<span>${this.steps.length}</span>
          </div>
        </header>

        <div class="create-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill" style="width: 20%"></div>
          </div>
        </div>

        <div class="create-content" id="create-content">
          <!-- Steps will be rendered dynamically -->
        </div>

        <div class="create-footer">
          <button class="nav-btn secondary" id="prev-step" style="visibility: hidden">
            Назад
          </button>
          <button class="nav-btn primary" id="next-step" disabled>
            Далі
          </button>
        </div>
      </div>
    `;

    this.renderStep(0);
  },

  renderStep(stepIndex) {
    this.currentStep = stepIndex;
    const content = document.getElementById('create-content');
    const progressFill = document.getElementById('progress-fill');
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const stepDisplay = document.getElementById('current-step');

    // Update progress
    const progress = ((stepIndex + 1) / this.steps.length) * 100;
    progressFill.style.width = `${progress}%`;
    stepDisplay.textContent = stepIndex + 1;

    // Update navigation buttons
    prevBtn.style.visibility = stepIndex > 0 ? 'visible' : 'hidden';
    nextBtn.textContent = stepIndex === this.steps.length - 1 ? 'Створити' : 'Далі';
    nextBtn.disabled = !this.validateStep(stepIndex);

    // Render step content
    switch(stepIndex) {
      case 0:
        content.innerHTML = this.renderCategoryStep();
        CategoryPicker.init((cat) => {
          this.formData.category = cat;
          this.updateNextButton();
        }).attachEvents(content);
        break;
        
      case 1:
        content.innerHTML = this.renderBasicsStep();
        this.attachBasicsEvents();
        break;
        
      case 2:
        content.innerHTML = this.renderLocationStep();
        break;
        
      case 3:
        content.innerHTML = this.renderParticipantsStep();
        ParticipantsSelector.init({
          value: this.formData.max_participants,
          onChange: (val) => {
            this.formData.max_participants = val;
          }
        }).attachEvents(content);
        break;
        
      case 4:
        content.innerHTML = this.renderReviewStep();
        this.attachReviewEvents();
        break;
    }
  },

  renderCategoryStep() {
    return `
      <div class="step-content">
        <h3>Яка подія?</h3>
        <p class="step-description">Обери тип події</p>
        <div id="category-container">
          ${CategoryPicker.render(this.formData.category)}
        </div>
      </div>
    `;
  },

  renderBasicsStep() {
    return `
      <div class="step-content">
        <h3>Основна інформація</h3>
        
        <div class="form-group">
          <label for="event-title">Назва події *</label>
          <input 
            type="text" 
            id="event-title" 
            class="form-input"
            placeholder="Наприклад: Party на даху"
            maxlength="50"
            value="${this.formData.title}"
          >
          <span class="char-count"><span id="title-count">0</span>/50</span>
        </div>
        
        <div class="form-group">
          <label for="event-description">Опис</label>
          <textarea 
            id="event-description" 
            class="form-textarea"
            placeholder="Розкажи більше про подію..."
            maxlength="500"
          >${this.formData.description}</textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group half" id="date-container">
            ${DatePicker.init({
              minDate: new Date(),
              onChange: (date) => {
                this.formData.event_date = date;
                this.updateNextButton();
              }
            }).render(this.formData.event_date)}
          </div>
          
          <div class="form-group half" id="time-container">
            ${TimePicker.init({
              onChange: (time) => {
                this.formData.event_time = time;
              }
            }).render(this.formData.event_time)}
          </div>
        </div>
        
        <div class="form-group">
          <label>Обкладинка</label>
          <div class="photo-upload" id="photo-upload">
            ${this.formData.cover_image_url ? `
              <img src="${this.formData.cover_image_url}" alt="Cover" class="cover-preview">
              <button class="change-photo-btn">Змінити</button>
            ` : `
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3z"/>
              </svg>
              <p>Додати фото</p>
              <input type="file" accept="image/*" id="cover-input" hidden>
            `}
          </div>
        </div>
      </div>
    `;
  },

  renderLocationStep() {
    const hasLocation = this.formData.latitude && this.formData.longitude;
    
    return `
      <div class="step-content">
        <h3>Локація</h3>
        <p class="step-description">Де відбудеться подія?</p>
        
        <div class="location-preview" id="location-preview">
          ${hasLocation ? `
            <div class="location-info">
              <span class="location-icon">📍</span>
              <div class="location-details">
                <p class="location-name">${this.formData.place_name || 'Обране місце'}</p>
                <p class="location-address">${this.formData.address || ''}</p>
              </div>
            </div>
          ` : `
            <p class="no-location">Локація не обрана</p>
          `}
        </div>
        
        <button class="select-location-btn" id="select-location-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          ${hasLocation ? 'Змінити локацію' : 'Обрати на карті'}
        </button>
      </div>
    `;
  },

  renderParticipantsStep() {
    return `
      <div class="step-content">
        <h3>Учасники</h3>
        <p class="step-description">Скільки людей може приєднатися?</p>
        
        <div id="participants-container">
          ${ParticipantsSelector.init({
            value: this.formData.max_participants,
            min: 2,
            max: 50,
            onChange: (val) => {
              this.formData.max_participants = val;
            }
          }).render()}
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="requires-approval" ${this.formData.requires_approval ? 'checked' : ''}>
            <span class="checkbox-custom"></span>
            <span>Потрібне схвалення</span>
          </label>
          <p class="field-hint">Ти зможеш приймати або відхиляти заявки</p>
        </div>
      </div>
    `;
  },

  renderReviewStep() {
    return `
      <div class="step-content">
        <h3>Все готово!</h3>
        <p class="step-description">Перевір інформацію перед публікацією</p>
        
        <div class="review-card">
          <div class="review-header">
            ${this.formData.cover_image_url ? `
              <img src="${this.formData.cover_image_url}" alt="Cover" class="review-cover">
            ` : `
              <div class="review-cover placeholder">
                <span>${CategoryPicker.getCategories().find(c => c.id === this.formData.category)?.icon || '📍'}</span>
              </div>
            `}
          </div>
          
          <div class="review-body">
            <h4>${this.formData.title || 'Без назви'}</h4>
            <div class="review-meta">
              <span class="review-category">${CategoryPicker.getCategories().find(c => c.id === this.formData.category)?.name || ''}</span>
            </div>
            
            ${this.formData.description ? `<p class="review-description">${this.formData.description}</p>` : ''}
            
            <div class="review-details">
              <div class="review-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2z"/>
                </svg>
                <span>${this.formatDate(this.formData.event_date)}, ${this.formData.event_time}</span>
              </div>
              
              <div class="review-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
                <span>${this.formData.place_name || this.formData.address || 'Локація'}</span>
              </div>
              
              <div class="review-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>
                </svg>
                <span>${this.formData.max_participants} учасників</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  attachBasicsEvents() {
    const titleInput = document.getElementById('event-title');
    const titleCount = document.getElementById('title-count');
    const descInput = document.getElementById('event-description');
    const coverInput = document.getElementById('cover-input');
    const photoUpload = document.getElementById('photo-upload');
    const dateContainer = document.getElementById('date-container');
    const timeContainer = document.getElementById('time-container');

    titleInput?.addEventListener('input', (e) => {
      this.formData.title = e.target.value;
      if (titleCount) titleCount.textContent = e.target.value.length;
      this.updateNextButton();
    });

    descInput?.addEventListener('input', (e) => {
      this.formData.description = e.target.value;
    });

    photoUpload?.addEventListener('click', () => {
      coverInput?.click();
    });

    coverInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        this.formData.cover_image = file;
        await this.previewImage(file);
      }
    });

    DatePicker.attachEvents(dateContainer);
    TimePicker.attachEvents(timeContainer);
  },

  attachReviewEvents() {
    // Events already attached through render
  },

  async previewImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.querySelector('.cover-preview');
      if (preview) {
        preview.src = e.target.result;
      } else {
        const photoUpload = document.getElementById('photo-upload');
        if (photoUpload) {
          photoUpload.innerHTML = `
            <img src="${e.target.result}" alt="Cover" class="cover-preview">
            <button class="change-photo-btn">Змінити</button>
          `;
        }
      }
    };
    reader.readAsDataURL(file);
  },

  validateStep(stepIndex) {
    switch(stepIndex) {
      case 0:
        return this.formData.category !== null;
      case 1:
        return this.formData.title.trim().length >= 3 &&
               this.formData.event_date !== null;
      case 2:
        return this.formData.latitude !== null && this.formData.longitude !== null;
      case 3:
        return this.formData.max_participants >= 2 && this.formData.max_participants <= 50;
      case 4:
        return true;
      default:
        return false;
    }
  },

  updateNextButton() {
    const nextBtn = document.getElementById('next-step');
    if (nextBtn) {
      nextBtn.disabled = !this.validateStep(this.currentStep);
    }
  },

  attachEvents() {
    // Back button
    document.getElementById('create-back')?.addEventListener('click', () => {
      App.navigateTo('home');
    });

    // Navigation
    document.getElementById('prev-step')?.addEventListener('click', () => {
      if (this.currentStep > 0) {
        this.renderStep(this.currentStep - 1);
        TelegramAPI.hapticFeedback('light');
      }
    });

    document.getElementById('next-step')?.addEventListener('click', async () => {
      if (this.currentStep < this.steps.length - 1) {
        this.renderStep(this.currentStep + 1);
        TelegramAPI.hapticFeedback('light');
      } else {
        await this.submitEvent();
      }
    });

    // Location selection
    document.getElementById('select-location-btn')?.addEventListener('click', () => {
      App.navigateTo('location-picker');
    });
  },

  async selectLocation(location) {
    this.formData.latitude = location.latitude;
    this.formData.longitude = location.longitude;
    this.formData.address = location.address || '';
    this.formData.place_name = location.place_name || '';
    this.formData.place_type = location.place_type || 'street';
    
    this.renderStep(2); // Re-render location step
    this.updateNextButton();
  },

  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('uk-UA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  },

  async submitEvent() {
    try {
      LoadingScreen.show('Створення події...');
      
      let coverUrl = null;
      
      // Завантажуємо фото якщо є
      if (this.formData.cover_image) {
        // Спочатку створюємо подію без фото
        const eventId = await this.createEventWithoutPhoto();
        
        // Завантажуємо фото
        coverUrl = await Storage.uploadEventPhoto(eventId, this.formData.cover_image);
        
        // Оновлюємо подію з фото URL
        await supabase.rpc('update_event', {
          p_event_id: eventId,
          p_cover_image_url: coverUrl
        });
      } else {
        await this.createEventWithoutPhoto();
      }
      
      LoadingScreen.hide();
      
      TelegramAPI.showAlert('🎉 Подія створена!', () => {
        App.navigateTo('home');
      });
      
    } catch (error) {
      LoadingScreen.hide();
      console.error('Create event error:', error);
      TelegramAPI.showAlert('Помилка створення: ' + error.message);
    }
  },

  async createEventWithoutPhoto() {
    const { data, error } = await supabase.rpc('create_event', {
      p_title: this.formData.title,
      p_description: this.formData.description || null,
      p_category: this.formData.category,
      p_event_type: 'public',
      p_max_participants: this.formData.max_participants,
      p_event_date: this.formatDateForDB(this.formData.event_date),
      p_event_time: this.formData.event_time,
      p_duration_minutes: 120,
      p_requires_approval: this.formData.requires_approval,
      p_latitude: this.formData.latitude,
      p_longitude: this.formData.longitude,
      p_address: this.formData.address || null,
      p_city: this.extractCity(this.formData.address) || 'Київ',
      p_place_name: this.formData.place_name || null,
      p_place_type: this.formData.place_type || 'street'
    });

    if (error) throw error;
    return data;
  },

  formatDateForDB(date) {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },

  extractCity(address) {
    if (!address) return null;
    const parts = address.split(',');
    return parts.length > 1 ? parts[1].trim() : parts[0].trim();
  },

  show() {
    this.container.classList.remove('hidden');
    this.resetForm();
    this.render();
  },

  hide() {
    this.container.classList.add('hidden');
  },

  resetForm() {
    this.formData = {
      title: '',
      description: '',
      category: null,
      event_date: null,
      event_time: '18:00',
      latitude: null,
      longitude: null,
      address: '',
      place_name: '',
      place_type: 'street',
      max_participants: 10,
      requires_approval: true,
      cover_image: null,
      cover_image_url: null
    };
    this.currentStep = 0;
  }
};
```

---

## 📊 Sprint 3: Definition of Done

### Backend
- [ ] Storage bucket створено
- [ ] RPC `create_event()` оновлено
- [ ] RPC `update_event()` створено
- [ ] RPC `cancel_event()` створено
- [ ] Ліміти працюють (2-50 учасників, 10 подій на користувача)
- [ ] Валідація дати працює

### Frontend
- [ ] Create Event Screen з 5 кроками
- [ ] Category Picker
- [ ] Date & Time Pickers
- [ ] Participants Selector
- [ ] Location Picker з MapBox
- [ ] Photo Upload з превю
- [ ] Review Screen
- [ ] Submit & Validation

### UX
- [ ] Створення події за < 60 секунд
- [ ] Плавні переходи між кроками
- [ ] Валідація в реальному часі
- [ ] Progress bar

---

## ⏱️ Timeline Sprint 3

| День | Backend | Frontend |
|------|---------|----------|
| Пн | Storage setup | Form structure |
| Вт | RPC functions | Step components |
| Ср | Validation | Location picker |
| Чт | Photo upload | Photo upload UI |
| Пт | Testing | Integration |
| Сб | Code Review | Testing |
| Нд | Deploy | Bug Fixes |

---

## ▶️ Наступний Sprint

**Sprint 4: Join Flow & Chat**

- Join Request Flow
- Organizer Dashboard
- Chat System
- Notifications

[Дивитись Sprint 4 →](./SPRINT_4_ROADMAP.md)
