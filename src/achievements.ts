// Achievements Screen Component
import { telegramAuth } from './telegram-auth';
import {
  getMyAchievements,
  getAchievementNotifications,
  markNotificationShown,
  subscribeToAchievements,
  getCategoryInfo,
  calculateTotalProgress,
} from './achievements-api';
import type { UserAchievement, AchievementNotification } from './types';

export interface AchievementsCallbacks {
  onBack?: () => void;
}

interface AchievementsState {
  achievements: UserAchievement[];
  isLoading: boolean;
  totalCount: number;
  unlockedCount: number;
}

let state: AchievementsState = {
  achievements: [],
  isLoading: false,
  totalCount: 0,
  unlockedCount: 0,
};

let callbacks: AchievementsCallbacks = {};
let unsubscribe: (() => void) | null = null;
let pendingNotifications: AchievementNotification[] = [];

export async function renderAchievementsScreen(
  container: HTMLElement,
  cb?: AchievementsCallbacks
): Promise<void> {
  callbacks = cb || {};
  state = {
    achievements: [],
    isLoading: true,
    totalCount: 0,
    unlockedCount: 0,
  };

  renderLoadingState(container);
  injectAchievementStyles();

  // Fetch achievements
  const result = await getMyAchievements();
  state.achievements = result.achievements;
  state.totalCount = result.total_count;
  state.unlockedCount = result.unlocked_count;
  state.isLoading = false;

  // Check for pending notifications
  const notifications = await getAchievementNotifications();
  pendingNotifications = notifications.notifications;

  // Subscribe to realtime updates
  unsubscribe = subscribeToAchievements(handleAchievementUnlocked);

  renderAchievementsUI(container);

  // Show pending unlock notifications
  if (pendingNotifications.length > 0) {
    setTimeout(() => {
      showUnlockNotification(pendingNotifications[0]);
    }, 500);
  }
}

function renderLoadingState(container: HTMLElement): void {
  container.innerHTML = `
    <div class="achievements-screen">
      <div class="achievements-loading">
        <div class="achievement-spinner"></div>
      </div>
    </div>
  `;
}

function renderAchievementsUI(container: HTMLElement): void {
  const { percentage, unlocked, total } = calculateTotalProgress(state.achievements);

  // Group by category
  const categories = ['events', 'social', 'premium', 'exploration'] as const;
  const groupedAchievements = categories.map(cat => ({
    category: cat,
    ...getCategoryInfo(cat),
    achievements: state.achievements.filter(a => a.category === cat),
  }));

  container.innerHTML = `
    <div class="achievements-screen">
      <!-- Header -->
      <header class="achievements-header">
        <button class="achievements-back-btn" id="achievements-back-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 class="achievements-title">Досягнення</h1>
        <div class="achievements-header-spacer"></div>
      </header>

      <!-- Content -->
      <div class="achievements-content">
        <!-- Progress Overview -->
        <div class="progress-overview">
          <div class="progress-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" class="progress-bg"/>
              <circle 
                cx="50" cy="50" r="45" 
                class="progress-fill"
                style="stroke-dashoffset: ${283 - (283 * percentage) / 100}"
              />
            </svg>
            <div class="progress-text">
              <span class="progress-percent">${percentage}%</span>
            </div>
          </div>
          <div class="progress-info">
            <span class="progress-label">Прогрес</span>
            <span class="progress-count">${unlocked} / ${total}</span>
          </div>
        </div>

        <!-- Categories -->
        ${groupedAchievements.map(group => renderCategorySection(group)).join('')}
      </div>
    </div>
  `;

  attachAchievementListeners();
}

function renderCategorySection(group: {
  category: string;
  label: string;
  color: string;
  achievements: UserAchievement[];
}): string {
  if (group.achievements.length === 0) return '';
  
  return `
    <section class="category-section">
      <h2 class="category-title" style="--category-color: ${group.color}">
        ${group.label}
      </h2>
      <div class="achievements-grid">
        ${group.achievements.map(a => renderAchievementCard(a)).join('')}
      </div>
    </section>
  `;
}

function renderAchievementCard(achievement: UserAchievement): string {
  const { color } = getCategoryInfo(achievement.category);
  const isUnlocked = achievement.is_unlocked;
  
  return `
    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" 
         data-achievement-id="${achievement.id}"
         style="--accent-color: ${color}">
      <div class="achievement-icon-wrapper">
        <span class="achievement-icon">${achievement.icon}</span>
        ${isUnlocked ? '<div class="unlock-badge"></div>' : ''}
      </div>
      <div class="achievement-info">
        <h3 class="achievement-name">${achievement.name}</h3>
        <p class="achievement-desc">${achievement.description}</p>
        ${!isUnlocked ? `
          <div class="progress-bar">
            <div class="progress-fill-bar" style="width: ${achievement.progress_percentage}%"></div>
          </div>
          <span class="progress-text-small">${achievement.progress} / ${achievement.requirement_value}</span>
        ` : `
          <span class="unlock-date">Отримано</span>
        `}
      </div>
    </div>
  `;
}

function attachAchievementListeners(): void {
  // Back button
  document.getElementById('achievements-back-btn')?.addEventListener('click', () => {
    cleanup();
    callbacks.onBack?.();
  });

  // Achievement cards (for details)
  document.querySelectorAll('.achievement-card').forEach(card => {
    card.addEventListener('click', () => {
      const achievementId = (card as HTMLElement).dataset.achievementId;
      const achievement = state.achievements.find(a => a.id === achievementId);
      if (achievement) {
        showAchievementDetails(achievement);
      }
    });
  });
}

function showAchievementDetails(achievement: UserAchievement): void {
  const { color } = getCategoryInfo(achievement.category);
  
  telegramAuth.hapticFeedback('light');
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'achievement-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content" style="--accent-color: ${color}">
      <button class="modal-close" id="modal-close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      <div class="modal-icon">${achievement.icon}</div>
      <h2 class="modal-title">${achievement.name}</h2>
      <p class="modal-desc">${achievement.description}</p>
      ${achievement.is_unlocked ? `
        <div class="modal-unlocked">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span>Розблоковано!</span>
        </div>
      ` : `
        <div class="modal-progress">
          <div class="progress-bar large">
            <div class="progress-fill-bar" style="width: ${achievement.progress_percentage}%"></div>
          </div>
          <span class="progress-label">${achievement.progress} / ${achievement.requirement_value}</span>
        </div>
      `}
      <div class="modal-reward">
        <span class="reward-label">Нагорода</span>
        <span class="reward-points">+${achievement.reward_points} балів</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Trigger animation
  requestAnimationFrame(() => {
    modal.classList.add('visible');
  });
  
  // Close handlers
  modal.querySelector('.modal-backdrop')?.addEventListener('click', () => closeModal(modal));
  modal.querySelector('#modal-close')?.addEventListener('click', () => closeModal(modal));
}

function closeModal(modal: HTMLElement): void {
  modal.classList.remove('visible');
  setTimeout(() => modal.remove(), 300);
  telegramAuth.hapticFeedback('light');
}

async function handleAchievementUnlocked(achievement: AchievementNotification): Promise<void> {
  // Add to pending
  if (!pendingNotifications.find(n => n.id === achievement.id)) {
    pendingNotifications.push(achievement);
  }
  
  // Show notification
  showUnlockNotification(achievement);
}

function showUnlockNotification(achievement: AchievementNotification): void {
  // Remove from pending
  pendingNotifications = pendingNotifications.filter(n => n.id !== achievement.id);
  
  // Mark as shown
  markNotificationShown(achievement.id);
  
  // Haptic feedback
  telegramAuth.hapticNotification('success');
  
  // Create notification toast
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="toast-icon">${achievement.icon}</div>
    <div class="toast-content">
      <span class="toast-label">Досягнення!</span>
      <span class="toast-name">${achievement.name}</span>
    </div>
    <div class="toast-reward">+${achievement.reward_points}</div>
  `;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('visible');
    showConfetti();
  });
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showConfetti(): void {
  const colors = ['#ffd700', '#667eea', '#f093fb', '#4facfe', '#4ade80'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.setProperty('--x', `${Math.random() * 100}vw`);
    confetti.style.setProperty('--delay', `${Math.random() * 0.5}s`);
    confetti.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
    confetti.style.setProperty('--rotation', `${Math.random() * 360}deg`);
    container.appendChild(confetti);
  }
  
  // Remove after animation
  setTimeout(() => {
    container.remove();
  }, 3000);
}

export function cleanup(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// Inject styles
function injectAchievementStyles(): void {
  if (document.getElementById('achievements-styles')) return;

  const style = document.createElement('style');
  style.id = 'achievements-styles';
  style.textContent = `
    .achievements-screen {
      min-height: 100%;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding-bottom: 100px;
    }

    .achievements-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .achievement-spinner {
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
    .achievements-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
    }

    .achievements-back-btn {
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

    .achievements-back-btn svg {
      width: 24px;
      height: 24px;
    }

    .achievements-title {
      font-size: 20px;
      font-weight: 700;
    }

    .achievements-header-spacer {
      width: 44px;
    }

    /* Content */
    .achievements-content {
      padding: 24px 20px;
    }

    /* Progress Overview */
    .progress-overview {
      display: flex;
      align-items: center;
      gap: 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 32px;
    }

    .progress-circle {
      position: relative;
      width: 100px;
      height: 100px;
      flex-shrink: 0;
    }

    .progress-circle svg {
      transform: rotate(-90deg);
    }

    .progress-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 8;
    }

    .progress-fill {
      fill: none;
      stroke: url(#progressGradient);
      stroke-width: 8;
      stroke-linecap: round;
      stroke-dasharray: 283;
      transition: stroke-dashoffset 1s ease;
    }

    .progress-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .progress-percent {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .progress-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .progress-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
    }

    .progress-count {
      font-size: 20px;
      font-weight: 700;
    }

    /* Category Section */
    .category-section {
      margin-bottom: 32px;
    }

    .category-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--category-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background: var(--category-color);
      border-radius: 2px;
    }

    .achievements-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Achievement Card */
    .achievement-card {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .achievement-card:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.08);
    }

    .achievement-card.locked {
      opacity: 0.7;
    }

    .achievement-card.unlocked {
      border-color: var(--accent-color);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    }

    .achievement-icon-wrapper {
      position: relative;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .achievement-icon {
      font-size: 28px;
    }

    .unlock-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      border-radius: 50%;
      border: 2px solid #16213e;
    }

    .achievement-info {
      flex: 1;
      min-width: 0;
    }

    .achievement-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .achievement-desc {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 8px;
    }

    .progress-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .progress-fill-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-color) 0%, var(--accent-color) 100%);
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .progress-text-small {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }

    .unlock-date {
      font-size: 12px;
      color: #4ade80;
    }

    /* Modal */
    .achievement-modal {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .achievement-modal.visible {
      opacity: 1;
    }

    .modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
    }

    .modal-content {
      position: relative;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid var(--accent-color);
      border-radius: 24px;
      padding: 32px 24px;
      width: calc(100% - 48px);
      max-width: 340px;
      text-align: center;
      transform: scale(0.9);
      transition: transform 0.3s ease;
    }

    .achievement-modal.visible .modal-content {
      transform: scale(1);
    }

    .modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-close svg {
      width: 18px;
      height: 18px;
    }

    .modal-icon {
      font-size: 64px;
      margin-bottom: 16px;
      animation: iconBounce 0.6s ease;
    }

    @keyframes iconBounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    .modal-title {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .modal-desc {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 20px;
    }

    .modal-unlocked {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #4ade80;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .modal-unlocked svg {
      width: 20px;
      height: 20px;
    }

    .modal-progress {
      margin-bottom: 20px;
    }

    .progress-bar.large {
      height: 12px;
      margin-bottom: 8px;
    }

    .modal-reward {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .reward-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
    }

    .reward-points {
      font-size: 18px;
      font-weight: 700;
      color: #ffd700;
    }

    /* Toast Notification */
    .achievement-toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 2000;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .achievement-toast.visible {
      transform: translateX(-50%) translateY(0);
    }

    .toast-icon {
      font-size: 32px;
    }

    .toast-content {
      display: flex;
      flex-direction: column;
    }

    .toast-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
    }

    .toast-name {
      font-size: 14px;
      font-weight: 700;
    }

    .toast-reward {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #ffd700;
    }

    /* Confetti */
    .confetti-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1500;
      overflow: hidden;
    }

    .confetti {
      position: absolute;
      top: -20px;
      left: var(--x);
      width: 10px;
      height: 10px;
      background: var(--color);
      border-radius: 2px;
      animation: confettiFall 3s linear forwards;
      animation-delay: var(--delay);
      transform: rotate(var(--rotation));
    }

    @keyframes confettiFall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }

    /* SVG Gradient Definition */
    .achievements-screen::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
    }
  `;
  document.head.appendChild(style);
}

export { cleanup as cleanupAchievements };