// Admin Panel Component
import {
  checkAdminAccess,
  getAdminStats,
  getAdminUsers,
  getAdminEvents,
  getReports,
  getAdminChats,
  getAuditLog,
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  hideEvent,
  unhideEvent,
  deleteEvent,
  resolveReport,
  rejectReport,
  formatNumber,
  formatDate,
  getInitials,
} from './admin-api';
import type { AdminStats, AdminUser, AdminEvent, UserReport, EventReport, AdminChat, AuditLogEntry } from './types';

export interface AdminCallbacks {
  onBack?: () => void;
}

type TabType = 'stats' | 'users' | 'events' | 'reports' | 'chats' | 'premium' | 'audit';

interface AdminState {
  isAdmin: boolean;
  isLoading: boolean;
  activeTab: TabType;
  stats: AdminStats | null;
  users: AdminUser[];
  events: AdminEvent[];
  reports: (UserReport | EventReport)[];
  chats: AdminChat[];
  auditLogs: AuditLogEntry[];
  searchQuery: string;
  statusFilter: string;
}

let state: AdminState = {
  isAdmin: false,
  isLoading: true,
  activeTab: 'stats',
  stats: null,
  users: [],
  events: [],
  reports: [],
  chats: [],
  auditLogs: [],
  searchQuery: '',
  statusFilter: 'pending',
};

let callbacks: AdminCallbacks = {};
let container: HTMLElement | null = null;

export async function renderAdminPanel(
  c: HTMLElement,
  cb?: AdminCallbacks
): Promise<void> {
  container = c;
  callbacks = cb || {};
  
  injectAdminStyles();
  
  // Check admin access
  state.isAdmin = await checkAdminAccess();
  state.isLoading = false;
  
  if (!state.isAdmin) {
    renderAccessDenied();
    return;
  }
  
  // Load initial data
  await loadData();
  
  renderAdminUI();
}

async function loadData(): Promise<void> {
  if (state.activeTab === 'stats') {
    const result = await getAdminStats();
    if (result.success) {
      state.stats = result.stats;
    }
  } else if (state.activeTab === 'users') {
    const result = await getAdminUsers(state.searchQuery || undefined, state.statusFilter as any);
    if (result.success) {
      state.users = result.users;
    }
  } else if (state.activeTab === 'events') {
    const result = await getAdminEvents(state.searchQuery || undefined, state.statusFilter as any);
    if (result.success) {
      state.events = result.events;
    }
  } else if (state.activeTab === 'reports') {
    const result = await getReports('user', state.statusFilter as any);
    if (result.success) {
      state.reports = result.reports;
    }
  } else if (state.activeTab === 'chats') {
    const result = await getAdminChats(state.searchQuery || undefined);
    if (result.success) {
      state.chats = result.chats;
    }
  } else if (state.activeTab === 'audit') {
    const result = await getAuditLog();
    if (result.success) {
      state.auditLogs = result.logs;
    }
  }
}

function renderAccessDenied(): void {
  if (!container) return;
  
  container.innerHTML = `
    <div class="admin-panel">
      <div class="admin-access-denied">
        <div class="access-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
        </div>
        <h2>Доступ заборонено</h2>
        <p>Ця сторінка доступна тільки для адміністраторів</p>
        <button class="admin-back-btn" onclick="window.history.back()">
          Повернутися назад
        </button>
      </div>
    </div>
  `;
}

function renderAdminUI(): void {
  if (!container) return;
  
  container.innerHTML = `
    <div class="admin-panel">
      <!-- Header -->
      <header class="admin-header">
        <div class="admin-header-left">
          <button class="admin-icon-btn" id="admin-back-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        </div>
        <h1 class="admin-title">Адмін-панель</h1>
        <div class="admin-header-right"></div>
      </header>

      <!-- Tabs -->
      <nav class="admin-tabs">
        <button class="admin-tab ${state.activeTab === 'stats' ? 'active' : ''}" data-tab="stats">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
          Статистика
        </button>
        <button class="admin-tab ${state.activeTab === 'users' ? 'active' : ''}" data-tab="users">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          Користувачі
          ${state.stats?.pending_reports ? `<span class="tab-badge">${state.stats.pending_reports}</span>` : ''}
        </button>
        <button class="admin-tab ${state.activeTab === 'events' ? 'active' : ''}" data-tab="events">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
          </svg>
          Події
        </button>
        <button class="admin-tab ${state.activeTab === 'reports' ? 'active' : ''}" data-tab="reports">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          Скарги
        </button>
        <button class="admin-tab ${state.activeTab === 'chats' ? 'active' : ''}" data-tab="chats">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          Чати
        </button>
        <button class="admin-tab ${state.activeTab === 'audit' ? 'active' : ''}" data-tab="audit">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          Лог
        </button>
      </nav>

      <!-- Content -->
      <div class="admin-content" id="admin-content">
        ${renderTabContent()}
      </div>
    </div>
  `;
  
  attachListeners();
}

function renderTabContent(): string {
  switch (state.activeTab) {
    case 'stats':
      return renderStats();
    case 'users':
      return renderUsers();
    case 'events':
      return renderEvents();
    case 'reports':
      return renderReports();
    case 'chats':
      return renderChats();
    case 'audit':
      return renderAuditLog();
    default:
      return '';
  }
}

function renderStats(): string {
  if (!state.stats) {
    return '<div class="admin-loading">Завантаження...</div>';
  }
  
  const stats = state.stats;
  
  return `
    <div class="admin-stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">${formatNumber(stats.total_users)}</span>
          <span class="stat-label">Всього користувачів</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon events">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">${formatNumber(stats.total_events)}</span>
          <span class="stat-label">Всього подій</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon premium">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">${formatNumber(stats.total_premium)}</span>
          <span class="stat-label">Premium користувачів</span>
        </div>
      </div>
      
      <div class="stat-card warning">
        <div class="stat-icon reports">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">${formatNumber(stats.pending_reports)}</span>
          <span class="stat-label">Невирішених скарг</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon active">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">${formatNumber(stats.daily_active_users)}</span>
          <span class="stat-label">Активних за 24 год</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon messages">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">${formatNumber(stats.total_messages)}</span>
          <span class="stat-label">Всього повідомлень</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon warning">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">${formatNumber(stats.suspended_users + stats.banned_users)}</span>
          <span class="stat-label">Заблокованих</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon success">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">${formatNumber(stats.events_this_week)}</span>
          <span class="stat-label">Подій за тиждень</span>
        </div>
      </div>
    </div>
  `;
}

function renderUsers(): string {
  return `
    <div class="admin-filters">
      <input type="text" class="admin-search" placeholder="Пошук користувачів..." id="users-search" value="${state.searchQuery}">
      <select class="admin-filter" id="users-status">
        <option value="" ${state.statusFilter === '' ? 'selected' : ''}>Всі</option>
        <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>Активні</option>
        <option value="suspended" ${state.statusFilter === 'suspended' ? 'selected' : ''}>Призупинені</option>
        <option value="banned" ${state.statusFilter === 'banned' ? 'selected' : ''}>Заблоковані</option>
      </select>
    </div>
    <div class="admin-list">
      ${state.users.length === 0 ? '<div class="admin-empty">Користувачів не знайдено</div>' : ''}
      ${state.users.map(user => `
        <div class="admin-item user-item" data-user-id="${user.user_id}">
          <div class="item-avatar">
            ${user.avatar_url 
              ? `<img src="${user.avatar_url}" alt="${user.display_name}">`
              : `<div class="avatar-initials">${getInitials(user.display_name || user.username)}</div>`
            }
          </div>
          <div class="item-info">
            <div class="item-header">
              <span class="item-name">${user.display_name || user.username}</span>
              ${user.is_admin ? '<span class="badge admin">ADMIN</span>' : ''}
              ${user.is_premium ? '<span class="badge premium">PREMIUM</span>' : ''}
              ${user.is_banned ? '<span class="badge banned">ЗАБЛОКОВАНИЙ</span>' : ''}
              ${user.is_suspended ? '<span class="badge suspended">ПРИЗУПИНЕНИЙ</span>' : ''}
            </div>
            <span class="item-meta">@${user.username} • ${user.events_created} подій • ${formatDate(user.created_at)}</span>
          </div>
          <div class="item-actions">
            ${user.is_banned 
              ? `<button class="action-btn small success" data-action="unban" data-id="${user.user_id}">Розблокувати</button>`
              : user.is_suspended
              ? `<button class="action-btn small success" data-action="unsuspend" data-id="${user.user_id}">Відновити</button>
                 <button class="action-btn small danger" data-action="ban" data-id="${user.user_id}">Заблокувати</button>`
              : `<button class="action-btn small warning" data-action="suspend" data-id="${user.user_id}">Призупинити</button>
                 <button class="action-btn small danger" data-action="ban" data-id="${user.user_id}">Заблокувати</button>`
            }
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderEvents(): string {
  return `
    <div class="admin-filters">
      <input type="text" class="admin-search" placeholder="Пошук подій..." id="events-search" value="${state.searchQuery}">
      <select class="admin-filter" id="events-status">
        <option value="" ${state.statusFilter === '' ? 'selected' : ''}>Всі</option>
        <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>Активні</option>
        <option value="cancelled" ${state.statusFilter === 'cancelled' ? 'selected' : ''}>Скасовані</option>
        <option value="hidden" ${state.statusFilter === 'hidden' ? 'selected' : ''}>Приховані</option>
      </select>
    </div>
    <div class="admin-list">
      ${state.events.length === 0 ? '<div class="admin-empty">Подій не знайдено</div>' : ''}
      ${state.events.map(event => `
        <div class="admin-item event-item" data-event-id="${event.id}">
          <div class="item-info">
            <div class="item-header">
              <span class="item-name">${event.title}</span>
              ${event.is_hidden ? '<span class="badge hidden">ПРИХОВАНА</span>' : ''}
              ${event.is_cancelled ? '<span class="badge cancelled">СКАСОВАНА</span>' : ''}
            </div>
            <span class="item-meta">@${event.organizer_username} • ${event.participants_count} учасників • ${formatDate(event.starts_at)}</span>
          </div>
          <div class="item-actions">
            ${event.is_hidden 
              ? `<button class="action-btn small success" data-action="unhide" data-id="${event.id}">Показати</button>`
              : `<button class="action-btn small warning" data-action="hide" data-id="${event.id}">Приховати</button>`
            }
            ${!event.is_cancelled 
              ? `<button class="action-btn small danger" data-action="delete" data-id="${event.id}">Видалити</button>`
              : ''
            }
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderReports(): string {
  return `
    <div class="admin-filters">
      <select class="admin-filter" id="reports-status">
        <option value="pending" ${state.statusFilter === 'pending' ? 'selected' : ''}>Очікують</option>
        <option value="resolved" ${state.statusFilter === 'resolved' ? 'selected' : ''}>Вирішені</option>
        <option value="rejected" ${state.statusFilter === 'rejected' ? 'selected' : ''}>Відхилені</option>
      </select>
    </div>
    <div class="admin-list">
      ${state.reports.length === 0 ? '<div class="admin-empty">Скарг не знайдено</div>' : ''}
      ${state.reports.map(report => `
        <div class="admin-item report-item" data-report-id="${report.id}" data-type="${report.type}">
          <div class="item-info">
            <div class="item-header">
              <span class="item-name">${report.type === 'user' ? (report as UserReport).reported_name : (report as EventReport).event_title}</span>
              <span class="badge ${report.status}">${report.status === 'pending' ? 'Очікує' : report.status === 'resolved' ? 'Вирішено' : 'Відхилено'}</span>
            </div>
            <span class="item-meta">Причина: ${report.reason}</span>
            ${report.description ? `<span class="item-desc">${report.description}</span>` : ''}
            <span class="item-date">${formatDate(report.created_at)}</span>
          </div>
          ${report.status === 'pending' ? `
            <div class="item-actions">
              <button class="action-btn small success" data-action="resolve" data-id="${report.id}" data-type="${report.type}">Вирішити</button>
              <button class="action-btn small danger" data-action="reject" data-id="${report.id}" data-type="${report.type}">Відхилити</button>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderChats(): string {
  return `
    <div class="admin-filters">
      <input type="text" class="admin-search" placeholder="Пошук чатів..." id="chats-search" value="${state.searchQuery}">
    </div>
    <div class="admin-list">
      ${state.chats.length === 0 ? '<div class="admin-empty">Чатів не знайдено</div>' : ''}
      ${state.chats.map(chat => `
        <div class="admin-item chat-item" data-chat-id="${chat.id}">
          <div class="item-info">
            <div class="item-header">
              <span class="item-name">${chat.event_title || 'Приватний чат'}</span>
              <span class="badge">${chat.chat_type}</span>
            </div>
            <span class="item-meta">${formatNumber(chat.message_count)} повідомлень • ${formatDate(chat.created_at)}</span>
            ${chat.expires_at ? `<span class="item-date">Діє до: ${formatDate(chat.expires_at)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAuditLog(): string {
  return `
    <div class="admin-list">
      ${state.auditLogs.length === 0 ? '<div class="admin-empty">Записів не знайдено</div>' : ''}
      ${state.auditLogs.map(log => `
        <div class="admin-item log-item">
          <div class="item-info">
            <div class="item-header">
              <span class="item-name">${log.action}</span>
              <span class="badge">${log.admin_role}</span>
            </div>
            <span class="item-meta">@${log.admin_username} • ${log.target_type} #${log.target_id?.slice(0, 8) || 'N/A'}</span>
            <span class="item-date">${formatDate(log.created_at)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function attachListeners(): void {
  // Back button
  document.getElementById('admin-back-btn')?.addEventListener('click', () => {
    callbacks.onBack?.();
  });
  
  // Tab buttons
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const tabName = tab.getAttribute('data-tab') as TabType;
      if (tabName && tabName !== state.activeTab) {
        state.activeTab = tabName;
        state.searchQuery = '';
        state.statusFilter = 'pending';
        await loadData();
        renderAdminUI();
      }
    });
  });
  
  // Search inputs
  const usersSearch = document.getElementById('users-search') as HTMLInputElement;
  const eventsSearch = document.getElementById('events-search') as HTMLInputElement;
  const chatsSearch = document.getElementById('chats-search') as HTMLInputElement;
  
  usersSearch?.addEventListener('change', async (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    await loadData();
    updateContent();
  });
  
  eventsSearch?.addEventListener('change', async (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    await loadData();
    updateContent();
  });
  
  chatsSearch?.addEventListener('change', async (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    await loadData();
    updateContent();
  });
  
  // Status filters
  const usersStatus = document.getElementById('users-status') as HTMLSelectElement;
  const eventsStatus = document.getElementById('events-status') as HTMLSelectElement;
  const reportsStatus = document.getElementById('reports-status') as HTMLSelectElement;
  
  usersStatus?.addEventListener('change', async (e) => {
    state.statusFilter = (e.target as HTMLSelectElement).value;
    await loadData();
    updateContent();
  });
  
  eventsStatus?.addEventListener('change', async (e) => {
    state.statusFilter = (e.target as HTMLSelectElement).value;
    await loadData();
    updateContent();
  });
  
  reportsStatus?.addEventListener('change', async (e) => {
    state.statusFilter = (e.target as HTMLSelectElement).value;
    await loadData();
    updateContent();
  });
  
  // Action buttons
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', handleAction);
  });
}

async function handleAction(e: Event): Promise<void> {
  const btn = e.target as HTMLElement;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');
  const type = btn.getAttribute('data-type');
  
  if (!action || !id) return;
  
  let result: { success: boolean; error?: string } = { success: false };
  
  switch (action) {
    case 'suspend':
      result = await suspendUser(id, 'Порушення правил');
      break;
    case 'unsuspend':
      result = await unsuspendUser(id);
      break;
    case 'ban':
      result = await banUser(id, 'Систематичні порушення');
      break;
    case 'unban':
      result = await unbanUser(id);
      break;
    case 'hide':
      result = await hideEvent(id);
      break;
    case 'unhide':
      result = await unhideEvent(id);
      break;
    case 'delete':
      result = await deleteEvent(id, 'Порушення правил');
      break;
    case 'resolve':
      result = await resolveReport(id, type as 'user' | 'event', 'Вирішено адміністратором');
      break;
    case 'reject':
      result = await rejectReport(id, type as 'user' | 'event', 'Відхилено');
      break;
  }
  
  if (result.success) {
    await loadData();
    updateContent();
  } else {
    alert(result.error || 'Помилка');
  }
}

function updateContent(): void {
  const content = document.getElementById('admin-content');
  if (content) {
    content.innerHTML = renderTabContent();
    attachListeners();
  }
}

export function cleanup(): void {
  container = null;
}

// Inject styles
function injectAdminStyles(): void {
  if (document.getElementById('admin-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'admin-styles';
  style.textContent = `
    .admin-panel {
      min-height: 100%;
      background: #1a1a2e;
      color: white;
      padding-bottom: 100px;
    }

    .admin-access-denied {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }

    .access-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }

    .access-icon svg {
      width: 40px;
      height: 40px;
      color: #ef4444;
    }

    .admin-access-denied h2 {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .admin-access-denied p {
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 24px;
    }

    .admin-back-btn {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Header */
    .admin-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(20px);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .admin-icon-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .admin-icon-btn svg {
      width: 24px;
      height: 24px;
    }

    .admin-title {
      font-size: 18px;
      font-weight: 700;
    }

    /* Tabs */
    .admin-tabs {
      display: flex;
      overflow-x: auto;
      gap: 4px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      -webkit-overflow-scrolling: touch;
    }

    .admin-tabs::-webkit-scrollbar {
      display: none;
    }

    .admin-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 14px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .admin-tab svg {
      width: 18px;
      height: 18px;
    }

    .admin-tab.active {
      background: #667eea;
      color: white;
    }

    .admin-tab:hover:not(.active) {
      background: rgba(255, 255, 255, 0.1);
    }

    .tab-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: #ef4444;
      border-radius: 9px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Content */
    .admin-content {
      padding: 16px;
    }

    .admin-loading, .admin-empty {
      text-align: center;
      padding: 48px 24px;
      color: rgba(255, 255, 255, 0.5);
    }

    /* Filters */
    .admin-filters {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .admin-search {
      flex: 1;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }

    .admin-search::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .admin-filter {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      font-size: 14px;
      cursor: pointer;
    }

    /* Stats Grid */
    .admin-stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    @media (min-width: 768px) {
      .admin-stats-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon svg {
      width: 24px;
      height: 24px;
    }

    .stat-icon.users { background: rgba(102, 126, 234, 0.2); color: #667eea; }
    .stat-icon.events { background: rgba(118, 75, 162, 0.2); color: #764ba2; }
    .stat-icon.premium { background: rgba(255, 215, 0, 0.2); color: #ffd700; }
    .stat-icon.reports { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .stat-icon.active { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .stat-icon.messages { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .stat-icon.warning { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
    .stat-icon.success { background: rgba(34, 197, 94, 0.2); color: #22c55e; }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 800;
    }

    .stat-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    /* List Items */
    .admin-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .admin-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }

    .item-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }

    .item-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .item-avatar .avatar-initials {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
    }

    .item-info {
      flex: 1;
      min-width: 0;
    }

    .item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .item-name {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-meta {
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 2px;
    }

    .item-desc {
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 4px;
    }

    .item-date {
      display: block;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 4px;
    }

    .item-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .action-btn {
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.small {
      padding: 6px 10px;
      font-size: 11px;
    }

    .action-btn.success {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .action-btn.success:hover {
      background: rgba(34, 197, 94, 0.3);
    }

    .action-btn.warning {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .action-btn.warning:hover {
      background: rgba(251, 191, 36, 0.3);
    }

    .action-btn.danger {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .action-btn.danger:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    /* Badges */
    .badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }

    .badge.admin {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .badge.premium {
      background: rgba(255, 215, 0, 0.2);
      color: #ffd700;
    }

    .badge.banned, .badge.cancelled {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .badge.suspended, .badge.hidden {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .badge.pending {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .badge.resolved {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .badge.rejected {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.5);
    }
  `;
  document.head.appendChild(style);
}

export { cleanup as cleanupAdmin };