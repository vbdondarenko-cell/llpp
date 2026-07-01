// Settings Screen Component
import { telegramAuth } from './telegram-auth';
import {
  updatePrivacySettings,
  updateAppSettings,
} from './profile-api';
import type { UserProfile } from './types';

interface TelegramUser {
  showAlert: (message: string) => void;
  showPopup: (params: { title?: string; message?: string; buttons?: Array<{ id: string; type: string; text: string }> }, callback?: (buttonId: string) => void) => void;
  showConfirm: (params: { message: string; ok_text?: string; cancel_text?: string }, callback?: (confirmed: boolean) => void) => void;
}

export interface SettingsCallbacks {
  onBack?: () => void;
  onPremium?: () => void;
  onLogout?: () => void;
}

interface SettingsState {
  profile: UserProfile | null;
  isLoading: boolean;
}

let state: SettingsState = {
  profile: null,
  isLoading: false,
};

let callbacks: SettingsCallbacks = {};

export async function renderSettingsScreen(
  container: HTMLElement,
  profile: UserProfile,
  cb?: SettingsCallbacks
): Promise<void> {
  callbacks = cb || {};
  state = {
    profile,
    isLoading: false,
  };

  injectSettingsStyles();
  renderSettingsUI(container);
}

function renderSettingsUI(container: HTMLElement): void {
  const profile = state.profile;
  if (!profile) return;

  container.innerHTML = `
    <div class="settings-screen">
      <!-- Header -->
      <header class="settings-header">
        <button class="settings-back-btn" id="settings-back-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 class="settings-title">Налаштування</h1>
        <div class="settings-header-spacer"></div>
      </header>

      <!-- Content -->
      <div class="settings-content">
        <!-- Account Section -->
        <section class="settings-section">
          <h2 class="section-title">Акаунт</h2>
          <div class="settings-list">
            <button class="settings-item" id="edit-profile-btn">
              <div class="item-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
              <div class="item-content">
                <span class="item-title">Редагувати профіль</span>
                <span class="item-desc">Змінити фото, ім'я, біо</span>
              </div>
              <svg class="item-arrow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
            <button class="settings-item" id="interests-btn">
              <div class="item-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                </svg>
              </div>
              <div class="item-content">
                <span class="item-title">Інтереси</span>
                <span class="item-desc">Керувати категоріями</span>
              </div>
              <svg class="item-arrow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
          </div>
        </section>

        <!-- Premium Section -->
        <section class="settings-section">
          <h2 class="section-title">Premium</h2>
          <div class="settings-list">
            <button class="settings-item premium ${profile.statistics?.is_premium ? 'active' : ''}" id="premium-btn">
              <div class="item-icon premium-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
                </svg>
              </div>
              <div class="item-content">
                <span class="item-title">${profile.statistics?.is_premium ? 'Premium активний' : 'Активувати Premium'}</span>
                <span class="item-desc">${profile.statistics?.is_premium ? 'Без реклами та інші переваги' : 'Без реклами та інші переваги'}</span>
              </div>
              <svg class="item-arrow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
          </div>
        </section>

        <!-- Privacy Section -->
        <section class="settings-section">
          <h2 class="section-title">Приватність</h2>
          <div class="settings-list">
            <div class="settings-toggle">
              <div class="toggle-content">
                <span class="toggle-title">Показувати онлайн</span>
                <span class="toggle-desc">Інші бачитимуть ваш статус</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-online" ${profile.privacy?.show_online ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="settings-toggle">
              <div class="toggle-content">
                <span class="toggle-title">Показувати події</span>
                <span class="toggle-desc">Бачити ваші майбутні події</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-events" ${profile.privacy?.show_events ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="settings-toggle">
              <div class="toggle-content">
                <span class="toggle-title">Дозволити повідомлення</span>
                <span class="toggle-desc">Отримувати повідомлення від інших</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-messages" ${profile.privacy?.allow_messages ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- App Settings Section -->
        <section class="settings-section">
          <h2 class="section-title">Додаток</h2>
          <div class="settings-list">
            <div class="settings-toggle">
              <div class="toggle-content">
                <span class="toggle-title">Сповіщення</span>
                <span class="toggle-desc">Отримувати push-сповіщення</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-notifications" ${profile.settings?.notifications_enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="settings-select" id="language-select">
              <div class="select-content">
                <span class="select-title">Мова</span>
                <span class="select-value">${getLanguageName(profile.settings?.language)}</span>
              </div>
              <svg class="select-arrow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </div>
          </div>
        </section>

        <!-- Support Section -->
        <section class="settings-section">
          <h2 class="section-title">Підтримка</h2>
          <div class="settings-list">
            <button class="settings-item" id="help-btn">
              <div class="item-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                </svg>
              </div>
              <div class="item-content">
                <span class="item-title">Допомога</span>
                <span class="item-desc">FAQ та контакти</span>
              </div>
              <svg class="item-arrow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
            <button class="settings-item" id="about-btn">
              <div class="item-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
              <div class="item-content">
                <span class="item-title">Про додаток</span>
                <span class="item-desc">Версія 1.0.0</span>
              </div>
              <svg class="item-arrow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
          </div>
        </section>

        <!-- Logout -->
        <section class="settings-section">
          <button class="settings-item danger" id="logout-btn">
            <div class="item-icon danger-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </div>
            <div class="item-content">
              <span class="item-title danger-text">Вийти</span>
            </div>
          </button>
        </section>
      </div>
    </div>
  `;

  attachSettingsListeners();
}

function getLanguageName(code: string | undefined): string {
  switch (code) {
    case 'uk': return 'Українська';
    case 'en': return 'English';
    case 'ru': return 'Русский';
    default: return 'Українська';
  }
}

function attachSettingsListeners(): void {
  // Back button
  document.getElementById('settings-back-btn')?.addEventListener('click', () => {
    cleanup();
    callbacks.onBack?.();
  });

  // Edit profile
  document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    telegramAuth.showAlert('Редагування профілю буде доступне найближчим часом');
  });

  // Interests
  document.getElementById('interests-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    telegramAuth.showAlert('Керування інтересами буде доступне найближчим часом');
  });

  // Premium
  document.getElementById('premium-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    callbacks.onPremium?.();
  });

  // Privacy toggles
  document.getElementById('toggle-online')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLInputElement).checked;
    telegramAuth.hapticFeedback('light');
    await updatePrivacySettings({ show_online: value });
  });

  document.getElementById('toggle-events')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLInputElement).checked;
    telegramAuth.hapticFeedback('light');
    await updatePrivacySettings({ show_events: value });
  });

  document.getElementById('toggle-messages')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLInputElement).checked;
    telegramAuth.hapticFeedback('light');
    await updatePrivacySettings({ allow_messages: value });
  });

  // Notifications toggle
  document.getElementById('toggle-notifications')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLInputElement).checked;
    telegramAuth.hapticFeedback('light');
    await updateAppSettings({ notifications_enabled: value });
  });

  // Language select
  document.getElementById('language-select')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    (telegramAuth as unknown as TelegramUser).showPopup({
      title: 'Оберіть мову',
      buttons: [
        { id: 'uk', type: 'default', text: 'Українська' },
        { id: 'en', type: 'default', text: 'English' },
        { id: 'cancel', type: 'cancel', text: 'Скасувати' },
      ],
    }, async (buttonId: string) => {
      if (buttonId && buttonId !== 'cancel') {
        await updateAppSettings({ language: buttonId });
        telegramAuth.hapticFeedback('light');
      }
    });
  });

  // Help
  document.getElementById('help-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    telegramAuth.showAlert('Допомога: support@linkup.app');
  });

  // About
  document.getElementById('about-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    telegramAuth.showAlert('LinkUp Alpha v1.0.0\n\n© 2024 LinkUp');
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('heavy');
    (telegramAuth as unknown as TelegramUser).showConfirm({
      message: 'Ви впевнені, що хочете вийти?',
      ok_text: 'Вийти',
      cancel_text: 'Скасувати',
    }, (confirmed: boolean) => {
      if (confirmed) {
        callbacks.onLogout?.();
      }
    });
  });
}

export function cleanup(): void {
  // Cleanup if needed
}

export { cleanup as cleanupSettings };

// Inject styles
function injectSettingsStyles(): void {
  if (document.getElementById('settings-styles')) return;

  const style = document.createElement('style');
  style.id = 'settings-styles';
  style.textContent = `
    .settings-screen {
      min-height: 100%;
      background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%);
      color: white;
      padding-bottom: 100px;
    }

    /* Header */
    .settings-header {
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

    .settings-back-btn {
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

    .settings-back-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .settings-back-btn svg {
      width: 24px;
      height: 24px;
    }

    .settings-title {
      font-size: 18px;
      font-weight: 700;
    }

    .settings-header-spacer {
      width: 44px;
    }

    /* Content */
    .settings-content {
      padding: 24px 20px;
    }

    /* Section */
    .settings-section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-left: 16px;
    }

    .settings-list {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      overflow: hidden;
    }

    /* Settings Item */
    .settings-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 14px 16px;
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      transition: background 0.2s;
      text-align: left;
      gap: 12px;
    }

    .settings-item:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .settings-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .settings-item:active {
      background: rgba(255, 255, 255, 0.1);
    }

    .settings-item.danger:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .item-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .item-icon svg {
      width: 22px;
      height: 22px;
    }

    .item-icon.premium-icon {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%);
    }

    .item-icon.premium-icon svg {
      color: #ffd700;
    }

    .item-icon.danger-icon {
      background: rgba(239, 68, 68, 0.2);
    }

    .item-icon.danger-icon svg {
      color: #ef4444;
    }

    .item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .item-title {
      font-size: 15px;
      font-weight: 600;
    }

    .item-desc {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .item-arrow {
      width: 20px;
      height: 20px;
      color: rgba(255, 255, 255, 0.3);
    }

    .danger-text {
      color: #ef4444;
    }

    /* Toggle */
    .settings-toggle {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      gap: 12px;
    }

    .settings-toggle:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .toggle-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toggle-title {
      font-size: 15px;
      font-weight: 600;
    }

    .toggle-desc {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .toggle-switch {
      position: relative;
      width: 51px;
      height: 31px;
      flex-shrink: 0;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.2);
      transition: 0.3s;
      border-radius: 31px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 27px;
      width: 27px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    input:checked + .toggle-slider {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    /* Select */
    .settings-select {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      gap: 12px;
      cursor: pointer;
    }

    .settings-select:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .settings-select:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .select-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .select-title {
      font-size: 15px;
      font-weight: 600;
    }

    .select-value {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .select-arrow {
      width: 20px;
      height: 20px;
      color: rgba(255, 255, 255, 0.3);
    }

    /* Premium Item */
    .settings-item.premium {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 140, 0, 0.1) 100%);
    }

    .settings-item.premium.active {
      border-left: 3px solid #ffd700;
    }
  `;
  document.head.appendChild(style);
}