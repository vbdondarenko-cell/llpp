// LinkUp Alpha - Sprint 10 Main Application
import type { AppState, Location, MapEvent } from './types';
import { telegramAuth } from './telegram-auth';
import './styles.css';
import {
  getProfile,
  updateProfile,
  getInterests,
  getUserInterests,
  setUserInterests,
} from './supabase';
import { CATEGORIES } from './events';
// Sprint 2.1: Use new map implementation
import { LinkUpMap } from './map-sprint21';
// Sprint 2.2: Events service
import { EventsService } from './events-service';
import { BottomSheet, createEventCardList } from './components';
import { renderEventCreationScreen } from './event-creation';
import { renderEventDetails, cleanupEventDetails } from './event-details';
import { cleanup as cleanupChat } from './chat';
import { renderPremiumScreen, cleanup as cleanupPremium } from './premium';
import { renderAchievementsScreen, cleanupAchievements } from './achievements';
import { renderProfileScreen, cleanupProfile } from './profile';
import { renderSettingsScreen, cleanupSettings } from './settings';
import { renderAdminPanel, cleanupAdmin } from './admin-panel';
import {
  createInterestCard,
  injectInterestCardStyles,
} from './components/index';
import type { ChatListItem } from './types';

// App state
const state: AppState = {
  currentView: 'splash',
  isAuthenticated: false,
  profile: null,
  interests: [],
  userInterests: [],
  isLoading: false,
  mapInitialized: false,
  userLocation: null,
  selectedCategory: null,
  events: [],
  bottomSheetState: 'half',
};

// Map instance
let mapInstance: LinkUpMap | null = null;
let bottomSheetInstance: BottomSheet | null = null;
let mapContainer: HTMLElement | null = null;
let bottomSheetContainer: HTMLElement | null = null;

// Default location (Kyiv)
const DEFAULT_LOCATION: Location = { latitude: 50.4501, longitude: 30.5234 };

// DOM Elements
let appElement: HTMLElement | null = null;

// Initialize app
function init(): void {
  appElement = document.getElementById('app');
  if (!appElement) {
    console.error('App container not found');
    return;
  }

  applyTheme();
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

  setTimeout(async () => {
    await authenticateUser();
  }, 2500);
}

// ============ AUTHENTICATION ============
async function authenticateUser(): Promise<void> {
  state.isLoading = true;

  try {
    // First, try to authenticate via Edge Function if Telegram WebApp is available
    if (telegramAuth.isAvailable()) {
      const authResult = await telegramAuth.authenticate();
      
      if (authResult.success && authResult.user) {
        // Auth succeeded via Edge Function
        console.log('Authenticated via Edge Function:', authResult.user);
        
        // Now get the profile
        const profile = await getProfile();
        if (profile) {
          state.profile = profile;
          state.isAuthenticated = true;

          if (profile.has_completed_onboarding) {
            initUserLocation();
          } else {
            await loadInterests();
            renderOnboarding();
          }
        } else {
          // Profile doesn't exist, create it
          await loadInterests();
          renderOnboarding();
        }
        state.isLoading = false;
        return;
      } else if (authResult.error && authResult.error !== 'No Telegram WebApp') {
        console.log('Edge Function auth failed:', authResult.error);
        // Fall through to local authentication
      }
    }

    // Fallback: Try local authentication using Telegram user data
    const userData = telegramAuth.getUserData();

    if (!userData) {
      console.log('Running in demo mode');
      renderOnboarding();
      state.isLoading = false;
      return;
    }

    // Check if profile exists in localStorage (for demo mode)
    const storedTelegramId = localStorage.getItem('telegram_id');
    if (storedTelegramId && parseInt(storedTelegramId) === userData.telegramId) {
      // Try to get existing profile
      const profile = await getProfile();
      if (profile) {
        state.profile = profile;
        state.isAuthenticated = true;

        if (profile.has_completed_onboarding) {
          initUserLocation();
        } else {
          await loadInterests();
          renderOnboarding();
        }
        state.isLoading = false;
        return;
      }
    }

    // Store telegram_id for demo mode
    localStorage.setItem('telegram_id', userData.telegramId.toString());
    
    // Profile doesn't exist, go to onboarding
    await loadInterests();
    renderOnboarding();
  } catch (error) {
    console.error('Authentication error:', error);
    await loadInterests();
    renderOnboarding();
  }

  state.isLoading = false;
}

function initUserLocation(): void {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        renderMap();
      },
      () => {
        state.userLocation = DEFAULT_LOCATION;
        renderMap();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    state.userLocation = DEFAULT_LOCATION;
    renderMap();
  }
}

// ============ ONBOARDING ============
let currentOnboardingStep = 0;
const onboardingSteps = [
  { id: 1, title: 'Ласкаво просимо!', description: 'Знаходьте події та людей біля вас', icon: '👋' },
  { id: 2, title: 'Геолокація', description: 'Дозвольте доступ до вашої позиції', icon: '📍' },
  { id: 3, title: 'Оберіть інтереси', description: 'Оберіть інтереси, щоб бачити лише події, які вам дійсно цікаві.', icon: '🎯' },
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
  const progressPercent = ((currentOnboardingStep + 1) / onboardingSteps.length) * 100;
  const selectedCount = state.userInterests.length;

  // Inject premium styles
  injectInterestCardStyles();

  appElement.innerHTML = `
    <div class="onboarding-screen ${isInterestStep ? 'interests-step' : ''}">
      <div class="onboarding-header">
        <div class="onboarding-progress-container">
          <div class="onboarding-progress-bar">
            <div class="onboarding-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="onboarding-step-indicator">${currentOnboardingStep + 1} з ${onboardingSteps.length}</span>
        </div>
        ${currentOnboardingStep > 0 ? `
          <button class="back-btn" id="onboarding-back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        ` : '<div style="width: 44px;"></div>'}
      </div>

      <div class="onboarding-content ${isInterestStep ? 'interests-content' : ''}">
        ${isInterestStep ? renderInterestSelectionPremium() : `
          <div class="onboarding-icon">${step.icon}</div>
          <h1 class="onboarding-title">${step.title}</h1>
          <p class="onboarding-description">${step.description}</p>
          ${renderStepContent(step.id)}
        `}
      </div>

      <div class="onboarding-footer">
        ${isInterestStep ? `
          <div class="interest-premium-footer">
            <div class="interest-counter-premium">
              <span class="counter-number-premium ${selectedCount >= 3 ? 'ready' : ''}">${selectedCount}</span>
              <span class="counter-total-premium"> / 3</span>
              <span class="counter-label-premium ${selectedCount >= 3 ? 'ready' : ''}">обрано ${selectedCount >= 3 ? '✓' : ''}</span>
            </div>
            <button class="premium-btn-final" id="onboarding-next" ${selectedCount < 3 || state.isLoading ? 'disabled' : ''}>
              ${state.isLoading ? `
                <div class="btn-spinner"></div>
              ` : `
                <div class="btn-shimmer"></div>
                <div class="btn-text-container">
                  <span class="btn-helper">Оберіть щонайменше 3 інтереси</span>
                  <span class="btn-ready-text">Продовжити</span>
                </div>
              `}
            </button>
          </div>
        ` : `
          <button class="primary-btn" id="onboarding-next" ${state.isLoading ? 'disabled' : ''}>
            ${isLastStep ? 'Почати' : 'Далі'}
          </button>
        `}
      </div>
    </div>
  `;

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

function renderInterestSelectionPremium(): string {
  return `
    <div class="interests-premium-container">
      <div class="interests-header">
        <h1 class="interests-title">Оберіть інтереси</h1>
        <p class="interests-subtitle">Оберіть інтереси, щоб бачити лише події, які вам дійсно цікаві.</p>
      </div>
      <div class="interest-grid-container">
        <div class="interest-grid">
          ${state.interests.map((interest, index) => {
            const isSelected = state.userInterests.some(i => i.id === interest.id);
            return createInterestCard({
              interest,
              isSelected,
              animationDelay: index * 30,
            });
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function attachOnboardingListeners(): void {
  const nextBtn = document.getElementById('onboarding-next');
  const backBtn = document.getElementById('onboarding-back');
  
  let isProcessing = false;

  nextBtn?.addEventListener('click', async () => {
    // Prevent double click
    if (isProcessing || state.isLoading) return;
    isProcessing = true;
    
    // Disable button visually
    nextBtn.setAttribute('disabled', 'true');
    
    telegramAuth.hapticFeedback('medium');

    try {
      if (currentOnboardingStep === 2) {
        const selectedInterests = state.userInterests.map(i => i.id);
        if (selectedInterests.length >= 3) {
          await setUserInterests(selectedInterests);
        }
      }

      if (currentOnboardingStep === onboardingSteps.length - 1) {
        await completeOnboarding();
      } else {
        currentOnboardingStep++;
        renderOnboardingStep();
      }
    } finally {
      isProcessing = false;
      nextBtn.removeAttribute('disabled');
    }
  });

  backBtn?.addEventListener('click', () => {
    telegramAuth.hapticFeedback('light');
    if (currentOnboardingStep > 0) {
      currentOnboardingStep--;
      renderOnboardingStep();
    }
  });

  // Premium interest cards
  const interestCards = document.querySelectorAll('.interest-card');
  interestCards.forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id;
      if (!id) return;

      const interest = state.interests.find(i => i.id === id);
      if (!interest) return;

      const existingIndex = state.userInterests.findIndex(i => i.id === id);
      
      // Haptic feedback based on action
      if (existingIndex >= 0) {
        telegramAuth.hapticFeedback('light');
      } else {
        telegramAuth.hapticFeedback('medium');
      }

      if (existingIndex >= 0) {
        state.userInterests.splice(existingIndex, 1);
        card.classList.remove('selected');
      } else {
        state.userInterests.push(interest);
        card.classList.add('selected');
        
        // Add spring animation
        card.classList.add('spring');
        setTimeout(() => card.classList.remove('spring'), 400);
      }

      const count = state.userInterests.length;

      // Update counter with animation
      const counterNumber = document.querySelector('.counter-number-premium');
      if (counterNumber) {
        counterNumber.textContent = count.toString();
        counterNumber.classList.toggle('ready', count >= 3);
        counterNumber.classList.add('animate');
        setTimeout(() => counterNumber.classList.remove('animate'), 300);
      }

      const counterLabel = document.querySelector('.counter-label-premium');
      if (counterLabel) {
        counterLabel.classList.toggle('ready', count >= 3);
        counterLabel.textContent = `обрано ${count >= 3 ? '✓' : ''}`;
      }

      // Update button state
      const btn = document.getElementById('onboarding-next');
      if (btn) {
        const isReady = count >= 3;
        btn.toggleAttribute('disabled', !isReady);
        btn.classList.toggle('ready', isReady);
      }
    });
  });
}

async function completeOnboarding(): Promise<void> {
  state.isLoading = true;
  
  try {
    // Update profile with onboarding completed
    await updateProfile(undefined, undefined, undefined, undefined, undefined, undefined, true);
    
    // Save interests
    const selectedIds = state.userInterests.map(i => i.id);
    if (selectedIds.length >= 3) {
      await setUserInterests(selectedIds);
    }
    
    state.isLoading = false;
    telegramAuth.hapticNotification('success');
    initUserLocation();
  } catch (error) {
    console.error('Complete onboarding error:', error);
    state.isLoading = false;
    telegramAuth.showAlert('Помилка завершення реєстрації');
    // Still continue to map even if save failed
    initUserLocation();
  }
}

// ============ MAP SCREEN ============
async function renderMap(): Promise<void> {
  state.currentView = 'map';
  if (!appElement) return;

  const safeArea = telegramAuth.getSafeArea();
  const location = state.userLocation || DEFAULT_LOCATION;

  appElement.innerHTML = `
    <div class="map-app" style="padding-top: ${safeArea.top}px;">
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
      <header class="map-header">
        <div class="header-left">
          <button class="location-btn" id="location-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span class="location-name">Київ</span>
          </button>
        </div>
        <h1 class="header-title">LinkUp</h1>
        <div class="header-right">
          <button class="icon-btn" id="achievements-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
            </svg>
          </button>
          <button class="icon-btn" id="search-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Category Chips -->
      <div class="category-chips" id="category-chips">
        <button class="category-chip active" data-category="">
          <span>Всі</span>
        </button>
        ${CATEGORIES.map(cat => `
          <button class="category-chip" data-category="${cat.key}" style="--chip-color: ${cat.color}">
            <span>${cat.icon}</span>
          </button>
        `).join('')}
      </div>

      <!-- Map Container -->
      <div class="map-container" id="map-container"></div>

      <!-- Bottom Sheet -->
      <div class="bottom-sheet-container" id="bottom-sheet-container"></div>

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
        <button class="nav-item premium-icon" id="premium-nav-btn">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
            </svg>
          </div>
          <span>Premium</span>
        </button>
        <button class="nav-item" id="profile-nav-btn">
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

  // Initialize map and bottom sheet
  initMapComponents(location);
  initCategoryFilters();
  initNavListeners();
}

// ============ EVENT CREATION ============
function renderCreateEvent(): void {
  state.currentView = 'create';
  if (!appElement) return;
  
  appElement.innerHTML = '';
  
  renderEventCreationScreen(appElement, {}, {
    onSuccess: (eventId) => {
      console.log('Event created:', eventId);
      telegramAuth.showAlert('Подію створено!');
      state.currentView = 'map';
      renderMap();
    },
    onCancel: () => {
      state.currentView = 'map';
      renderMap();
    },
  });
}

function renderPremium(): void {
  state.currentView = 'premium';
  if (!appElement) return;
  
  cleanupEventDetails();
  cleanupChat();
  cleanupPremium();
  
  renderPremiumScreen(appElement, {
    onBack: () => {
      state.currentView = 'map';
      renderMap();
    },
    onPurchased: () => {
      telegramAuth.hapticNotification('success');
    },
  });
}

function renderAchievements(): void {
  if (!appElement) return;
  
  cleanupEventDetails();
  cleanupChat();
  cleanupPremium();
  cleanupProfile();
  cleanupSettings();
  cleanupAchievements();
  
  renderAchievementsScreen(appElement, {
    onBack: () => {
      state.currentView = 'map';
      renderMap();
    },
  });
}

function renderProfile(): void {
  if (!appElement) return;
  
  cleanupEventDetails();
  cleanupChat();
  cleanupPremium();
  cleanupAchievements();
  cleanupSettings();
  cleanupProfile();
  
  renderProfileScreen(appElement, undefined, {
    onBack: () => {
      state.currentView = 'map';
      renderMap();
    },
    onSettings: () => {
      renderSettings();
    },
    onAchievements: () => {
      renderAchievements();
    },
    onPremium: () => {
      renderPremium();
    },
  });
}

function renderSettings(): void {
  if (!appElement) return;
  
  const container = appElement;
  import('./profile-api').then(({ getUserProfile }) => {
    getUserProfile().then((result) => {
      if (result.success && result.profile) {
        renderSettingsScreen(container, result.profile, {
          onBack: () => {
            renderProfile();
          },
          onPremium: () => {
            renderPremium();
          },
          onLogout: () => {
            // Handle logout
            telegramAuth.showAlert('Вихід виконано');
            window.location.reload();
          },
          onAdmin: () => {
            renderAdmin();
          },
        });
      }
    });
  });
}

function renderAdmin(): void {
  if (!appElement) return;
  
  cleanupEventDetails();
  cleanupChat();
  cleanupPremium();
  cleanupAchievements();
  cleanupProfile();
  cleanupSettings();
  cleanupAdmin();
  
  renderAdminPanel(appElement, {
    onBack: () => {
      renderProfile();
    },
  });
}

function initNavListeners(): void {
  if (!appElement) return;
  
  // Map tab
  appElement.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const navItem = target.closest('.nav-item');
    if (!navItem) return;
    
    const index = Array.from(navItem.parentElement?.children || []).indexOf(navItem);
    
    if (index === 0) {
      // Map
      navItem.parentElement?.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      navItem.classList.add('active');
      renderMap();
    } else if (index === 2) {
      // Create
      renderCreateEvent();
    } else if (index === 3) {
      // Premium
      renderPremium();
    } else if (index === 4) {
      // Profile
      renderProfile();
    }
  });
}

function initMapComponents(location: Location): void {
  mapContainer = document.getElementById('map-container');
  bottomSheetContainer = document.getElementById('bottom-sheet-container');

  if (!mapContainer || !bottomSheetContainer) return;

  // Sprint 2.1: Get safe area from Telegram
  const safeArea = telegramAuth.getSafeArea();

  // Initialize map with Sprint 2.3 LinkUpMap
  const mapToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  mapInstance = new LinkUpMap({
    container: mapContainer,
    accessToken: mapToken,
    defaultCenter: [location.longitude || DEFAULT_LOCATION.longitude, location.latitude || DEFAULT_LOCATION.latitude],
    defaultZoom: 13,
    safeArea,
    onLocationChange: (newLocation) => {
      state.userLocation = newLocation;
    },
    onMapReady: () => {
      console.log('Sprint 2.3: Map ready');
    },
    onMapError: (error) => {
      console.error('Sprint 2.3: Map error:', error);
    },
    onEventClick: (event) => {
      // Sprint 2.3: Open bottom sheet preview on marker tap
      handleMarkerTap(event);
    },
  });

  // Set user location on map if available
  if (location) {
    mapInstance.setUserLocation(location);
  }

  // Initialize bottom sheet
  bottomSheetInstance = new BottomSheet(bottomSheetContainer, {
    onStateChange: (newState) => {
      state.bottomSheetState = newState;
    },
  });

  // Achievements button
  document.getElementById('achievements-btn')?.addEventListener('click', () => {
    renderAchievements();
  });

  // Sprint 2.2: Load events nearby
  loadEvents(location);
}

// Sprint 2.2: Load events using EventsService
async function loadEvents(location: Location): Promise<void> {
  state.isLoading = true;
  
  const result = await EventsService.getNearbyEvents({
    location,
    radiusKm: 50, // km - show events in wider area for demo
    category: state.selectedCategory as import('./types').EventCategory || null,
    limit: 50,
  });

  state.isLoading = false;

  if (result.success) {
    state.events = result.events;
    updateBottomSheet();
    
    // Update map markers
    if (mapInstance) {
      mapInstance.updateMarkers(state.events, location);
    }
  } else {
    console.error('Failed to load events:', result.error);
    state.events = [];
  }
}

// Sprint 2.2: Bottom sheet shows events
export function updateBottomSheet(): void {
  if (!bottomSheetInstance) return;

  const content = bottomSheetInstance.getContent();
  if (!content) return;

  // Filter events by category if selected
  const filteredEvents = state.selectedCategory
    ? state.events.filter(e => e.category === state.selectedCategory)
    : state.events;

  content.innerHTML = `
    <div class="events-list-header">
      <h2 class="events-list-title">Події поруч</h2>
      <span class="events-count">${filteredEvents.length}</span>
    </div>
  `;

  if (filteredEvents.length === 0) {
    content.innerHTML += `
      <div class="empty-events">
        <div class="empty-icon">🔍</div>
        <p>Немає подій поблизу</p>
        <span>Спробуйте обрати іншу категорію</span>
      </div>
    `;
  } else {
    // Sprint 2.2: Create event cards
    const eventsList = createEventCardList(filteredEvents, {
      onClick: (event) => handleEventClick(event),
      onJoin: (eventId) => handleJoinEvent(eventId),
    });
    content.appendChild(eventsList);
  }

  bottomSheetInstance.open('half');
}

// Sprint 2.2: Event click handling
function handleEventClick(event: MapEvent): void {
  telegramAuth.hapticFeedback('medium');
  
  if (mapInstance) {
    mapInstance.flyTo({ latitude: event.latitude, longitude: event.longitude }, 15);
    mapInstance.selectMarker(event.id);
  }

  // Navigate to event details
  const currentUserId = state.profile?.user_id || null;
  renderEventDetailsScreen(event.id, currentUserId);
}

// Sprint 2.2: Event join handling
function handleJoinEvent(_eventId: string): void {
  telegramAuth.hapticNotification('success');
  telegramAuth.showAlert('Ви приєдналися до події!');
}

// Sprint 2.3: Handle marker tap - show event preview
function handleMarkerTap(event: MapEvent): void {
  if (!bottomSheetInstance) return;

  const content = bottomSheetInstance.getContent();
  if (!content) return;

  // Show event preview in bottom sheet
  content.innerHTML = createEventPreviewHTML(event);
  
  // Add join button handler
  const joinBtn = content.querySelector('#event-preview-join');
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      handleJoinEvent(event.id);
    });
  }

  // Add close handler
  const closeBtn = content.querySelector('#event-preview-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      bottomSheetInstance?.open('collapsed');
    });
  }

  // Open to half/full position
  bottomSheetInstance.open('half');
}

// Sprint 2.3: Create event preview HTML
function createEventPreviewHTML(event: MapEvent): string {
  const categoryColors: Record<string, string> = {
    party: '#a855f7',
    sport: '#22c55e',
    food: '#f97316',
    music: '#ec4899',
    nature: '#10b981',
    games: '#06b6d4',
    education: '#eab308',
    art: '#ef4444',
    technology: '#6366f1',
    networking: '#8b5cf6',
    other: '#6b7280',
  };
  const categoryColor = categoryColors[event.category] || categoryColors.other;
  
  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('uk-UA', { 
    day: 'numeric', 
    month: 'short' 
  });
  const formattedTime = eventDate.toLocaleTimeString('uk-UA', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const distanceKm = event.distance < 1 
    ? `${Math.round(event.distance * 1000)}м` 
    : `${event.distance.toFixed(1)}км`;
  
  const imageUrl = event.photo_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400';

  return `
    <div class="event-preview">
      <div class="event-preview-header">
        <button id="event-preview-close" class="event-preview-close">×</button>
      </div>
      <div class="event-preview-image" style="background-image: url('${imageUrl}')">
        <div class="event-preview-category" style="background-color: ${categoryColor}">
          ${event.category}
        </div>
        ${event.is_premium_only ? '<div class="event-preview-premium">★ Premium</div>' : ''}
      </div>
      <div class="event-preview-content">
        <h2 class="event-preview-title">${event.title}</h2>
        <div class="event-preview-meta">
          <span class="event-preview-distance">📍 ${distanceKm}</span>
          <span class="event-preview-datetime">🗓 ${formattedDate}, ${formattedTime}</span>
        </div>
        <div class="event-preview-participants">
          <span>👥 ${event.current_participants}/${event.max_participants}</span>
          ${event.price > 0 ? `<span>💰 ${event.price} ${event.currency}</span>` : '<span class="free">Безкоштовно</span>'}
        </div>
        <div class="event-preview-organizer">
          ${event.organizer.avatar_url 
            ? `<img src="${event.organizer.avatar_url}" alt="${event.organizer.first_name || 'Organizer'}" class="organizer-avatar">`
            : '<div class="organizer-avatar-placeholder">👤</div>'
          }
          <span>${event.organizer.first_name || event.organizer.username || 'Організатор'}</span>
        </div>
        <button id="event-preview-join" class="event-preview-join" disabled>
          Приєднатися (Скоро)
        </button>
      </div>
    </div>
  `;
}

function renderEventDetailsScreen(eventId: string, currentUserId: string | null): void {
  if (!appElement) return;
  
  cleanupEventDetails();
  
  renderEventDetails(appElement, eventId, currentUserId, {
    onBack: () => {
      renderMap();
    },
    onOpenChat: (chat: ChatListItem) => {
      renderChatScreen(chat, currentUserId);
    },
  });
}

function renderChatScreen(chat: ChatListItem, currentUserId: string | null): void {
  if (!appElement || !currentUserId) return;
  
  cleanupChat();
  
  const container = appElement;
  import('./chat').then(({ renderChatScreen }) => {
    renderChatScreen(container, chat, currentUserId, {
      onBack: () => {
        renderEventDetailsScreen(chat.event_id, currentUserId);
      },
      onArchived: () => {
        renderEventDetailsScreen(chat.event_id, currentUserId);
      },
    });
  });
}

// Sprint 2.1: Event join handling will be implemented in future sprints
// function handleJoinEvent(_eventId: string): void {
//   telegramAuth.hapticNotification('success');
//   telegramAuth.showAlert('Ви приєдналися до події!');
// }

function initCategoryFilters(): void {
  const chipsContainer = document.getElementById('category-chips');
  if (!chipsContainer) return;

  const chips = chipsContainer.querySelectorAll('.category-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      telegramAuth.hapticFeedback('light');
      
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const category = (chip as HTMLElement).dataset.category || null;
      state.selectedCategory = category;

      // Sprint 2.2: Reload events with new filter
      if (state.userLocation) {
        loadEvents(state.userLocation);
      }
    });
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

export { state, init, renderMap };
