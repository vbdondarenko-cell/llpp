// Premium Screen Component
import { telegramAuth } from './telegram-auth';
import {
  getMyPremiumStatus,
  initiateStarsPayment,
  PREMIUM_PLANS,
  formatExpirationDate,
  formatRemainingTime,
  subscribeToPremiumStatus,
} from './premium-api';
import type { PremiumStatus, PremiumPlan } from './types';

export interface PremiumCallbacks {
  onBack?: () => void;
  onPurchased?: () => void;
}

interface PremiumState {
  status: PremiumStatus | null;
  isLoading: boolean;
  purchasingPlan: string | null;
}

let state: PremiumState = {
  status: null,
  isLoading: false,
  purchasingPlan: null,
};

let callbacks: PremiumCallbacks = {};
let unsubscribe: (() => void) | null = null;

export async function renderPremiumScreen(
  container: HTMLElement,
  cb?: PremiumCallbacks
): Promise<void> {
  callbacks = cb || {};
  state = {
    status: null,
    isLoading: true,
    purchasingPlan: null,
  };

  renderLoadingState(container);
  injectPremiumStyles();

  // Fetch premium status
  state.status = await getMyPremiumStatus();
  state.isLoading = false;

  // Subscribe to changes
  unsubscribe = subscribeToPremiumStatus((status) => {
    state.status = status;
    updateStatusUI();
  });

  renderPremiumUI(container);
}

function renderLoadingState(container: HTMLElement): void {
  container.innerHTML = `
    <div class="premium-screen">
      <div class="premium-loading">
        <div class="premium-spinner"></div>
      </div>
    </div>
  `;
}

function renderPremiumUI(container: HTMLElement): void {
  const status = state.status;
  const isPremium = status?.is_premium || false;

  container.innerHTML = `
    <div class="premium-screen">
      <!-- Background Effects -->
      <div class="premium-bg-effects">
        <div class="glow glow-1"></div>
        <div class="glow glow-2"></div>
        <div class="glow glow-3"></div>
      </div>

      <!-- Header -->
      <header class="premium-header">
        <button class="premium-back-btn" id="premium-back-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 class="premium-title">Premium</h1>
        <div class="premium-header-spacer"></div>
      </header>

      <!-- Content -->
      <div class="premium-content">
        <!-- Hero Section -->
        <div class="premium-hero">
          <div class="premium-crown">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
            </svg>
          </div>
          <h2 class="hero-title">LinkUp Premium</h2>
          <p class="hero-subtitle">Розкрийте весь потенціал</p>
        </div>

        ${isPremium ? renderPremiumActiveCard() : renderUpgradeCard()}

        <!-- Plans Grid -->
        <div class="plans-section">
          <h3 class="section-title">Оберіть план</h3>
          <div class="plans-grid">
            ${PREMIUM_PLANS.map(plan => renderPlanCard(plan)).join('')}
          </div>
        </div>

        <!-- Features -->
        <div class="features-section">
          <h3 class="section-title">Переваги Premium</h3>
          <div class="features-list">
            ${renderFeatureItem('✨', 'Без реклами', 'Повністю без реклами')}
            ${renderFeatureItem('⭐', 'Преміум статус', 'Виділяйтеся серед інших')}
            ${renderFeatureItem('📊', 'Аналітика', 'Детальна статистика')}
            ${renderFeatureItem('🚀', 'Пріоритет', 'Першими у пошуку')}
            ${renderFeatureItem('💬', 'Підтримка', 'VIP підтримка 24/7')}
            ${renderFeatureItem('🎨', 'Теми', 'Ексклюзивні теми оформлення')}
          </div>
        </div>
      </div>
    </div>
  `;

  attachPremiumListeners();
}

function renderPremiumActiveCard(): string {
  const status = state.status!;
  const remaining = formatRemainingTime(status.expires_at);
  
  return `
    <div class="premium-card active">
      <div class="card-shine"></div>
      <div class="card-content">
        <div class="premium-badge">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
          </svg>
          <span>АКТИВНО</span>
        </div>
        <div class="premium-info">
          <span class="premium-label">Діє до</span>
          <span class="premium-value">${formatExpirationDate(status.expires_at)}</span>
          ${remaining ? `<span class="premium-remaining">${remaining} залишилось</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderUpgradeCard(): string {
  return `
    <div class="premium-card upgrade">
      <div class="card-shine"></div>
      <div class="card-content">
        <div class="upgrade-content">
          <span class="upgrade-text">Активуйте Premium</span>
          <span class="upgrade-subtext">та користуйтесь без обмежень</span>
        </div>
        <div class="stars-display">
          <span class="stars-icon">⭐</span>
          <span class="stars-value">Telegram Stars</span>
        </div>
      </div>
    </div>
  `;
}

function renderPlanCard(plan: PremiumPlan): string {
  const isPurchasing = state.purchasingPlan === plan.id;
  
  return `
    <div class="plan-card ${plan.popular ? 'popular' : ''}" data-plan-id="${plan.id}">
      ${plan.popular ? '<div class="popular-badge">Популярний</div>' : ''}
      <div class="plan-header">
        <h4 class="plan-name">${plan.name}</h4>
        <div class="plan-duration">${plan.duration}</div>
      </div>
      <div class="plan-price">
        <span class="price-stars">⭐</span>
        <span class="price-value">${plan.stars}</span>
      </div>
      <ul class="plan-features">
        ${plan.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      <button 
        class="plan-btn ${isPurchasing ? 'loading' : ''}" 
        data-plan-id="${plan.id}"
        ${isPurchasing ? 'disabled' : ''}
      >
        ${isPurchasing ? '<div class="btn-spinner"></div>' : 'Придбати'}
      </button>
    </div>
  `;
}

function renderFeatureItem(icon: string, title: string, desc: string): string {
  return `
    <div class="feature-item">
      <span class="feature-icon">${icon}</span>
      <div class="feature-content">
        <span class="feature-title">${title}</span>
        <span class="feature-desc">${desc}</span>
      </div>
    </div>
  `;
}

function attachPremiumListeners(): void {
  // Back button
  document.getElementById('premium-back-btn')?.addEventListener('click', () => {
    cleanup();
    callbacks.onBack?.();
  });

  // Plan buttons
  document.querySelectorAll('.plan-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const planId = (e.currentTarget as HTMLElement).dataset.planId;
      if (!planId) return;

      const plan = PREMIUM_PLANS.find(p => p.id === planId);
      if (!plan) return;

      await handlePurchase(plan);
    });
  });
}

async function handlePurchase(plan: PremiumPlan): Promise<void> {
  state.purchasingPlan = plan.id;
  updatePlanButtons();

  try {
    telegramAuth.hapticFeedback('medium');

    // Initiate payment
    const result = await initiateStarsPayment(plan);

    if (result.success && result.invoiceLink) {
      // In real implementation, this would open Telegram invoice
      // For now, simulate immediate activation
      telegramAuth.showAlert(`Открытие оплаты через Stars...`);
      
      // Simulate payment success (in production, this would come from Telegram)
      // Telegram.WebApp.openTelegramLink(result.invoiceLink);
      
      // For demo purposes, we'll use haptic feedback
      telegramAuth.hapticNotification('success');
      
      // Refresh status after simulated delay
      setTimeout(async () => {
        state.status = await getMyPremiumStatus();
        if (state.status?.is_premium) {
          telegramAuth.showAlert('Premium активовано!');
          callbacks.onPurchased?.();
          updateStatusUI();
        }
      }, 1000);
    } else {
      telegramAuth.hapticNotification('error');
      telegramAuth.showAlert(result.error || 'Помилка оплати');
    }
  } finally {
    state.purchasingPlan = null;
    updatePlanButtons();
  }
}

function updateStatusUI(): void {
  const container = document.querySelector('.premium-screen');
  if (!container) return;

  const premiumCard = container.querySelector('.premium-card');
  if (premiumCard) {
    const status = state.status;
    if (status?.is_premium) {
      premiumCard.className = 'premium-card active';
      premiumCard.innerHTML = `
        <div class="card-shine"></div>
        <div class="card-content">
          <div class="premium-badge">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
            </svg>
            <span>АКТИВНО</span>
          </div>
          <div class="premium-info">
            <span class="premium-label">Діє до</span>
            <span class="premium-value">${formatExpirationDate(status.expires_at)}</span>
          </div>
        </div>
      `;
    }
  }
}

function updatePlanButtons(): void {
  document.querySelectorAll('.plan-btn').forEach(btn => {
    const planId = (btn as HTMLElement).dataset.planId;
    const isPurchasing = state.purchasingPlan === planId;
    
    btn.classList.toggle('loading', isPurchasing);
    btn.setAttribute('disabled', String(isPurchasing));
    btn.innerHTML = isPurchasing ? '<div class="btn-spinner"></div>' : 'Придбати';
  });
}

export function cleanup(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// Inject styles
function injectPremiumStyles(): void {
  if (document.getElementById('premium-styles')) return;

  const style = document.createElement('style');
  style.id = 'premium-styles';
  style.textContent = `
    .premium-screen {
      min-height: 100%;
      background: linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
      color: white;
      position: relative;
      overflow: hidden;
    }

    .premium-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .premium-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #ffd700;
      border-radius: 50%;
      animation: premiumSpin 1s linear infinite;
    }

    @keyframes premiumSpin {
      to { transform: rotate(360deg); }
    }

    /* Background Effects */
    .premium-bg-effects {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.4;
      animation: glowPulse 4s ease-in-out infinite;
    }

    .glow-1 {
      width: 300px;
      height: 300px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      top: -100px;
      right: -100px;
    }

    .glow-2 {
      width: 250px;
      height: 250px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      bottom: 20%;
      left: -80px;
      animation-delay: 1s;
    }

    .glow-3 {
      width: 200px;
      height: 200px;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      top: 40%;
      right: -50px;
      animation-delay: 2s;
    }

    @keyframes glowPulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }

    /* Header */
    .premium-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      position: relative;
      z-index: 10;
    }

    .premium-back-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .premium-back-btn svg {
      width: 24px;
      height: 24px;
    }

    .premium-title {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .premium-header-spacer {
      width: 44px;
    }

    /* Content */
    .premium-content {
      padding: 0 20px 100px;
      position: relative;
      z-index: 10;
    }

    /* Hero */
    .premium-hero {
      text-align: center;
      margin-bottom: 24px;
    }

    .premium-crown {
      width: 80px;
      height: 80px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: crownFloat 3s ease-in-out infinite;
      box-shadow: 0 10px 40px rgba(255, 215, 0, 0.4);
    }

    .premium-crown svg {
      width: 48px;
      height: 48px;
      color: #1a1a2e;
    }

    @keyframes crownFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .hero-title {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.7);
    }

    /* Premium Card */
    .premium-card {
      position: relative;
      border-radius: 24px;
      padding: 2px;
      margin-bottom: 32px;
      overflow: hidden;
      animation: cardAppear 0.6s ease-out;
    }

    @keyframes cardAppear {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .premium-card.upgrade {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .premium-card.active {
      background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    }

    .card-shine {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.2) 50%,
        transparent 100%
      );
      animation: shine 3s infinite;
    }

    @keyframes shine {
      0% { left: -100%; }
      100% { left: 200%; }
    }

    .card-content {
      background: rgba(10, 10, 26, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 22px;
      padding: 20px 24px;
    }

    .premium-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      color: #1a1a2e;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .premium-badge svg {
      width: 16px;
      height: 16px;
    }

    .premium-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .premium-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .premium-value {
      font-size: 18px;
      font-weight: 600;
      color: white;
    }

    .premium-remaining {
      font-size: 14px;
      color: #ffd700;
      margin-top: 4px;
    }

    .upgrade-content {
      margin-bottom: 16px;
    }

    .upgrade-text {
      display: block;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .upgrade-subtext {
      display: block;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }

    .stars-display {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stars-icon {
      font-size: 24px;
    }

    .stars-value {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }

    /* Plans Section */
    .plans-section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      color: white;
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .plan-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 16px;
      position: relative;
      transition: all 0.3s ease;
      animation: planAppear 0.5s ease-out backwards;
    }

    .plan-card:nth-child(1) { animation-delay: 0.1s; }
    .plan-card:nth-child(2) { animation-delay: 0.2s; }
    .plan-card:nth-child(3) { animation-delay: 0.3s; }
    .plan-card:nth-child(4) { animation-delay: 0.4s; }

    @keyframes planAppear {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .plan-card:hover {
      transform: translateY(-4px);
      border-color: rgba(255, 215, 0, 0.3);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .plan-card.popular {
      border-color: #ffd700;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 140, 0, 0.1) 100%);
    }

    .popular-badge {
      position: absolute;
      top: -8px;
      right: 12px;
      background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
      color: #1a1a2e;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 10px;
    }

    .plan-header {
      margin-bottom: 12px;
    }

    .plan-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .plan-duration {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .plan-price {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 12px;
    }

    .price-stars {
      font-size: 18px;
    }

    .price-value {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .plan-features {
      list-style: none;
      padding: 0;
      margin: 0 0 16px;
    }

    .plan-features li {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      padding: 4px 0;
      position: relative;
      padding-left: 14px;
    }

    .plan-features li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #4ade80;
      font-size: 10px;
    }

    .plan-btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .plan-btn:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .plan-btn:active {
      transform: scale(0.98);
    }

    .plan-btn.loading {
      opacity: 0.7;
      pointer-events: none;
    }

    .btn-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: btnSpin 0.8s linear infinite;
      margin: 0 auto;
    }

    @keyframes btnSpin {
      to { transform: rotate(360deg); }
    }

    /* Features Section */
    .features-section {
      margin-bottom: 24px;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 14px 16px;
    }

    .feature-icon {
      font-size: 28px;
      flex-shrink: 0;
    }

    .feature-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .feature-title {
      font-size: 14px;
      font-weight: 600;
    }

    .feature-desc {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }
  `;
  document.head.appendChild(style);
}

export { cleanup as cleanupPremium };