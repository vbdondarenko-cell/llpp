// Profile Screen Component
import { telegramAuth } from './telegram-auth';
import {
  getUserProfile,
  getInitials,
  formatNumber,
  formatMemberSince,
  subscribeToProfile,
} from './profile-api';
import type { UserProfile } from './types';

export interface ProfileCallbacks {
  onBack?: () => void;
  onEditProfile?: () => void;
  onSettings?: () => void;
  onAchievements?: () => void;
  onPremium?: () => void;
  onFriends?: () => void;
}

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
}

let state: ProfileState = {
  profile: null,
  isLoading: false,
};

let callbacks: ProfileCallbacks = {};
let unsubscribe: (() => void) | null = null;

export async function renderProfileScreen(
  container: HTMLElement,
  userId?: string,
  cb?: ProfileCallbacks
): Promise<void> {
  callbacks = cb || {};
  state = {
    profile: null,
    isLoading: true,
  };

  renderLoadingState(container);
  injectProfileStyles();

  // Fetch profile
  const result = await getUserProfile(userId);
  state.profile = result.profile;
  state.isLoading = false;

  // Subscribe to updates
  unsubscribe = subscribeToProfile((profile) => {
    state.profile = profile;
    updateUI();
  });

  renderProfileUI(container);
}

function renderLoadingState(container: HTMLElement): void {
  container.innerHTML = `
    <div class="profile-screen">
      <div class="profile-loading">
        <div class="profile-spinner"></div>
      </div>
    </div>
  `;
}

function renderProfileUI(container: HTMLElement): void {
  const profile = state.profile;
  if (!profile) return;

  const isOwn = profile.is_own_profile;
  const stats = profile.statistics;

  container.innerHTML = `
    <div class="profile-screen">
      <!-- Header -->
      <header class="profile-header">
        ${isOwn ? `
          <button class="profile-icon-btn" id="settings-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        ` : `
          <button class="profile-icon-btn" id="back-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        `}
        <h1 class="profile-title">${isOwn ? 'Мій профіль' : profile.display_name || profile.username}</h1>
        ${isOwn ? `
          <button class="profile-icon-btn" id="edit-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        ` : '<div></div>'}
      </header>

      <!-- Profile Content -->
      <div class="profile-content">
        <!-- Avatar Section -->
        <div class="profile-avatar-section">
          <div class="avatar-wrapper ${stats.is_premium ? 'premium' : ''}">
            ${profile.avatar_url 
              ? `<img src="${profile.avatar_url}" alt="${profile.display_name}" class="avatar-image" />`
              : `<div class="avatar-initials">${getInitials(profile.display_name || profile.username)}</div>`
            }
            ${stats.is_premium ? `
              <div class="premium-badge-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
                </svg>
              </div>
            ` : ''}
          </div>
          ${stats.is_premium ? `
            <div class="premium-banner">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
              </svg>
              <span>Premium</span>
            </div>
          ` : ''}
        </div>

        <!-- User Info -->
        <div class="profile-user-info">
          <h2 class="profile-name">
            ${profile.display_name || profile.username}
            ${stats.is_premium ? '<span class="premium-star">⭐</span>' : ''}
          </h2>
          <span class="profile-username">@${profile.username}</span>
          ${profile.location ? `<span class="profile-location">📍 ${profile.location}</span>` : ''}
        </div>

        ${profile.bio ? `
          <div class="profile-bio">
            <p>${profile.bio}</p>
          </div>
        ` : ''}

        <!-- Rating -->
        ${stats.rating_count > 0 ? `
          <div class="profile-rating">
            <div class="rating-stars">
              ${renderStars(stats.average_rating)}
            </div>
            <span class="rating-value">${stats.average_rating.toFixed(1)}</span>
            <span class="rating-count">(${formatNumber(stats.rating_count)})</span>
          </div>
        ` : ''}

        <!-- Stats Grid -->
        <div class="profile-stats-grid">
          <div class="stat-card">
            <span class="stat-value">${formatNumber(stats.events_created)}</span>
            <span class="stat-label">Створив</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${formatNumber(stats.events_joined)}</span>
            <span class="stat-label">Приєднався</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${formatNumber(stats.achievements_count)}</span>
            <span class="stat-label">Досягнень</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${formatNumber(stats.friends_added)}</span>
            <span class="stat-label">Друзів</span>
          </div>
        </div>

        <!-- Action Buttons -->
        ${isOwn ? `
          <div class="profile-actions">
            <button class="action-btn primary" id="achievements-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/>
              </svg>
              Досягнення
            </button>
            <button class="action-btn secondary" id="premium-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
              </svg>
              Premium
            </button>
          </div>
        ` : `
          <div class="profile-actions">
            <button class="action-btn primary" id="message-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
              Написати
            </button>
            <button class="action-btn secondary" id="friends-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              В друзі
            </button>
          </div>
        `}

        <!-- Interests -->
        ${profile.interests && profile.interests.length > 0 ? `
          <div class="profile-interests">
            <h3 class="section-label">Інтереси</h3>
            <div class="interests-list">
              ${profile.interests.map(i => `<span class="interest-tag">${i}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Member Since -->
        <div class="profile-member-since">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          <span>Приєднався ${formatMemberSince(profile.created_at)}</span>
        </div>
      </div>
    </div>
  `;

  attachProfileListeners();
}

function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let html = '';
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      html += '<svg class="star filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
    } else if (i === fullStars && hasHalf) {
      html += '<svg class="star half" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
    } else {
      html += '<svg class="star empty" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>';
    }
  }
  
  return html;
}

function attachProfileListeners(): void {
  // Back button (for other profiles)
  document.getElementById('back-btn')?.addEventListener('click', () => {
    cleanup();
    callbacks.onBack?.();
  });

  // Settings button
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    callbacks.onSettings?.();
  });

  // Edit button
  document.getElementById('edit-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    callbacks.onEditProfile?.();
  });

  // Achievements button
  document.getElementById('achievements-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    callbacks.onAchievements?.();
  });

  // Premium button
  document.getElementById('premium-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    callbacks.onPremium?.();
  });

  // Message button
  document.getElementById('message-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    telegramAuth.showAlert('Функція буде доступна найближчим часом');
  });

  // Friends button
  document.getElementById('friends-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    callbacks.onFriends?.();
  });
}

function updateUI(): void {
  // Update profile info in real-time
  const container = document.querySelector('.profile-screen');
  if (!container) return;
  
  // Could update specific elements without full re-render
}

export function cleanup(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// Inject styles
function injectProfileStyles(): void {
  if (document.getElementById('profile-styles')) return;

  const style = document.createElement('style');
  style.id = 'profile-styles';
  style.textContent = `
    .profile-screen {
      min-height: 100%;
      background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%);
      color: white;
      padding-bottom: 100px;
    }

    .profile-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .profile-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Header */
    .profile-header {
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

    .profile-icon-btn {
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
      transition: all 0.2s;
    }

    .profile-icon-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }

    .profile-icon-btn:active {
      transform: scale(0.95);
    }

    .profile-icon-btn svg {
      width: 24px;
      height: 24px;
    }

    .profile-title {
      font-size: 18px;
      font-weight: 700;
    }

    /* Content */
    .profile-content {
      padding: 24px 20px;
    }

    /* Avatar Section */
    .profile-avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    .avatar-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: visible;
    }

    .avatar-wrapper.premium {
      animation: avatarGlow 2s ease-in-out infinite;
    }

    @keyframes avatarGlow {
      0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5)); }
      50% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)); }
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #1a1a2e;
    }

    .avatar-initials {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      font-weight: 700;
      color: white;
      border: 3px solid rgba(255, 255, 255, 0.2);
    }

    .premium-badge-avatar {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #0f0f23;
      animation: badgePulse 2s ease-in-out infinite;
    }

    @keyframes badgePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .premium-badge-avatar svg {
      width: 20px;
      height: 20px;
      color: #1a1a2e;
    }

    .premium-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 8px 16px;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 20px;
      animation: bannerFade 0.5s ease;
    }

    @keyframes bannerFade {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .premium-banner svg {
      width: 16px;
      height: 16px;
      color: #ffd700;
    }

    .premium-banner span {
      font-size: 12px;
      font-weight: 700;
      color: #ffd700;
      text-transform: uppercase;
    }

    /* User Info */
    .profile-user-info {
      text-align: center;
      margin-bottom: 16px;
    }

    .profile-name {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .premium-star {
      font-size: 20px;
      animation: starTwinkle 1s ease-in-out infinite;
    }

    @keyframes starTwinkle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .profile-username {
      display: block;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 4px;
    }

    .profile-location {
      display: block;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
    }

    /* Bio */
    .profile-bio {
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      margin-bottom: 16px;
    }

    .profile-bio p {
      font-size: 14px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.9);
      margin: 0;
    }

    /* Rating */
    .profile-rating {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .rating-stars {
      display: flex;
      gap: 2px;
    }

    .star {
      width: 18px;
      height: 18px;
    }

    .star.filled {
      color: #ffd700;
    }

    .star.half {
      color: #ffd700;
      opacity: 0.7;
    }

    .star.empty {
      color: rgba(255, 255, 255, 0.2);
    }

    .rating-value {
      font-size: 16px;
      font-weight: 700;
    }

    .rating-count {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
    }

    /* Stats Grid */
    .profile-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px 8px;
      text-align: center;
      transition: all 0.3s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(102, 126, 234, 0.5);
    }

    .stat-value {
      display: block;
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-label {
      display: block;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 4px;
    }

    /* Actions */
    .profile-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 20px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn svg {
      width: 20px;
      height: 20px;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .action-btn.primary:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    }

    .action-btn.secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .action-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .action-btn:active {
      transform: scale(0.98);
    }

    /* Interests */
    .profile-interests {
      margin-bottom: 24px;
    }

    .section-label {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 12px;
    }

    .interests-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .interest-tag {
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      transition: all 0.2s;
    }

    .interest-tag:hover {
      background: rgba(102, 126, 234, 0.2);
      border-color: rgba(102, 126, 234, 0.5);
    }

    /* Member Since */
    .profile-member-since {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
    }

    .profile-member-since svg {
      width: 16px;
      height: 16px;
      color: rgba(255, 255, 255, 0.4);
    }

    .profile-member-since span {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
    }
  `;
  document.head.appendChild(style);
}

export { cleanup as cleanupProfile };