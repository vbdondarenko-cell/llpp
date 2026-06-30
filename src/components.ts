// Bottom Sheet Component
import type { BottomSheetState } from './types';

export interface BottomSheetCallbacks {
  onStateChange?: (state: BottomSheetState) => void;
  onClose?: () => void;
}

export class BottomSheet {
  private container: HTMLElement;
  private content: HTMLElement | null = null;
  private state: BottomSheetState = 'half';
  private isDragging: boolean = false;
  private callbacks: BottomSheetCallbacks = {};

  constructor(container: HTMLElement, callbacks: BottomSheetCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.init();
  }

  private init(): void {
    this.container.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 0;
      background: var(--bg-secondary);
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
      transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 100;
      overflow: hidden;
    `;

    const handle = document.createElement('div');
    handle.className = 'bottom-sheet-handle';
    handle.style.cssText = `
      width: 40px;
      height: 5px;
      background: var(--text-tertiary);
      border-radius: 3px;
      margin: 10px auto;
      cursor: grab;
    `;
    this.container.appendChild(handle);

    this.content = document.createElement('div');
    this.content.style.cssText = `
      padding: 0 16px 16px;
      overflow-y: auto;
      height: calc(100% - 20px);
    `;
    this.container.appendChild(this.content);

    this.addEventListeners(handle);
  }

  private addEventListeners(handle: HTMLElement): void {
    let startY = 0;
    let startHeight = 0;

    const onStart = (e: TouchEvent | MouseEvent) => {
      this.isDragging = true;
      startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startHeight = this.container.offsetHeight;
      handle.style.cursor = 'grabbing';
    };

    const onMove = (e: TouchEvent | MouseEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();
      
      const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const diff = startY - currentY;
      const windowHeight = window.innerHeight;
      
      let newHeight = Math.max(0, Math.min(windowHeight * 0.9, startHeight + diff));
      this.container.style.height = `${newHeight}px`;
    };

    const onEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      handle.style.cursor = 'grab';
      
      const currentHeight = this.container.offsetHeight;
      const windowHeight = window.innerHeight;
      
      if (currentHeight < windowHeight * 0.2) {
        this.setState('collapsed');
      } else if (currentHeight < windowHeight * 0.6) {
        this.setState('half');
      } else {
        this.setState('full');
      }
    };

    handle.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);

    handle.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }

  public setState(state: BottomSheetState): void {
    this.state = state;
    const windowHeight = window.innerHeight;
    
    switch (state) {
      case 'collapsed':
        this.container.style.height = '0px';
        break;
      case 'half':
        this.container.style.height = `${windowHeight * 0.45}px`;
        break;
      case 'full':
        this.container.style.height = `${windowHeight * 0.9}px`;
        break;
    }

    this.callbacks.onStateChange?.(state);
  }

  public getState(): BottomSheetState {
    return this.state;
  }

  public setContent(html: string): void {
    if (this.content) {
      this.content.innerHTML = html;
    }
  }

  public getContent(): HTMLElement | null {
    return this.content;
  }

  public open(state: BottomSheetState = 'half'): void {
    this.setState(state);
  }

  public close(): void {
    this.setState('collapsed');
    this.callbacks.onClose?.();
  }
}

// Event Card Component
import type { MapEvent } from './types';
import { CATEGORY_COLORS } from './events';
import { formatDistance, formatEventTime } from './events';

export interface EventCardCallbacks {
  onJoin?: (eventId: string) => void;
  onClick?: (event: MapEvent) => void;
}

export function createEventCard(event: MapEvent, callbacks: EventCardCallbacks = {}): HTMLElement {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.style.cssText = `
    background: var(--bg-tertiary);
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 12px;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: cardAppear 0.3s ease-out;
  `;

  const categoryColor = CATEGORY_COLORS[event.category];
  const categoryIcon = getCategoryIcon(event.category);
  const timeText = formatEventTime(event.event_date);
  const distanceText = formatDistance(event.distance);
  const participantsText = `${event.current_participants}/${event.max_participants}`;

  card.innerHTML = `
    <div class="event-card-image" style="position: relative;">
      ${event.photo_url 
        ? `<img src="${event.photo_url}" alt="${event.title}" style="width: 100%; height: 120px; object-fit: cover;">` 
        : `<div style="width: 100%; height: 120px; background: linear-gradient(135deg, ${categoryColor}33, ${categoryColor}66); display: flex; align-items: center; justify-content: center; font-size: 48px;">${categoryIcon}</div>`
      }
      <div class="event-card-category" style="
        position: absolute;
        top: 8px;
        left: 8px;
        background: ${categoryColor};
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        ${categoryIcon} ${event.category}
      </div>
      ${event.is_premium_only ? '<div class="premium-badge" style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">⭐ PRO</div>' : ''}
    </div>
    <div class="event-card-content" style="padding: 12px;">
      <h3 class="event-card-title" style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">
        ${event.title}
      </h3>
      <div class="event-card-meta" style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: var(--text-secondary);">
        <span style="display: flex; align-items: center; gap: 4px;">
          📍 ${distanceText}
        </span>
        <span style="display: flex; align-items: center; gap: 4px;">
          🕐 ${timeText}
        </span>
        <span style="display: flex; align-items: center; gap: 4px;">
          👥 ${participantsText}
        </span>
      </div>
      <div class="event-card-footer" style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
        <div class="event-card-organizer" style="display: flex; align-items: center; gap: 8px;">
          <img src="${event.organizer.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(event.organizer.first_name || 'U')}" 
               alt="" 
               style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">
          <span style="font-size: 13px; color: var(--text-secondary);">
            @${event.organizer.username || event.organizer.first_name || 'Unknown'}
          </span>
        </div>
        <button class="event-card-join" style="
          background: var(--accent-primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease;
        ">
          Приєднатися
        </button>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('event-card-join')) {
      e.stopPropagation();
      callbacks.onJoin?.(event.id);
    } else {
      callbacks.onClick?.(event);
    }
  });

  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-2px)';
    card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = 'none';
  });

  return card;
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
  return icons[category] || '✨';
}

export function createEventCardList(events: MapEvent[], callbacks: EventCardCallbacks = {}): HTMLElement {
  const container = document.createElement('div');
  container.className = 'event-card-list';
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cardAppear {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  if (!document.querySelector('#event-card-styles')) {
    style.id = 'event-card-styles';
    document.head.appendChild(style);
  }

  events.forEach((event, index) => {
    const card = createEventCard(event, callbacks);
    (card as HTMLElement).style.animationDelay = `${index * 50}ms`;
    container.appendChild(card);
  });

  return container;
}
