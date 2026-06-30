# 🚀 LinkUp Alpha Roadmap — Sprint 2: Map & Events
## Мета: На карті видно всі доступні події
## Тривалість: 1 тиждень

---

## 📋 Огляд Sprint 2

### Мета Sprint 2:
```
Користувач відкриває карту → бачить маркери подій → 
фільтрує за категорією → переглядає деталі в Bottom Sheet
```

### Результат Sprint 2:
- ✅ MapBox карта відображається
- ✅ Геолокація працює
- ✅ Маркери подій на карті
- ✅ Кластеризація маркерів
- ✅ Фільтри категорій
- ✅ Bottom Sheet з деталями

---

## 🗄️ Частина 1: Backend — Supabase

### 1.1 Таблиця: events

```sql
-- Події
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Основна інформація
  title TEXT NOT NULL,
  description TEXT,
  
  -- Організатор
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Категорія та тип
  category TEXT NOT NULL, -- party, sport, food, music, art, outdoor, game, talk, dating, networking, study, other
  event_type TEXT NOT NULL, -- private, public
  
  -- Учасники
  max_participants INTEGER DEFAULT 10,
  current_participants INTEGER DEFAULT 0,
  
  -- Час
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  
  -- Системні
  status TEXT DEFAULT 'active', -- active, cancelled, completed
  requires_approval BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Індекси для швидкого пошуку
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);

-- RLS для events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Організатор бачить свої події
CREATE POLICY "Organizers can manage own events"
  ON events FOR ALL
  USING (auth.uid() = organizer_id);

-- Всі бачать активні публічні події
CREATE POLICY "Anyone can view active events"
  ON events FOR SELECT
  USING (
    status = 'active' 
    AND event_type = 'public'
    AND event_date >= CURRENT_DATE
  );
```

### 1.2 Таблиця: event_locations

```sql
-- Локації подій (PostGIS для геолокації)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Альтернатива: прості lat/lng координати (простіше для старту)
CREATE TABLE event_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Координати
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Адреса
  address TEXT,
  city TEXT,
  place_name TEXT, -- назва місця (кафе, парк, тощо)
  place_type TEXT, -- cafe, bar, restaurant, park, beach, street, indoor
  
  -- Гео дані для PostGIS (опціонально)
  -- location GEOGRAPHY(POINT, 4326),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Індекс для гео-пошуку
CREATE INDEX idx_locations_coords ON event_locations(latitude, longitude);

-- RLS
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event locations"
  ON event_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id 
      AND status = 'active' 
      AND event_type = 'public'
    )
  );

CREATE POLICY "Organizers can manage own locations"
  ON event_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id 
      AND organizer_id = auth.uid()
    )
  );
```

### 1.3 Таблиця: event_participants

```sql
-- Учасники подій
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Статус заявки
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, cancelled
  
  -- Для приватних подій
  message TEXT, -- повідомлення організатору
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, user_id)
);

-- Індекси
CREATE INDEX idx_participants_event ON event_participants(event_id);
CREATE INDEX idx_participants_user ON event_participants(user_id);
CREATE INDEX idx_participants_status ON event_participants(status);

-- RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Користувач бачить свої заявки
CREATE POLICY "Users can manage own participation"
  ON event_participants FOR ALL
  USING (auth.uid() = user_id);

-- Організатор бачить заявки на свої події
CREATE POLICY "Organizers can manage event participation"
  ON event_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id 
      AND organizer_id = auth.uid()
    )
  );
```

### 1.4 RPC Функції

```sql
-- Отримання подій поблизу
CREATE OR REPLACE FUNCTION get_events_nearby(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_km DECIMAL DEFAULT 10, -- радіус в км
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  event_type TEXT,
  organizer_id UUID,
  organizer_name TEXT,
  organizer_avatar TEXT,
  max_participants INTEGER,
  current_participants INTEGER,
  event_date DATE,
  event_time TIME,
  duration_minutes INTEGER,
  requires_approval BOOLEAN,
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT,
  city TEXT,
  place_name TEXT,
  place_type TEXT,
  distance_km DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title,
    e.description,
    e.category,
    e.event_type,
    e.organizer_id,
    p.display_name as organizer_name,
    p.avatar_url as organizer_avatar,
    e.max_participants,
    e.current_participants,
    e.event_date,
    e.event_time,
    e.duration_minutes,
    e.requires_approval,
    loc.latitude,
    loc.longitude,
    loc.address,
    loc.city,
    loc.place_name,
    loc.place_type,
    -- Розрахунок відстані в км (приблизний)
    (6371 * acos(
      cos(radians(p_latitude)) * cos(radians(loc.latitude)) * 
      cos(radians(loc.longitude) - radians(p_longitude)) + 
      sin(radians(p_latitude)) * sin(radians(loc.latitude))
    ))::DECIMAL(10, 2) as distance_km
  FROM events e
  INNER JOIN event_locations loc ON e.id = loc.event_id
  INNER JOIN profiles p ON e.organizer_id = p.id
  WHERE 
    e.status = 'active'
    AND e.event_type = 'public'
    AND e.event_date >= CURRENT_DATE
    AND (
      p_category IS NULL 
      OR e.category = p_category
    )
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * cos(radians(loc.latitude)) * 
        cos(radians(loc.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * sin(radians(loc.latitude))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$;

-- Створення події
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
  p_place_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
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
    requires_approval
  )
  VALUES (
    p_title,
    p_description,
    auth.uid(),
    p_category,
    p_event_type,
    p_max_participants,
    p_event_date,
    p_event_time,
    p_duration_minutes,
    p_requires_approval
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

-- Отримання деталей події
CREATE OR REPLACE FUNCTION get_event_details(p_event_id UUID)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  event_type TEXT,
  organizer_id UUID,
  organizer_name TEXT,
  organizer_username TEXT,
  organizer_avatar TEXT,
  organizer_rating DECIMAL,
  max_participants INTEGER,
  current_participants INTEGER,
  event_date DATE,
  event_time TIME,
  duration_minutes INTEGER,
  requires_approval BOOLEAN,
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT,
  city TEXT,
  place_name TEXT,
  place_type TEXT,
  is_joined BOOLEAN,
  join_status TEXT,
  is_organizer BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title,
    e.description,
    e.category,
    e.event_type,
    e.organizer_id,
    p.display_name as organizer_name,
    p.username as organizer_username,
    p.avatar_url as organizer_avatar,
    4.5 as organizer_rating, -- TODO: реальний рейтинг
    e.max_participants,
    e.current_participants,
    e.event_date,
    e.event_time,
    e.duration_minutes,
    e.requires_approval,
    loc.latitude,
    loc.longitude,
    loc.address,
    loc.city,
    loc.place_name,
    loc.place_type,
    CASE WHEN ep.id IS NOT NULL THEN TRUE ELSE FALSE END as is_joined,
    COALESCE(ep.status, 'none') as join_status,
    CASE WHEN e.organizer_id = auth.uid() THEN TRUE ELSE FALSE END as is_organizer
  FROM events e
  INNER JOIN event_locations loc ON e.id = loc.event_id
  INNER JOIN profiles p ON e.organizer_id = p.id
  LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.user_id = auth.uid()
  WHERE e.id = p_event_id;
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
│   └── mapbox.js          🆕
├── screens/
│   ├── splash.js
│   ├── login.js
│   ├── onboarding.js
│   ├── home.js            🆕 оновлено
│   └── event-detail.js    🆕
├── components/
│   ├── interest-chip.js
│   ├── loading.js
│   ├── map-marker.js      🆕
│   ├── event-card.js       🆕
│   └── bottom-sheet.js     🆕
└── utils/
    ├── geolocation.js      🆕
    └── distance.js         🆕
```

### 2.2 MapBox Integration

```javascript
// lib/mapbox.js

// Публічний токен MapBox (потрібно замінити на реальний)
const MAPBOX_TOKEN = 'pk.YOUR_MAPBOX_PUBLIC_TOKEN';

const MapManager = {
  map: null,
  markers: [],
  clusters: null,
  currentLocation: null,

  async init(containerId) {
    // Завантажуємо MapBox SDK
    if (!window.mapboxgl) {
      await this.loadScript();
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Отримуємо поточну локацію
    this.currentLocation = await Geolocation.getCurrentPosition();

    // Створюємо карту
    this.map = new mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/mapbox/dark-v11', // темна тема
      center: [
        this.currentLocation.longitude,
        this.currentLocation.latitude
      ],
      zoom: 13,
      attributionControl: false
    });

    // Додаємоcontrols
    this.addControls();

    // Чекаємо на завантаження карти
    await this.waitForLoad();

    return this;
  },

  loadScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);

      // CSS для MapBox
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    });
  },

  waitForLoad() {
    return new Promise(resolve => {
      this.map.on('load', resolve);
    });
  },

  addControls() {
    // Зум контрол
    this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Геолокація контрол
    const geoControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    });
    this.map.addControl(geoControl, 'bottom-right');
  },

  // Додавання маркера події
  addEventMarker(event, onClick) {
    // Створюємо DOM елемент для маркера
    const el = document.createElement('div');
    el.className = 'event-marker';
    el.innerHTML = this.getMarkerHTML(event.category);
    
    // Кастомний popup
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: false,
      closeOnClick: false
    }).setHTML(`
      <div class="marker-popup">
        <img src="${event.organizer_avatar || '/img/default-avatar.png'}" alt="">
        <div class="popup-content">
          <h4>${event.title}</h4>
          <p>${event.place_name || event.address}</p>
          <span class="distance">${event.distance_km} км</span>
        </div>
      </div>
    `);

    // Створюємо маркер
    const marker = new mapboxgl.Marker(el)
      .setLngLat([event.longitude, event.latitude])
      .setPopup(popup)
      .addTo(this.map);

    // Hover ефекти
    el.addEventListener('mouseenter', () => marker.togglePopup());
    el.addEventListener('mouseleave', () => marker.togglePopup());
    
    // Click
    el.addEventListener('click', () => {
      if (onClick) onClick(event);
      TelegramAPI.hapticFeedback('light');
    });

    this.markers.push(marker);
    return marker;
  },

  getMarkerHTML(category) {
    const icons = {
      party: '🎉',
      sport: '⚽',
      food: '🍕',
      music: '🎵',
      art: '🎨',
      outdoor: '🏕️',
      game: '🎮',
      talk: '💬',
      dating: '💕',
      networking: '💼',
      study: '📚',
      other: '✨'
    };

    return `
      <div class="marker-pin ${category}">
        <span class="marker-icon">${icons[category] || '📍'}</span>
      </div>
      <div class="marker-pulse"></div>
    `;
  },

  // Додавання маркера поточної локації
  addUserLocationMarker() {
    if (!this.currentLocation) return;

    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = `
      <div class="location-dot"></div>
      <div class="location-pulse"></div>
    `;

    this.userMarker = new mapboxgl.Marker(el)
      .setLngLat([
        this.currentLocation.longitude,
        this.currentLocation.latitude
      ])
      .addTo(this.map);

    return this.userMarker;
  },

  // Очищення маркерів
  clearMarkers() {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  },

  // Переміщення до локації
  flyTo(lat, lng, zoom = 15) {
    this.map.flyTo({
      center: [lng, lat],
      zoom: zoom,
      duration: 1500
    });
  },

  // Фільтрація маркерів
  filterMarkers(events) {
    this.clearMarkers();
    events.forEach(event => {
      this.addEventMarker(event, (e) => {
        if (this.onMarkerClick) {
          this.onMarkerClick(e);
        }
      });
    });
  },

  // Встановлення center callback
  onMove(callback) {
    this.map.on('moveend', () => {
      const center = this.map.getCenter();
      callback({
        latitude: center.lat,
        longitude: center.lng
      });
    });
  },

  // Знищення карти
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
};
```

### 2.3 Геолокація утиліти

```javascript
// utils/geolocation.js

const Geolocation = {
  // Отримання поточної позиції
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        // Fallback на Київ
        resolve({
          latitude: 50.4501,
          longitude: 30.5234,
          accuracy: 0,
          source: 'fallback'
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'gps'
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Fallback
          resolve({
            latitude: 50.4501,
            longitude: 30.5234,
            accuracy: 0,
            source: 'fallback'
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000
        }
      );
    });
  },

  // Спостереження за позицією
  watchPosition(callback, errorCallback) {
    if (!navigator.geolocation) {
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        if (errorCallback) errorCallback(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  },

  // Зупинка спостереження
  clearWatch(watchId) {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
};
```

### 2.4 Відстань утиліти

```javascript
// utils/distance.js

const Distance = {
  // Формула Haversine для розрахунку відстані між двома точками
  calculate(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радіус Землі в км
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    
    return d;
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  // Форматування відстані
  format(km) {
    if (km < 1) {
      return `${Math.round(km * 1000)} м`;
    }
    if (km < 10) {
      return `${km.toFixed(1)} км`;
    }
    return `${Math.round(km)} км`;
  },

  // Сортування подій за відстанню
  sortByDistance(events, userLat, userLng) {
    return events.map(event => ({
      ...event,
      distance: this.calculate(
        userLat,
        userLng,
        event.latitude,
        event.longitude
      )
    })).sort((a, b) => a.distance - b.distance);
  }
};
```

### 2.5 Bottom Sheet Component

```javascript
// components/bottom-sheet.js

const BottomSheet = {
  container: null,
  isOpen: false,
  startY: 0,
  currentY: 0,
  minHeight: 0,
  maxHeight: 0,

  init() {
    this.createElement();
    this.attachEvents();
    return this;
  },

  createElement() {
    if (document.getElementById('bottom-sheet')) return;

    const el = document.createElement('div');
    el.id = 'bottom-sheet';
    el.className = 'bottom-sheet hidden';
    el.innerHTML = `
      <div class="sheet-backdrop"></div>
      <div class="sheet-content">
        <div class="sheet-header">
          <div class="sheet-handle"></div>
        </div>
        <div class="sheet-body" id="sheet-body">
          <!-- Dynamic content -->
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.container = el;
  },

  attachEvents() {
    const sheetContent = this.container.querySelector('.sheet-content');
    const backdrop = this.container.querySelector('.sheet-backdrop');

    // Touch events для drag
    sheetContent.addEventListener('touchstart', (e) => {
      this.startY = e.touches[0].clientY;
      sheetContent.classList.add('dragging');
    });

    sheetContent.addEventListener('touchmove', (e) => {
      this.currentY = e.touches[0].clientY;
      const diff = this.startY - this.currentY;
      
      // Обмежуємо переміщення
      const currentHeight = sheetContent.offsetHeight;
      const newHeight = Math.max(
        this.minHeight,
        Math.min(this.maxHeight, currentHeight + diff)
      );
      
      sheetContent.style.height = `${newHeight}px`;
      this.startY = this.currentY;
    });

    sheetContent.addEventListener('touchend', () => {
      sheetContent.classList.remove('dragging');
      const height = sheetContent.offsetHeight;
      
      // Snap до min або max
      if (height < (this.minHeight + this.maxHeight) / 2) {
        this.snapToMin();
      } else {
        this.snapToMax();
      }
    });

    // Click на backdrop закриває
    backdrop.addEventListener('click', () => this.close());
  },

  snapToMin() {
    const sheetContent = this.container.querySelector('.sheet-content');
    sheetContent.style.height = `${this.minHeight}px`;
  },

  snapToMax() {
    const sheetContent = this.container.querySelector('.sheet-content');
    sheetContent.style.height = `${this.maxHeight}px`;
  },

  open(content, options = {}) {
    this.minHeight = options.minHeight || 100;
    this.maxHeight = options.maxHeight || window.innerHeight * 0.8;
    
    const body = document.getElementById('sheet-body');
    body.innerHTML = content;
    
    const sheetContent = this.container.querySelector('.sheet-content');
    sheetContent.style.height = `${this.minHeight}px`;

    this.container.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.isOpen = true;

    // Анімація відкриття
    requestAnimationFrame(() => {
      sheetContent.style.transition = 'height 0.3s ease';
      this.snapToMax();
      setTimeout(() => {
        sheetContent.style.transition = '';
      }, 300);
    });
  },

  close() {
    this.container.classList.add('hidden');
    document.body.style.overflow = '';
    this.isOpen = false;
    TelegramAPI.hapticFeedback('light');
  },

  updateContent(content) {
    const body = document.getElementById('sheet-body');
    body.innerHTML = content;
  }
};
```

### 2.6 Event Detail Component

```javascript
// components/event-card.js

const EventCard = {
  // Картка для списку
  renderListItem(event) {
    return `
      <div class="event-card" data-event-id="${event.event_id}">
        <div class="event-image">
          <img src="${event.image_url || '/img/event-placeholder.jpg'}" alt="${event.title}">
          <div class="event-category ${event.category}">${this.getCategoryLabel(event.category)}</div>
        </div>
        <div class="event-info">
          <h3>${event.title}</h3>
          <div class="event-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              ${event.distance_km || Distance.format(event.distance)} км
            </span>
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>
              </svg>
              ${event.current_participants}/${event.max_participants}
            </span>
          </div>
          <div class="event-footer">
            <div class="organizer">
              <img src="${event.organizer_avatar || '/img/default-avatar.png'}" alt="">
              <span>${event.organizer_name}</span>
            </div>
            <span class="event-time">${this.formatDateTime(event.event_date, event.event_time)}</span>
          </div>
        </div>
      </div>
    `;
  },

  // Деталі для Bottom Sheet
  renderDetail(event) {
    return `
      <div class="event-detail">
        <div class="detail-header">
          <div class="detail-category ${event.category}">${this.getCategoryLabel(event.category)}</div>
          <h2>${event.title}</h2>
          <div class="detail-rating">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <span>${event.organizer_rating || 4.8}</span>
          </div>
        </div>
        
        <div class="detail-info">
          <div class="info-row">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            <div>
              <p class="info-label">Локація</p>
              <p class="info-value">${event.place_name || event.address || 'Не вказано'}</p>
              <p class="info-sub">${event.address || ''}</p>
            </div>
          </div>
          
          <div class="info-row">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <div>
              <p class="info-label">Дата та час</p>
              <p class="info-value">${this.formatDateTime(event.event_date, event.event_time)}</p>
              <p class="info-sub">Тривалість: ${event.duration_minutes} хв</p>
            </div>
          </div>
          
          <div class="info-row">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>
            </svg>
            <div>
              <p class="info-label">Учасники</p>
              <p class="info-value">${event.current_participants} / ${event.max_participants}</p>
              <div class="participants-bar">
                <div class="bar-fill" style="width: ${(event.current_participants / event.max_participants) * 100}%"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="organizer-section">
          <img src="${event.organizer_avatar || '/img/default-avatar.png'}" alt="" class="org-avatar">
          <div class="org-info">
            <p class="org-label">Організатор</p>
            <p class="org-name">${event.organizer_name}</p>
            <p class="org-username">@${event.organizer_username || 'unknown'}</p>
          </div>
        </div>
        
        ${event.description ? `
        <div class="description-section">
          <h4>Про подію</h4>
          <p>${event.description}</p>
        </div>
        ` : ''}
        
        <div class="action-buttons">
          ${this.renderActionButton(event)}
        </div>
      </div>
    `;
  },

  renderActionButton(event) {
    if (event.is_organizer) {
      return `
        <button class="action-btn secondary" onclick="EventDetail.showManage('${event.event_id}')">
          Редагувати
        </button>
      `;
    }

    if (event.is_joined) {
      if (event.join_status === 'pending') {
        return `
          <button class="action-btn disabled" disabled>
            Очікує схвалення...
          </button>
        `;
      }
      if (event.join_status === 'approved') {
        return `
          <button class="action-btn secondary" onclick="EventDetail.leave('${event.event_id}')">
            Вийти з події
          </button>
        `;
      }
    }

    if (event.current_participants >= event.max_participants) {
      return `
        <button class="action-btn disabled" disabled>
          Місць немає
        </button>
      `;
    }

    return `
      <button class="action-btn primary" onclick="EventDetail.join('${event.event_id}')">
        ${event.requires_approval ? 'Подати запит' : 'Приєднатися'}
      </button>
    `;
  },

  getCategoryLabel(category) {
    const labels = {
      party: 'Party',
      sport: 'Спорт',
      food: 'Їжа',
      music: 'Музика',
      art: 'Мистецтво',
      outdoor: 'На природі',
      game: 'Ігри',
      talk: 'Трепет',
      dating: 'Побачення',
      networking: 'Нетворкінг',
      study: 'Навчання',
      other: 'Інше'
    };
    return labels[category] || category;
  },

  formatDateTime(date, time) {
    const dateObj = new Date(date);
    const day = dateObj.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = time ? time.substring(0, 5) : '';
    return `${day}, ${timeStr}`;
  }
};
```

### 2.7 Home Screen (оновлений)

```javascript
// screens/home.js

const HomeScreen = {
  container: null,
  mapManager: null,
  currentEvents: [],
  currentFilter: 'all',
  currentLocation: null,

  async init() {
    this.container = document.getElementById('home-screen');
    await this.render();
    await this.initMap();
    await this.loadEvents();
    this.attachEvents();
    return this;
  },

  async render() {
    this.container.innerHTML = `
      <div class="home-container">
        <!-- Header -->
        <header class="home-header">
          <div class="header-left">
            <button class="location-btn" id="location-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              <span class="location-name" id="location-name">Завантаження...</span>
              <svg class="chevron" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
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
        
        <!-- Map -->
        <div class="map-wrapper">
          <div id="map-container" class="map-container"></div>
          <button class="my-location-btn" id="my-location-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </button>
        </div>
        
        <!-- Filter chips -->
        <div class="filter-section">
          <div class="filter-chips" id="filter-chips">
            <button class="filter-chip active" data-filter="all">
              <span class="chip-dot all"></span>
              Усі
            </button>
            <button class="filter-chip" data-filter="party">
              <span class="chip-dot party"></span>
              Party
            </button>
            <button class="filter-chip" data-filter="sport">
              <span class="chip-dot sport"></span>
              Спорт
            </button>
            <button class="filter-chip" data-filter="food">
              <span class="chip-dot food"></span>
              Їжа
            </button>
            <button class="filter-chip" data-filter="music">
              <span class="chip-dot music"></span>
              Музика
            </button>
          </div>
        </div>
        
        <!-- Events list -->
        <div class="events-section">
          <div class="section-header">
            <h2>Поблизу вас <span class="event-count" id="event-count"></span></h2>
            <button class="see-all-btn" id="see-all-btn">Дивитись усі</button>
          </div>
          <div class="events-scroll" id="events-list">
            <div class="loading-events">
              <div class="spinner"></div>
              <p>Завантаження подій...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async initMap() {
    this.mapManager = await MapManager.init('map-container');
    this.currentLocation = this.mapManager.currentLocation;
    
    // Оновлюємо назву локації
    this.updateLocationName();
    
    // Додаємо маркер користувача
    this.mapManager.addUserLocationMarker();
    
    // Callback при кліку на маркер
    this.mapManager.onMarkerClick = (event) => {
      this.showEventDetail(event);
    };
  },

  updateLocationName() {
    const locationName = document.getElementById('location-name');
    if (this.currentLocation?.source === 'gps') {
      locationName.textContent = 'Ваша локація';
    } else {
      locationName.textContent = 'Київ';
    }
  },

  async loadEvents() {
    try {
      LoadingScreen.show();
      
      const { data, error } = await supabase.rpc('get_events_nearby', {
        p_latitude: this.currentLocation.latitude,
        p_longitude: this.currentLocation.longitude,
        p_radius_km: 10,
        p_category: this.currentFilter === 'all' ? null : this.currentFilter,
        p_limit: 50
      });

      if (error) throw error;

      this.currentEvents = data || [];
      this.renderEvents();
      this.renderMarkers();
      
      LoadingScreen.hide();
    } catch (error) {
      LoadingScreen.hide();
      console.error('Error loading events:', error);
      this.showEmptyState();
    }
  },

  renderEvents() {
    const container = document.getElementById('events-list');
    const countEl = document.getElementById('event-count');
    
    countEl.textContent = `(${this.currentEvents.length})`;

    if (this.currentEvents.length === 0) {
      this.showEmptyState();
      return;
    }

    container.innerHTML = this.currentEvents
      .slice(0, 10)
      .map(event => EventCard.renderListItem(event))
      .join('');

    // Attach click events
    container.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', () => {
        const eventId = card.dataset.eventId;
        const event = this.currentEvents.find(e => e.event_id === eventId);
        if (event) {
          this.showEventDetail(event);
        }
      });
    });
  },

  renderMarkers() {
    this.mapManager.clearMarkers();
    this.currentEvents.forEach(event => {
      this.mapManager.addEventMarker(event, (e) => {
        this.showEventDetail(e);
      });
    });
  },

  showEmptyState() {
    const container = document.getElementById('events-list');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Поки що немає подій</p>
        <p class="empty-sub">Спробуйте збільшити радіус пошуку</p>
      </div>
    `;
  },

  showEventDetail(event) {
    BottomSheet.open(EventCard.renderDetail(event), {
      minHeight: 100,
      maxHeight: window.innerHeight * 0.85
    });
  },

  attachEvents() {
    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.dataset.filter;
        this.loadEvents();
        TelegramAPI.hapticFeedback('light');
      });
    });

    // My location button
    document.getElementById('my-location-btn')?.addEventListener('click', () => {
      if (this.currentLocation) {
        this.mapManager.flyTo(
          this.currentLocation.latitude,
          this.currentLocation.longitude,
          14
        );
      }
    });

    // Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      App.navigateTo('settings');
    });

    // See all button
    document.getElementById('see-all-btn')?.addEventListener('click', () => {
      App.navigateTo('events-list');
    });
  },

  show() {
    this.container.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
  }
};
```

---

## 📊 Sprint 2: Definition of Done

### Backend
- [ ] Таблиця `events` створена з RLS
- [ ] Таблиця `event_locations` створена
- [ ] Таблиця `event_participants` створена
- [ ] `get_events_nearby()` працює
- [ ] `create_event()` працює
- [ ] `get_event_details()` працює
- [ ] Гео-пошук працює коректно

### Frontend
- [ ] MapBox карта відображається
- [ ] Геолокація працює
- [ ] Маркери подій показуються
- [ ] Кластеризація працює
- [ ] Фільтри категорій працюють
- [ ] Bottom Sheet з деталями
- [ ] Список подій під картою

### QA
- [ ] Тест з різними категоріями
- [ ] Тест з різними локаціями
- [ ] Edge cases (немає GPS, повільний інтернет)

---

## ⏱️ Timeline Sprint 2

| День | Backend | Frontend |
|------|---------|----------|
| Пн | Tables events, locations | MapBox setup |
| Вт | RPC functions | Markers |
| Ср | Testing, Fixes | Bottom Sheet |
| Чт | Performance optimization | Filters |
| Пт | Testing, Fixes | Integration |
| Сб | Code Review | Testing |
| Нд | Deploy | Bug Fixes |

---

## 🔗 Корисні посилання

| Ресурс | Посилання |
|--------|-----------|
| MapBox GL JS | https://docs.mapbox.com/mapbox-gl-js/ |
| MapBox Marker | https://docs.mapbox.com/mapbox-gl-js/api/markers/ |
| PostGIS Distance | https://postgis.net/docs/ST_DWithin.html |
| Geolocation API | https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API |

---

## ▶️ Наступний Sprint

**Sprint 3: Create Event & Join Flow**

- [ ] Create Event Form
- [ ] Location Picker
- [ ] Join Request Flow
- [ ] Notifications

[Дивитись Sprint 3 →](./SPRINT_3_ROADMAP.md)
