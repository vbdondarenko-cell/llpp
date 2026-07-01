// Event Details Screen Component
import { telegramAuth } from './telegram-auth';
import { getEventById } from './events';
import {
  joinEvent,
  cancelRequest,
  leaveEvent,
  getMyRequestStatus,
  getEventRequests,
  acceptRequest,
  declineRequest,
  subscribeToRequests,
  subscribeToRequestStatus,
  formatRequestTime,
  getStatusText,
} from './requests';
import { createOrGetChat, getMyChats, addChatMember } from './chat-api';
import type { MapEvent, UserRequestStatus, EventRequestsResponse, EventRequest, ChatListItem } from './types';

export interface EventDetailsCallbacks {
  onBack?: () => void;
  onEventDeleted?: () => void;
  onOpenChat?: (chat: ChatListItem) => void;
}

interface EventDetailsState {
  event: MapEvent | null;
  isOrganizer: boolean;
  requestStatus: UserRequestStatus;
  requests: EventRequestsResponse | null;
  isLoading: boolean;
  chat: ChatListItem | null;
}

let state: EventDetailsState = {
  event: null,
  isOrganizer: false,
  requestStatus: { has_request: false },
  requests: null,
  isLoading: false,
  chat: null,
};

let callbacks: EventDetailsCallbacks = {};
let unsubscribeRequests: (() => void) | null = null;
let unsubscribeStatus: (() => void) | null = null;

export async function renderEventDetails(
  container: HTMLElement,
  eventId: string,
  currentUserId: string | null,
  cb?: EventDetailsCallbacks
): Promise<void> {
  callbacks = cb || {};
  state = {
    event: null,
    isOrganizer: false,
    requestStatus: { has_request: false },
    requests: null,
    isLoading: true,
    chat: null,
  };

  container.innerHTML = `
    <div class="event-details-screen">
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  // Fetch event data
  const event = await getEventById(eventId);
  if (!event) {
    container.innerHTML = `
      <div class="event-details-screen">
        <div class="error-state">
          <span>Подію не знайдено</span>
        </div>
      </div>
    `;
    return;
  }

  state.event = event;
  
  // Fetch request status if user is logged in
  if (currentUserId) {
    state.requestStatus = await getMyRequestStatus(eventId);
    state.isOrganizer = event.organizer.id === currentUserId;

    // If organizer, fetch requests
    if (state.isOrganizer) {
      state.requests = await getEventRequests(eventId);
      // Subscribe to realtime updates
      unsubscribeRequests = subscribeToRequests(eventId, (requests) => {
        state.requests = requests;
        updateRequestsUI(container);
      });
    } else {
      // Subscribe to request status changes
      unsubscribeStatus = subscribeToRequestStatus(eventId, (status) => {
        state.requestStatus = status;
        updateRequestStatusUI(container);
      });
    }

    // Check if user has access to chat
    if (state.requestStatus.status === 'accepted') {
      const chatsResult = await getMyChats();
      if (chatsResult.success) {
        state.chat = chatsResult.chats.find(c => c.event_id === eventId) || null;
      }
    }
  }

  state.isLoading = false;
  renderEventDetailsUI(container);
  injectEventDetailsStyles();
}

function renderEventDetailsUI(container: HTMLElement): void {
  const event = state.event;
  if (!event) return;

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = eventDate.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const categoryColor = getCategoryColor(event.category);

  container.innerHTML = `
    <div class="event-details-screen">
      <!-- Header -->
      <header class="event-header">
        <button class="back-btn" id="back-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 class="header-title">Деталі</h1>
        ${state.isOrganizer ? `
          <button class="menu-btn" id="event-menu-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        ` : '<div style="width:40px"></div>'}
      </header>

      <!-- Cover Image -->
      <div class="event-cover" style="background: ${event.photo_url ? `url(${event.photo_url})` : categoryColor}">
        <div class="category-badge" style="background: ${categoryColor}">
          <span class="cat-icon">${getCategoryIcon(event.category)}</span>
          <span>${getCategoryLabel(event.category)}</span>
        </div>
      </div>

      <!-- Content -->
      <div class="event-content">
        <!-- Title & Organizer -->
        <div class="event-main">
          <h2 class="event-title">${escapeHtml(event.title)}</h2>
          <div class="organizer-info">
            <div class="avatar-small">
              ${event.organizer.avatar_url
                ? `<img src="${event.organizer.avatar_url}" alt="">`
                : `<span>${(event.organizer.first_name || event.organizer.username || 'U')[0]}</span>`
              }
            </div>
            <div class="organizer-details">
              <span class="organizer-name">${escapeHtml(event.organizer.first_name || event.organizer.username || 'Користувач')}</span>
              <span class="organizer-label">організатор</span>
            </div>
          </div>
        </div>

        <!-- Event Info -->
        <div class="event-info-cards">
          <div class="info-card">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
            </svg>
            <div class="info-content">
              <span class="info-label">Дата</span>
              <span class="info-value">${formattedDate}</span>
            </div>
          </div>
          <div class="info-card">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <div class="info-content">
              <span class="info-label">Час</span>
              <span class="info-value">${formattedTime}</span>
            </div>
          </div>
          <div class="info-card">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div class="info-content">
              <span class="info-label">Місце</span>
              <span class="info-value">${escapeHtml(event.location_name || event.location_address || 'Не вказано')}</span>
            </div>
          </div>
          <div class="info-card">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <div class="info-content">
              <span class="info-label">Учасники</span>
              <span class="info-value">${event.current_participants} / ${event.max_participants}</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        ${event.description ? `
          <div class="event-description">
            <h3>Про подію</h3>
            <p>${escapeHtml(event.description)}</p>
          </div>
        ` : ''}

        ${!state.isOrganizer ? `
          <!-- User Action Area -->
          <div class="user-action-area" id="user-action-area">
            ${renderUserAction()}
          </div>
        ` : ''}

        ${state.isOrganizer ? `
          <!-- Organizer Panel -->
          <div class="organizer-panel" id="organizer-panel">
            <h3 class="panel-title">Заявки</h3>
            
            <!-- Pending Requests -->
            <div class="requests-section" id="pending-section">
              <div class="section-header">
                <span class="section-title">Очікують</span>
                <span class="badge" id="pending-count">${state.requests?.pending.length || 0}</span>
              </div>
              <div class="requests-list" id="pending-list">
                ${renderRequestsList(state.requests?.pending || [], 'pending')}
              </div>
            </div>

            <!-- Accepted Users -->
            <div class="requests-section" id="accepted-section">
              <div class="section-header">
                <span class="section-title">Прийняті</span>
                <span class="badge accepted" id="accepted-count">${state.requests?.accepted.length || 0}</span>
              </div>
              <div class="requests-list" id="accepted-list">
                ${renderRequestsList(state.requests?.accepted || [], 'accepted')}
              </div>
            </div>

            <!-- Declined Users -->
            <div class="requests-section collapsed" id="declined-section">
              <div class="section-header" id="declined-header">
                <span class="section-title">Відхилені</span>
                <span class="badge declined" id="declined-count">${state.requests?.declined.length || 0}</span>
                <svg class="chevron" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
              </div>
              <div class="requests-list hidden" id="declined-list">
                ${renderRequestsList(state.requests?.declined || [], 'declined')}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  attachEventDetailsListeners(container);
}

function renderUserAction(): string {
  if (state.requestStatus.has_request) {
    const status = state.requestStatus.status;
    
    if (status === 'pending') {
      return `
        <div class="request-status pending">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Заявка очікує схвалення</span>
        </div>
        <button class="action-btn secondary" id="cancel-request-btn">
          Скасувати заявку
        </button>
      `;
    }
    
    if (status === 'accepted') {
      return `
        <div class="request-status accepted">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Ви учасник!</span>
        </div>
        ${state.chat ? `
          <button class="action-btn primary" id="open-chat-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            Відкрити чат
          </button>
        ` : ''}
        <button class="action-btn danger" id="leave-event-btn">
          Покинути подію
        </button>
      `;
    }
    
    if (status === 'declined') {
      return `
        <div class="request-status declined">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
          </svg>
          <span>Заявку відхилено</span>
        </div>
      `;
    }
    
    if (status === 'cancelled') {
      return `
        <button class="action-btn primary" id="join-event-btn">
          Приєднатися
        </button>
      `;
    }
  }

  return `
    <button class="action-btn primary" id="join-event-btn">
      Приєднатися
    </button>
  `;
}

function renderRequestsList(requests: EventRequest[], type: string): string {
  if (requests.length === 0) {
    return `<div class="empty-list">Пусто</div>`;
  }

  return requests.map(req => {
    const profile = req.profile;
    const avatar = profile?.avatar_url
      ? `<img src="${profile.avatar_url}" alt="">`
      : `<span>${(profile?.first_name || profile?.username || 'U')[0]}</span>`;

    return `
      <div class="user-card" data-user-id="${req.user_id}">
        <div class="user-avatar">${avatar}</div>
        <div class="user-info">
          <span class="user-name">${escapeHtml(profile?.first_name || profile?.username || 'Користувач')}</span>
          ${profile?.rating ? `
            <span class="user-rating">⭐ ${profile.rating.toFixed(1)} (${profile.rating_count})</span>
          ` : ''}
          <span class="request-time">${formatRequestTime(req.created_at)}</span>
        </div>
        ${type === 'pending' ? `
          <div class="user-actions">
            <button class="accept-btn" data-user-id="${req.user_id}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </button>
            <button class="decline-btn" data-user-id="${req.user_id}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        ` : `
          <span class="status-badge ${type}">${getStatusText(type)}</span>
        `}
      </div>
    `;
  }).join('');
}

function attachEventDetailsListeners(container: HTMLElement): void {
  // Back button
  document.getElementById('back-btn')?.addEventListener('click', () => {
    cleanup();
    callbacks.onBack?.();
  });

  // Join event button
  document.getElementById('join-event-btn')?.addEventListener('click', async () => {
    if (!state.event) return;
    
    const btn = document.getElementById('join-event-btn');
    if (btn) {
      btn.classList.add('loading');
      btn.textContent = 'Завантаження...';
    }

    const result = await joinEvent(state.event.id);
    
    if (result.success) {
      state.requestStatus = {
        has_request: true,
        status: result.status,
        created_at: new Date().toISOString(),
      };
      telegramAuth.hapticNotification('success');
      
      if (result.requires_approval) {
        telegramAuth.showAlert('Заявку надіслано!');
      } else {
        telegramAuth.showAlert('Ви приєдналися!');
      }
      
      updateRequestStatusUI(container);
    } else {
      telegramAuth.hapticNotification('error');
      telegramAuth.showAlert(result.error || 'Помилка');
      updateRequestStatusUI(container);
    }
  });

  // Cancel request button
  document.getElementById('cancel-request-btn')?.addEventListener('click', async () => {
    if (!state.event) return;
    
    const btn = document.getElementById('cancel-request-btn');
    if (btn) {
      btn.classList.add('loading');
    }

    const result = await cancelRequest(state.event.id);
    
    if (result.success) {
      state.requestStatus = { has_request: false };
      telegramAuth.hapticNotification('success');
      telegramAuth.showAlert('Заявку скасовано');
      updateRequestStatusUI(container);
    } else {
      telegramAuth.hapticNotification('error');
      telegramAuth.showAlert(result.error || 'Помилка');
    }
  });

  // Leave event button
  document.getElementById('leave-event-btn')?.addEventListener('click', async () => {
    if (!state.event) return;
    
    const btn = document.getElementById('leave-event-btn');
    if (btn) {
      btn.classList.add('loading');
    }

    const result = await leaveEvent(state.event.id);
    
    if (result.success) {
      state.requestStatus = { has_request: false };
      state.chat = null;
      telegramAuth.hapticNotification('success');
      telegramAuth.showAlert('Ви покинули подію');
      updateRequestStatusUI(container);
    } else {
      telegramAuth.hapticNotification('error');
      telegramAuth.showAlert(result.error || 'Помилка');
    }
  });

  // Open chat button
  document.getElementById('open-chat-btn')?.addEventListener('click', () => {
    if (state.chat) {
      callbacks.onOpenChat?.(state.chat);
    }
  });

  // Accept buttons
  document.querySelectorAll('.accept-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
      if (!userId || !state.event) return;
      
      const card = (e.currentTarget as HTMLElement).closest('.user-card');
      if (card) card.classList.add('loading');

      const result = await acceptRequest(state.event.id, userId);
      
      if (result.success) {
        telegramAuth.hapticNotification('success');
        
        // Auto-create chat and add user
        const chatResult = await createOrGetChat(state.event.id, state.event.title);
        if (chatResult.success && chatResult.chat_id) {
          // Add the new user to the chat
          await addChatMember(chatResult.chat_id, userId, 'member');
          telegramAuth.showAlert('Учасника додано до чату!');
        }
        
        // Refresh requests
        state.requests = await getEventRequests(state.event.id);
        updateRequestsUI(container);
      } else {
        telegramAuth.hapticNotification('error');
        telegramAuth.showAlert(result.error || 'Помилка');
        if (card) card.classList.remove('loading');
      }
    });
  });

  // Decline buttons
  document.querySelectorAll('.decline-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
      if (!userId || !state.event) return;
      
      const card = (e.currentTarget as HTMLElement).closest('.user-card');
      if (card) card.classList.add('loading');

      const result = await declineRequest(state.event.id, userId);
      
      if (result.success) {
        telegramAuth.hapticNotification('success');
        // Refresh requests
        state.requests = await getEventRequests(state.event.id);
        updateRequestsUI(container);
      } else {
        telegramAuth.hapticNotification('error');
        telegramAuth.showAlert(result.error || 'Помилка');
        if (card) card.classList.remove('loading');
      }
    });
  });

  // Collapsible declined section
  const declinedHeader = document.getElementById('declined-header');
  const declinedList = document.getElementById('declined-list');
  const declinedSection = document.getElementById('declined-section');

  declinedHeader?.addEventListener('click', () => {
    declinedSection?.classList.toggle('collapsed');
    declinedList?.classList.toggle('hidden');
    telegramAuth.hapticFeedback('light');
  });
}

function updateRequestStatusUI(container: HTMLElement): void {
  const actionArea = document.getElementById('user-action-area');
  if (actionArea) {
    actionArea.innerHTML = renderUserAction();
    attachEventDetailsListeners(container);
  }
}

function updateRequestsUI(container: HTMLElement): void {
  // Update counts
  const pendingCount = document.getElementById('pending-count');
  const acceptedCount = document.getElementById('accepted-count');
  const declinedCount = document.getElementById('declined-count');

  if (pendingCount) pendingCount.textContent = String(state.requests?.pending.length || 0);
  if (acceptedCount) acceptedCount.textContent = String(state.requests?.accepted.length || 0);
  if (declinedCount) declinedCount.textContent = String(state.requests?.declined.length || 0);

  // Update lists
  const pendingList = document.getElementById('pending-list');
  const acceptedList = document.getElementById('accepted-list');
  const declinedList = document.getElementById('declined-list');

  if (pendingList) pendingList.innerHTML = renderRequestsList(state.requests?.pending || [], 'pending');
  if (acceptedList) acceptedList.innerHTML = renderRequestsList(state.requests?.accepted || [], 'accepted');
  if (declinedList) declinedList.innerHTML = renderRequestsList(state.requests?.declined || [], 'declined');

  // Reattach listeners for new buttons
  attachEventDetailsListeners(container);
}

function cleanup(): void {
  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }
  if (unsubscribeStatus) {
    unsubscribeStatus();
    unsubscribeStatus = null;
  }
}

// Helper functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    party: '#ef4444',
    sport: '#22c55e',
    food: '#f97316',
    music: '#8b5cf6',
    art: '#ec4899',
    nature: '#10b981',
    games: '#3b82f6',
    networking: '#6366f1',
    education: '#f59e0b',
    other: '#6b7280',
  };
  return colors[category] || colors.other;
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    party: '🎉',
    sport: '⚽',
    food: '🍕',
    music: '🎵',
    art: '🎨',
    nature: '🌿',
    games: '🎮',
    networking: '🤝',
    education: '📚',
    other: '✨',
  };
  return icons[category] || icons.other;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    party: 'Вечірка',
    sport: 'Спорт',
    food: 'Їжа',
    music: 'Музика',
    art: 'Мистецтво',
    nature: 'Природа',
    games: 'Ігри',
    networking: 'Нетворкінг',
    education: 'Навчання',
    other: 'Інше',
  };
  return labels[category] || labels.other;
}

// Inject styles
function injectEventDetailsStyles(): void {
  if (document.getElementById('event-details-styles')) return;

  const style = document.createElement('style');
  style.id = 'event-details-styles';
  style.textContent = `
    .event-details-screen {
      min-height: 100%;
      background: var(--bg-primary);
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .loading-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 50vh;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--bg-tertiary);
      border-top-color: var(--accent-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 50vh;
      color: var(--text-secondary);
    }

    .event-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .back-btn, .menu-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .back-btn svg, .menu-btn svg {
      width: 24px;
      height: 24px;
    }

    .header-title {
      font-size: 18px;
      font-weight: 600;
    }

    .event-cover {
      height: 200px;
      background-size: cover;
      background-position: center;
      position: relative;
    }

    .category-badge {
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      color: white;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .event-content {
      padding: 16px;
      padding-bottom: 100px;
    }

    .event-main {
      margin-bottom: 24px;
    }

    .event-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
      line-height: 1.3;
    }

    .organizer-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar-small {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .avatar-small img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-small span {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .organizer-details {
      display: flex;
      flex-direction: column;
    }

    .organizer-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .organizer-label {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .event-info-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .info-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      background: var(--bg-secondary);
      border-radius: 12px;
    }

    .info-card svg {
      width: 24px;
      height: 24px;
      color: var(--accent-primary);
      flex-shrink: 0;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-label {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .info-value {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .event-description {
      margin-bottom: 24px;
    }

    .event-description h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .event-description p {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-secondary);
    }

    .user-action-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .request-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
    }

    .request-status svg {
      width: 24px;
      height: 24px;
    }

    .request-status.pending {
      background: color-mix(in srgb, var(--warning) 15%, transparent);
      color: var(--warning);
    }

    .request-status.accepted {
      background: color-mix(in srgb, var(--success) 15%, transparent);
      color: var(--success);
    }

    .request-status.declined {
      background: color-mix(in srgb, var(--error) 15%, transparent);
      color: var(--error);
    }

    .action-btn {
      padding: 16px;
      border-radius: 14px;
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.primary {
      background: var(--accent-gradient);
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .action-btn.secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .action-btn.danger {
      background: color-mix(in srgb, var(--error) 15%, transparent);
      color: var(--error);
    }

    .action-btn:hover {
      transform: translateY(-2px);
    }

    .action-btn.loading {
      opacity: 0.7;
      pointer-events: none;
    }

    .organizer-panel {
      margin-top: 24px;
    }

    .panel-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .requests-section {
      margin-bottom: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      overflow: hidden;
    }

    .requests-section.collapsed .chevron {
      transform: rotate(-90deg);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px;
      cursor: pointer;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }

    .badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      background: var(--warning);
      color: white;
    }

    .badge.accepted {
      background: var(--success);
    }

    .badge.declined {
      background: var(--text-tertiary);
    }

    .chevron {
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
      transition: transform 0.2s;
    }

    .requests-list {
      padding: 0 14px 14px;
    }

    .requests-list.hidden {
      display: none;
    }

    .empty-list {
      text-align: center;
      padding: 20px;
      color: var(--text-tertiary);
      font-size: 13px;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-tertiary);
      border-radius: 10px;
      margin-bottom: 8px;
    }

    .user-card:last-child {
      margin-bottom: 0;
    }

    .user-card.loading {
      opacity: 0.5;
      pointer-events: none;
    }

    .user-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--bg-elevated);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-avatar span {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .user-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-rating {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .request-time {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .user-actions {
      display: flex;
      gap: 8px;
    }

    .accept-btn, .decline-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .accept-btn {
      background: var(--success);
      color: white;
    }

    .accept-btn:hover {
      transform: scale(1.1);
    }

    .decline-btn {
      background: var(--bg-elevated);
      color: var(--text-secondary);
    }

    .decline-btn:hover {
      background: var(--error);
      color: white;
    }

    .accept-btn svg, .decline-btn svg {
      width: 18px;
      height: 18px;
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-badge.accepted {
      background: color-mix(in srgb, var(--success) 15%, transparent);
      color: var(--success);
    }

    .status-badge.declined {
      background: color-mix(in srgb, var(--error) 15%, transparent);
      color: var(--error);
    }
  `;
  document.head.appendChild(style);
}

export { cleanup as cleanupEventDetails };
