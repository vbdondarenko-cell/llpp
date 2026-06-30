// LinkUp Alpha - Sprint 1 Main Application
import type { AppState } from './types';
import { telegramAuth } from './telegram-auth';
import './styles.css';
import {
  getProfile,
  createProfile,
  updateProfile,
  getInterests,
  getUserInterests,
  setUserInterests,
} from './supabase';

// App state
const state: AppState = {
  currentView: 'splash',
  isAuthenticated: false,
  profile: null,
  interests: [],
  userInterests: [],
  isLoading: false,
};

// DOM Elements
let appElement: HTMLElement | null = null;

// Initialize app
function init(): void {
  appElement = document.getElementById('app');
  if (!appElement) {
    console.error('App container not found');
    return;
  }

  // Apply Telegram theme
  applyTheme();

  // Render splash screen
  renderSplash();
}

function applyTheme(): void {
  const colorScheme = telegramAuth.getColorScheme();
  document.documentElement.setAttribute('data-theme', colorScheme);
}

// ============ SPLASH SCREEN ============
function renderSplash(): void {
  state.currentView = 'splash';
  if (!appElement) return;

  appElement.innerHTML = `
    <div class="splash-screen">
      <div class="splash-content">
        <div class="logo-container">
          <div class="logo-glow"></div>
          <svg class="logo-icon" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="url(#logoGradient)" stroke-width="4"/>
            <circle cx="35" cy="40" r="8" fill="url(#logoGradient)"/>
            <circle cx="65" cy="40" r="8" fill="url(#logoGradient)"/>
            <path d="M35 60 Q50 75 65 60" stroke="url(#logoGradient)" stroke-width="4" stroke-linecap="round" fill="none"/>
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="50%" stop-color="#8b5cf6"/>
                <stop offset="100%" stop-color="#d946ef"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="logo-text">LinkUp</h1>
        <p class="tagline">Find Your Tribe</p>
      </div>
      <div class="splash-particles"></div>
    </div>
  `;

  // Transition to next screen
  setTimeout(async () => {
    await authenticateUser();
  }, 2500);
}

// ============ AUTHENTICATION ============
async function authenticateUser(): Promise<void> {
  state.isLoading = true;

  try {
    const userData = telegramAuth.getUserData();

    if (!userData) {
      // Demo mode - create demo user
      console.log('Running in demo mode');
      renderOnboarding();
      return;
    }

    // Create profile in Supabase
    const profileId = await createProfile(
      userData.telegramId,
      userData.username,
      userData.firstName,
      userData.lastName,
      userData.avatarUrl
    );

    if (!profileId) {
      console.error('Failed to create profile');
      renderOnboarding();
      return;
    }

    // Get existing profile
    const profile = await getProfile();
    if (profile) {
      state.profile = profile;
      state.isAuthenticated = true;

      if (profile.has_completed_onboarding) {
        renderHome();
      } else {
        await loadInterests();
        renderOnboarding();
      }
    } else {
      await loadInterests();
      renderOnboarding();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    await loadInterests();
    renderOnboarding();
  }

  state.isLoading = false;
}

// ============ ONBOARDING ============
let currentOnboardingStep = 0;
const onboardingSteps = [
  { id: 1, title: 'Ласкаво просимо!', description: 'Знаходьте події та людей біля вас', icon: '👋' },
  { id: 2, title: 'Геолокація', description: 'Дозвольте доступ до вашої позиції', icon: '📍' },
  { id: 3, title: 'Оберіть інтереси', description: 'Ми підберемо найкращі події для вас', icon: '🎯' },
  { id: 4, title: 'Спілкування', description: 'Чатуйте з учасниками подій', icon: '💬' },
  { id: 5, title: 'Почнемо!', description: 'Готові знайти свою компанію?', icon: '🚀' },
];

async function loadInterests(): Promise<void> {
  state.interests = await getInterests();
  state.userInterests = await getUserInterests();
}

function renderOnboarding(): void {
  state.currentView = 'onboarding';
  currentOnboardingStep = 0;
  if (!appElement) return;

  renderOnboardingStep();
}

function renderOnboardingStep(): void {
  if (!appElement) return;

  const step = onboardingSteps[currentOnboardingStep];
  const isLastStep = currentOnboardingStep === onboardingSteps.length - 1;
  const isInterestStep = step.id === 3;

  appElement.innerHTML = `
    <div class="onboarding-screen">
      <div class="onboarding-header">
        <div class="onboarding-progress">
          ${onboardingSteps.map((_, i) => `
            <div class="progress-dot ${i <= currentOnboardingStep ? 'active' : ''}"></div>
          `).join('')}
        </div>
        ${currentOnboardingStep > 0 ? `
          <button class="back-btn" id="onboarding-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        ` : '<div style="width: 40px;"></div>'}
      </div>

      <div class="onboarding-content">
        <div class="onboarding-icon">${step.icon}</div>
        <h1 class="onboarding-title">${step.title}</h1>
        <p class="onboarding-description">${step.description}</p>

        ${isInterestStep ? renderInterestSelection() : renderStepContent(step.id)}
      </div>

      <div class="onboarding-footer">
        ${isInterestStep ? `
          <button class="primary-btn" id="onboarding-next" disabled>
            Продовжити
          </button>
        ` : `
          <button class="primary-btn" id="onboarding-next">
            ${isLastStep ? 'Почати' : 'Далі'}
          </button>
        `}
      </div>
    </div>
  `;

  // Attach event listeners
  attachOnboardingListeners();
}

function renderStepContent(stepId: number): string {
  switch (stepId) {
    case 1:
      return `
        <div class="step-illustration">
          <div class="illustration-circle">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        </div>
      `;
    case 2:
      return `
        <div class="step-illustration">
          <div class="location-animation">
            <div class="pulse-ring"></div>
            <div class="pulse-ring delay-1"></div>
            <div class="pulse-ring delay-2"></div>
            <div class="location-pin">📍</div>
          </div>
        </div>
      `;
    case 4:
      return `
        <div class="step-illustration">
          <div class="chat-preview">
            <div class="chat-bubble received">Привіт!</div>
            <div class="chat-bubble sent">👋</div>
            <div class="chat-bubble received">Йдемо на подію?</div>
            <div class="chat-bubble sent">Так, чудово!</div>
          </div>
        </div>
      `;
    case 5:
      return `
        <div class="step-illustration">
          <div class="rocket">🚀</div>
        </div>
      `;
    default:
      return '';
  }
}

function renderInterestSelection(): string {
  return `
    <div class="interests-container">
      <p class="interests-hint">Оберіть принаймні 3 інтереси</p>
      <div class="interests-grid">
        ${state.interests.map(interest => `
          <button class="interest-chip" data-id="${interest.id}">
            <span class="interest-icon">${interest.icon || '•'}</span>
            <span class="interest-name">${interest.name}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function attachOnboardingListeners(): void {
  const nextBtn = document.getElementById('onboarding-next');
  const backBtn = document.getElementById('onboarding-back');

  nextBtn?.addEventListener('click', async () => {
    telegramAuth.hapticFeedback('light');

    if (currentOnboardingStep === 2) {
      // Interest selection step - save interests
      const selectedInterests = state.userInterests.map(i => i.id);
      if (selectedInterests.length >= 3) {
        await setUserInterests(selectedInterests);
      }
    }

    if (currentOnboardingStep === onboardingSteps.length - 1) {
      // Complete onboarding
      await completeOnboarding();
    } else {
      currentOnboardingStep++;
      renderOnboardingStep();
    }
  });

  backBtn?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    if (currentOnboardingStep > 0) {
      currentOnboardingStep--;
      renderOnboardingStep();
    }
  });

  // Interest chips
  const chips = document.querySelectorAll('.interest-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      telegramAuth.hapticFeedback('light');
      const id = (chip as HTMLElement).dataset.id;
      if (!id) return;

      const interest = state.interests.find(i => i.id === id);
      if (!interest) return;

      const existingIndex = state.userInterests.findIndex(i => i.id === id);
      if (existingIndex >= 0) {
        state.userInterests.splice(existingIndex, 1);
        chip.classList.remove('selected');
      } else {
        state.userInterests.push(interest);
        chip.classList.add('selected');
      }

      // Update button state
      const nextBtn = document.getElementById('onboarding-next') as HTMLButtonElement;
      if (nextBtn) {
        nextBtn.disabled = state.userInterests.length < 3;
      }
    });
  });
}

async function completeOnboarding(): Promise<void> {
  state.isLoading = true;

  // Update profile
  await updateProfile(undefined, undefined, undefined, undefined, undefined, undefined, true);

  // Save selected interests
  const selectedIds = state.userInterests.map(i => i.id);
  await setUserInterests(selectedIds);

  state.isLoading = false;
  telegramAuth.hapticNotification('success');
  renderHome();
}

// ============ HOME SCREEN ============
function renderHome(): void {
  state.currentView = 'home';
  if (!appElement) return;

  const safeArea = telegramAuth.getSafeArea();

  appElement.innerHTML = `
    <div class="main-app" style="padding-top: ${safeArea.top}px;">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-left">
          <span class="time">${new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="status-right">
          <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C7.46 3 3.34 4.78.29 7.67c-.18.18-.29.43-.29.71 0 .28.11.53.29.71l2.48 2.48c.18.18.43.29.71.29.27 0 .52-.11.7-.28.79-.74 1.69-1.36 2.66-1.85.33-.16.56-.5.56-.9v-3.1c1.45-.48 3-.73 4.6-.73s3.15.25 4.6.73v3.1c0 .4.23.74.56.9.98.49 1.87 1.12 2.67 1.85.18.18.43.28.7.28.28 0 .53-.11.71-.29l2.48-2.48c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71C20.66 4.78 16.54 3 12 3z"/>
          </svg>
          <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
          </svg>
          <div class="battery">
            <div class="battery-level"></div>
          </div>
        </div>
      </div>

      <!-- Header -->
      <header class="app-header">
        <div class="header-left">
          <button class="location-btn" id="location-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span class="location-name">Київ</span>
            <svg class="chevron" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
          </button>
        </div>
        <h1 class="header-title">LinkUp</h1>
        <div class="header-right">
          <button class="icon-btn" id="search-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
          <button class="icon-btn" id="settings-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Content Area -->
      <main class="content-area">
        <div class="home-placeholder">
          <div class="placeholder-icon">🗺️</div>
          <h2>Карта</h2>
          <p>Події та люди поблизу з'являться тут</p>
        </div>
      </main>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav" style="padding-bottom: ${safeArea.bottom}px;">
        <button class="nav-item active">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
          </div>
          <span>Карта</span>
        </button>
        <button class="nav-item">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
            </svg>
          </div>
          <span>Події</span>
        </button>
        <button class="nav-item create-icon">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
          <span>Створити</span>
        </button>
        <button class="nav-item">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <span>Чати</span>
        </button>
        <button class="nav-item">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span>Профіль</span>
        </button>
      </nav>
    </div>
  `;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

export { state, init };
