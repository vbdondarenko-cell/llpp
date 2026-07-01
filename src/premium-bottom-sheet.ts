// Sprint 2.4: Premium Bottom Sheet
// Apple Maps / Uber inspired draggable sheet with production-quality animations
import type { MapEvent } from './types';

export interface PremiumBottomSheetOptions {
  // Sprint 4.1: Join Request System
  requestState?: 'none' | 'pending' | 'accepted' | 'declined' | 'joined';
  isRequestLoading?: boolean;
  isEventOrganizer?: boolean;
  onCancelRequest?: (eventId: string) => void;
  onLeaveEvent?: (eventId: string) => void;
  onJoin?: (eventId: string) => void;
  onShare?: (eventId: string) => void;
  onSave?: (eventId: string) => void;
  onReport?: (eventId: string) => void;
  onClose?: () => void;
  onStateChange?: (state: PremiumSheetState) => void;
}

export type PremiumSheetState = 'closed' | 'peek' | 'half' | 'expanded';

const PEEK_HEIGHT = 0.15;   // 15% of viewport
const HALF_HEIGHT = 0.55;   // 55% of viewport
const EXPANDED_HEIGHT = 0.95; // 95% of viewport

export class PremiumBottomSheet {
  private container: HTMLElement;
  private backdrop: HTMLElement | null = null;
  private options: PremiumBottomSheetOptions;
  private currentEvent: MapEvent | null = null;
  // Sprint 4.1: Request state management
  private requestState: 'none' | 'pending' | 'accepted' | 'declined' | 'cancelled' | 'joined' = 'none';
  private isRequestLoading = false;
  private isEventOrganizer = false;
  private state: PremiumSheetState = 'closed';
  private isDragging = false;
  private dragStartY = 0;
  private dragStartHeight = 0;
  private velocity = 0;
  private lastY = 0;
  private lastTime = 0;

  constructor(container: HTMLElement, options: PremiumBottomSheetOptions = {}) {
    this.container = container;
    this.options = options;
    this.injectStyles();
    this.createBackdrop();
    this.createSheet();
    this.setupGestures();
    this.setupKeyboardSupport();
  }

  private injectStyles(): void {
    if (document.getElementById('premium-bottom-sheet-styles')) return;

    const style = document.createElement('style');
    style.id = 'premium-bottom-sheet-styles';
    style.textContent = `
      /* Sprint 2.4: Premium Bottom Sheet */
      
      .premium-sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        backdrop-filter: blur(0px);
        z-index: 999;
        pointer-events: none;
        transition: background 0.3s ease, backdrop-filter 0.3s ease;
      }
      
      .premium-sheet-backdrop.visible {
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        pointer-events: auto;
      }
      
      .premium-sheet {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: 0;
        background: #1a1a24;
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
      }
      
      .premium-sheet.open {
        transform: translateY(0);
      }
      
      .premium-sheet.dragging {
        transition: none;
      }
      
      .premium-sheet-header {
        flex-shrink: 0;
        padding: 8px 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .premium-sheet-drag-handle {
        width: 36px;
        height: 5px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        margin: 0 auto;
        cursor: grab;
        transition: background 0.2s;
      }
      
      .premium-sheet-drag-handle:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .premium-sheet-drag-handle:active {
        cursor: grabbing;
      }
      
      .premium-sheet-badges {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .premium-sheet-category {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        color: #ffffff;
        text-transform: capitalize;
      }
      
      .premium-sheet-status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.1);
        color: #a1a1aa;
      }
      
      .premium-sheet-premium {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #000000;
      }
      
      .premium-sheet-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }
      
      .premium-sheet-image {
        width: 100%;
        height: 200px;
        background-size: cover;
        background-position: center;
        position: relative;
        flex-shrink: 0;
      }
      
      .premium-sheet-image-gradient {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 80px;
        background: linear-gradient(to top, #1a1a24, transparent);
      }
      
      .premium-sheet-body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .premium-sheet-title {
        font-size: 22px;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
        line-height: 1.3;
      }
      
      .premium-sheet-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .premium-sheet-meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
      }
      
      .premium-sheet-meta-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
      
      .premium-sheet-meta-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      
      .premium-sheet-meta-label {
        font-size: 10px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .premium-sheet-meta-value {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .premium-sheet-description {
        font-size: 14px;
        line-height: 1.6;
        color: #a1a1aa;
        margin: 0;
      }
      
      .premium-sheet-organizer {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
      }
      
      .premium-sheet-organizer-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }
      
      .premium-sheet-organizer-info {
        flex: 1;
        min-width: 0;
      }
      
      .premium-sheet-organizer-name {
        font-size: 15px;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 2px;
      }
      
      .premium-sheet-organizer-rating {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: #a1a1aa;
      }
      
      .premium-sheet-organizer-rating-star {
        color: #fbbf24;
      }
      
      .premium-sheet-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
        padding-top: 0;
      }
      
      .premium-sheet-join-btn {
        width: 100%;
        padding: 16px;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: #ffffff;
      }
      
      .premium-sheet-join-btn:not(:disabled):hover {
        transform: scale(1.02);
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
      }
      
      .premium-sheet-join-btn:not(:disabled):active {
        transform: scale(0.98);
      }
      
      .premium-sheet-join-btn:disabled {
        background: rgba(59, 130, 246, 0.4);
        cursor: not-allowed;
      }
      /* Sprint 4.1: Join button states */
      .premium-sheet-join-btn.joined {
        background: var(--success);
        color: white;
        cursor: default;
      }
      .premium-sheet-join-btn.pending {
        background: var(--warning);
        color: white;
      }
      .premium-sheet-join-btn.declined {
        background: var(--surface-secondary);
        color: var(--text-tertiary);
      }
      .premium-sheet-join-btn.organizer {
        background: var(--surface-tertiary);
        color: var(--text-tertiary);
        cursor: not-allowed;
      }
      .premium-sheet-join-btn.loading {
        opacity: 0.7;
        cursor: wait;
      }

      
      .premium-sheet-secondary-actions {
        display: flex;
        gap: 8px;
      }
      
      .premium-sheet-secondary-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .premium-sheet-secondary-btn:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      
      .premium-sheet-secondary-btn:active {
        transform: scale(0.98);
      }
      
      /* Spring animation for sheet */
      @keyframes springIn {
        0% { transform: translateY(100%); }
        60% { transform: translateY(-2%); }
        80% { transform: translateY(1%); }
        100% { transform: translateY(0); }
      }
      
      /* Scrollbar styling */
      .premium-sheet-content::-webkit-scrollbar {
        width: 4px;
      }
      
      .premium-sheet-content::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .premium-sheet-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }
      
      .premium-sheet-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      /* Prevent content scroll while dragging */
      .premium-sheet-content.scroll-locked {
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  private createBackdrop(): void {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'premium-sheet-backdrop';
    this.backdrop.addEventListener('click', () => this.close());
    document.body.appendChild(this.backdrop);
  }

  private createSheet(): void {
    this.container.className = 'premium-sheet';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-modal', 'true');
    this.container.setAttribute('aria-label', 'Event details');

    // Header
    const header = document.createElement('div');
    header.className = 'premium-sheet-header';
    header.innerHTML = `
      <div class="premium-sheet-drag-handle" role="slider" aria-label="Drag to resize"></div>
      <div class="premium-sheet-badges"></div>
    `;
    this.container.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.className = 'premium-sheet-content';
    this.container.appendChild(content);

    document.body.appendChild(this.container);
  }

  private setupGestures(): void {
    const handle = this.container.querySelector('.premium-sheet-drag-handle') as HTMLElement;
    if (!handle) return;

    // Touch events
    handle.addEventListener('touchstart', this.onDragStart.bind(this), { passive: true });
    this.container.addEventListener('touchmove', this.onDragMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.onDragEnd.bind(this));
    this.container.addEventListener('touchcancel', this.onDragEnd.bind(this));

    // Mouse events
    handle.addEventListener('mousedown', this.onDragStart.bind(this));
    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));

    // Prevent scrolling content when sheet is being dragged near edges
    const content = this.container.querySelector('.premium-sheet-content') as HTMLElement;
    if (content) {
      content.addEventListener('scroll', () => {
        if (this.isDragging) {
          content.scrollTop = 0;
        }
      });
    }
  }

  private onDragStart(e: TouchEvent | MouseEvent): void {
    this.isDragging = true;
    this.dragStartY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    this.dragStartHeight = this.container.offsetHeight;
    this.lastY = this.dragStartY;
    this.lastTime = Date.now();
    this.velocity = 0;
    
    this.container.classList.add('dragging');
    this.container.classList.remove('open');
    
    const content = this.container.querySelector('.premium-sheet-content');
    content?.classList.add('scroll-locked');
  }

  private onDragMove(e: TouchEvent | MouseEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();

    const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diff = this.dragStartY - currentY;
    const windowHeight = window.innerHeight;
    
    // Calculate new height (inverted because we drag up)
    const newHeight = Math.max(0, Math.min(windowHeight, this.dragStartHeight + diff));
    this.container.style.height = `${newHeight}px`;

    // Calculate velocity for spring animation
    const now = Date.now();
    const dt = now - this.lastTime;
    if (dt > 0) {
      this.velocity = (this.lastY - currentY) / dt;
    }
    this.lastY = currentY;
    this.lastTime = now;
  }

  private onDragEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    this.container.classList.remove('dragging');
    
    const content = this.container.querySelector('.premium-sheet-content');
    content?.classList.remove('scroll-locked');

    const currentHeight = this.container.offsetHeight;
    const windowHeight = window.innerHeight;
    const currentPercent = currentHeight / windowHeight;

    // Determine next state based on position and velocity
    let nextState: PremiumSheetState;
    
    // If swiping down fast or at bottom, close
    if (this.velocity > 0.5 || currentPercent < PEEK_HEIGHT * 0.7) {
      nextState = 'closed';
    }
    // If swiping up fast or above half, expand
    else if (this.velocity < -0.5 || currentPercent < HALF_HEIGHT * 0.7) {
      nextState = 'expanded';
    }
    // Otherwise snap to nearest state
    else if (currentPercent < (PEEK_HEIGHT + HALF_HEIGHT) / 2) {
      nextState = 'peek';
    } else if (currentPercent < (HALF_HEIGHT + EXPANDED_HEIGHT) / 2) {
      nextState = 'half';
    } else {
      nextState = 'expanded';
    }

    this.animateToState(nextState);
  }

  private animateToState(state: PremiumSheetState): void {
    const windowHeight = window.innerHeight;
    let targetHeight: number;

    switch (state) {
      case 'closed':
        targetHeight = 0;
        this.backdrop?.classList.remove('visible');
        this.options.onClose?.();
        break;
      case 'peek':
        targetHeight = windowHeight * PEEK_HEIGHT;
        this.backdrop?.classList.add('visible');
        break;
      case 'half':
        targetHeight = windowHeight * HALF_HEIGHT;
        this.backdrop?.classList.add('visible');
        break;
      case 'expanded':
        targetHeight = windowHeight * EXPANDED_HEIGHT;
        this.backdrop?.classList.add('visible');
        break;
    }

    // Apply spring animation
    this.container.style.transition = 'height 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
    this.container.style.height = `${targetHeight}px`;
    this.container.classList.add('open');

    this.state = state;
    this.options.onStateChange?.(state);

    // Reset transition after animation
    setTimeout(() => {
      if (this.state === state) {
        this.container.style.transition = '';
      }
    }, 400);
  }

  private setupKeyboardSupport(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state !== 'closed') {
        this.close();
      }
    });

    // Focus trapping
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusableElements = this.container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    });
  }

  public show(event: MapEvent, requestState?: 'none' | 'pending' | 'accepted' | 'declined' | 'cancelled' | 'joined', isOrganizer = false): void {
    this.requestState = requestState || 'none';
    this.isEventOrganizer = isOrganizer;
    this.currentEvent = event;
    this.renderContent(event);
    this.animateToState('half');
    this.container.setAttribute('aria-label', `Event: ${event.title}`);
    
    // Focus first interactive element
    setTimeout(() => {
      const joinBtn = this.container.querySelector('.premium-sheet-join-btn') as HTMLElement;
      joinBtn?.focus();
    }, 100);
  }

  private renderContent(event: MapEvent): void {
    const content = this.container.querySelector('.premium-sheet-content');
    const badges = this.container.querySelector('.premium-sheet-badges');
    
    if (!content || !badges) return;

    // Render badges
    badges.innerHTML = `
      <span class="premium-sheet-category" style="background-color: ${this.getCategoryColor(event.category)}">
        ${this.getCategoryIcon(event.category)} ${event.category}
      </span>
      <span class="premium-sheet-status">
        ${this.getEventStatus(event)}
      </span>
      ${event.is_premium_only ? '<span class="premium-sheet-premium">⭐ Premium</span>' : ''}
    `;

    // Format date/time
    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
    const formattedTime = eventDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const distance = event.distance < 1 
      ? `${Math.round(event.distance * 1000)}м` 
      : `${event.distance.toFixed(1)}км`;
    
    const price = event.price > 0 ? `${event.price} ${event.currency}` : 'Безкоштовно';
    const participants = `${event.current_participants}/${event.max_participants}`;

    // Calculate duration if end date exists
    let duration = '';
    if (event.event_end_date) {
      const endDate = new Date(event.event_end_date);
      const diffMs = endDate.getTime() - eventDate.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 0) {
        duration = minutes > 0 ? `${hours}год ${minutes}хв` : `${hours}год`;
      } else {
        duration = `${minutes}хв`;
      }
    }

    // Organizer rating (mock - would come from API)
    const rating = '4.8';
    const ratingCount = '42';

    // Render content
    content.innerHTML = `
      <div class="premium-sheet-image" style="background-image: url('${event.photo_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'}')">
        <div class="premium-sheet-image-gradient"></div>
      </div>
      <div class="premium-sheet-body">
        <h2 class="premium-sheet-title">${event.title}</h2>
        
        <div class="premium-sheet-meta-grid">
          <div class="premium-sheet-meta-item">
            <span class="premium-sheet-meta-icon">📍</span>
            <div class="premium-sheet-meta-text">
              <span class="premium-sheet-meta-label">Відстань</span>
              <span class="premium-sheet-meta-value">${distance}</span>
            </div>
          </div>
          <div class="premium-sheet-meta-item">
            <span class="premium-sheet-meta-icon">🗓</span>
            <div class="premium-sheet-meta-text">
              <span class="premium-sheet-meta-label">Дата</span>
              <span class="premium-sheet-meta-value">${formattedDate}</span>
            </div>
          </div>
          <div class="premium-sheet-meta-item">
            <span class="premium-sheet-meta-icon">🕐</span>
            <div class="premium-sheet-meta-text">
              <span class="premium-sheet-meta-label">Час</span>
              <span class="premium-sheet-meta-value">${formattedTime}</span>
            </div>
          </div>
          ${duration ? `
          <div class="premium-sheet-meta-item">
            <span class="premium-sheet-meta-icon">⏱</span>
            <div class="premium-sheet-meta-text">
              <span class="premium-sheet-meta-label">Тривалість</span>
              <span class="premium-sheet-meta-value">${duration}</span>
            </div>
          </div>
          ` : ''}
          <div class="premium-sheet-meta-item">
            <span class="premium-sheet-meta-icon">💰</span>
            <div class="premium-sheet-meta-text">
              <span class="premium-sheet-meta-label">Ціна</span>
              <span class="premium-sheet-meta-value">${price}</span>
            </div>
          </div>
          <div class="premium-sheet-meta-item">
            <span class="premium-sheet-meta-icon">👥</span>
            <div class="premium-sheet-meta-text">
              <span class="premium-sheet-meta-label">Учасники</span>
              <span class="premium-sheet-meta-value">${participants}</span>
            </div>
          </div>
        </div>
        
        ${event.description ? `
        <p class="premium-sheet-description">${event.description}</p>
        ` : ''}
        
        <div class="premium-sheet-organizer">
          <img 
            src="${event.organizer.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.organizer.first_name || 'U')}&background=3b82f6&color=fff`}" 
            alt="" 
            class="premium-sheet-organizer-avatar"
          >
          <div class="premium-sheet-organizer-info">
            <p class="premium-sheet-organizer-name">${event.organizer.first_name || event.organizer.username || 'Організатор'}</p>
            <div class="premium-sheet-organizer-rating">
              <span class="premium-sheet-organizer-rating-star">★</span>
              <span>${rating}</span>
              <span>(${ratingCount})</span>
            </div>
          </div>
        </div>
        
        <div class="premium-sheet-actions">
          <button class="premium-sheet-join-btn" id="join-btn">
            ${this.getJoinButtonText()}
          </button>
          <div class="premium-sheet-secondary-actions">
            <button class="premium-sheet-secondary-btn" id="share-btn">
              📤 Поділитися
            </button>
            <button class="premium-sheet-secondary-btn" id="save-btn">
              🔖 Зберегти
            </button>
            <button class="premium-sheet-secondary-btn" id="report-btn">
              ⚠️ Поскаржитись
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach event handlers
    const shareBtn = content.querySelector('#share-btn') as HTMLButtonElement;
    const saveBtn = content.querySelector('#save-btn') as HTMLButtonElement;
    const reportBtn = content.querySelector('#report-btn') as HTMLButtonElement;

    // Sprint 4.1: Join button handler
    const joinBtn = this.container.querySelector('#join-btn') as HTMLButtonElement;
    joinBtn?.addEventListener('click', async () => {
      if (this.isEventOrganizer) return;
      if (this.requestState === 'pending') {
        this.options.onCancelRequest?.(event.id);
      } else if (this.requestState === 'none') {
        this.options.onJoin?.(event.id);
      }
    });
    shareBtn?.addEventListener('click', () => this.options.onShare?.(event.id));
    saveBtn?.addEventListener('click', () => this.options.onSave?.(event.id));
    reportBtn?.addEventListener('click', () => this.options.onReport?.(event.id));
  }

  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
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
    return colors[category] || colors.other;
  }

  private getCategoryIcon(category: string): string {
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
    return icons[category] || '✨';
  }

  private getEventStatus(event: MapEvent): string {
    const now = new Date();
    const eventDate = new Date(event.event_date);
    const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (eventDate < now) return 'Завершено';
    if (hoursUntil <= 1) return 'Скоро почнеться';
    if (hoursUntil <= 24) return 'Сьогодні';
    if (hoursUntil <= 48) return 'Завтра';
    return 'Активне';
  }


  // Sprint 4.1: Join button helpers
  private getJoinButtonText(): string {
    if (this.isEventOrganizer) {
      return 'Це ваша подія';
    }
    
    switch (this.requestState) {
      case 'pending':
        return 'Заявку надіслано ✓';
      case 'accepted':
      case 'joined':
        return 'Ви учасник ✓';
      case 'declined':
        return 'Відхилено - Спробувати знову';
      default:
        return 'Приєднатися';
    }
  }

  private getJoinButtonClass(): string {
    let classes = 'premium-sheet-join-btn';
    
    if (this.isEventOrganizer) {
      classes += ' organizer';
    } else {
      switch (this.requestState) {
        case 'pending':
          classes += ' pending';
          break;
        case 'accepted':
        case 'joined':
          classes += ' joined';
          break;
        case 'declined':
        case 'cancelled':
          classes += ' declined';
          break;
        default:
          classes += ' primary';
      }
    }
    
    return classes;
  }

  public setRequestState(state: 'none' | 'pending' | 'accepted' | 'declined' | 'cancelled' | 'joined'): void {
    this.requestState = state;
    this.updateJoinButton();
  }

  public setRequestLoading(loading: boolean): void {
    this.isRequestLoading = loading;
    this.updateJoinButton();
  }

  public setIsOrganizer(isOrganizer: boolean): void {
    this.isEventOrganizer = isOrganizer;
    this.updateJoinButton();
  }

  private updateJoinButton(): void {
    const btn = this.container.querySelector('#join-btn') as HTMLButtonElement;
    if (btn) {
      btn.className = this.getJoinButtonClass();
      btn.textContent = this.getJoinButtonText();
      btn.disabled = this.isRequestLoading || this.isEventOrganizer || this.requestState === 'accepted' || this.requestState === 'joined' || this.requestState === 'cancelled';
    }
  }

  public close(): void {
    this.animateToState('closed');
  }

  public getState(): PremiumSheetState {
    return this.state;
  }

  public getCurrentEvent(): MapEvent | null {
    return this.currentEvent;
  }

  public destroy(): void {
    this.backdrop?.remove();
    this.container.remove();
    const style = document.getElementById('premium-bottom-sheet-styles');
    style?.remove();
  }
}

export default PremiumBottomSheet;
