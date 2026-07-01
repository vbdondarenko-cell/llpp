// Organizer Requests UI - Displays and manages join requests
import type { EventRequest, EventRequestsResponse } from '../types';
// RequestCard is defined in types
import { formatRequestTime, getStatusText, getStatusColor } from './RequestState';
import { JoinRequestService } from './JoinRequestService';

export interface OrganizerRequestsCallbacks {
  onRequestAccepted?: (userId: string) => void;
  onRequestDeclined?: (userId: string) => void;
  onError?: (error: string) => void;
}

export class OrganizerRequests {
  private container: HTMLElement;
  private callbacks: OrganizerRequestsCallbacks;
  private requests: EventRequestsResponse | null = null;
  private processingUsers: Set<string> = new Set();

  constructor(container: HTMLElement, callbacks: OrganizerRequestsCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
  }

  /**
   * Render all requests
   */
  render(requests: EventRequestsResponse): void {
    this.requests = requests;
    
    if (!requests.success) {
      this.renderError();
      return;
    }

    const hasRequests = 
      (requests.pending?.length || 0) > 0 ||
      (requests.accepted?.length || 0) > 0 ||
      (requests.declined?.length || 0) > 0;

    if (!hasRequests) {
      this.renderEmpty();
      return;
    }

    this.container.innerHTML = `
      <div class="organizer-requests">
        ${this.renderSection('pending', 'Очікують', requests.pending || [])}
        ${this.renderSection('accepted', 'Прийняті', requests.accepted || [])}
        ${this.renderSection('declined', 'Відхилені', requests.declined || [])}
      </div>
    `;

    this.attachEventHandlers();
  }

  /**
   * Render a section of requests
   */
  private renderSection(status: string, title: string, requests: EventRequest[]): string {
    if (requests.length === 0) return '';

    return `
      <div class="requests-section" data-status="${status}">
        <div class="requests-section-header">
          <h4>${title}</h4>
          <span class="requests-count">${requests.length}</span>
        </div>
        <div class="requests-list">
          ${requests.map(req => this.renderRequestCard(req, status)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render a single request card
   */
  private renderRequestCard(request: EventRequest, sectionStatus: string): string {
    const profile = request.profile || {
      username: null,
      first_name: null,
      avatar_url: null,
      rating: 0,
      rating_count: 0,
    };
    const avatarUrl = profile.avatar_url || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.first_name || profile.username || 'U')}&background=3b82f6&color=fff`;
    
    const isProcessing = this.processingUsers.has(request.user_id);
    const canAction = sectionStatus === 'pending' && !isProcessing;

    return `
      <div class="request-card" data-user-id="${request.user_id}" data-status="${sectionStatus}">
        <div class="request-card-avatar">
          <img src="${avatarUrl}" alt="" loading="lazy" />
        </div>
        <div class="request-card-info">
          <div class="request-card-name">
            ${profile.first_name || profile.username || 'Користувач'}
            ${profile.username ? `<span class="request-card-username">@${profile.username}</span>` : ''}
          </div>
          <div class="request-card-meta">
            ${profile.rating ? `
              <span class="request-card-rating">
                ★ ${profile.rating.toFixed(1)} (${profile.rating_count || 0})
              </span>
            ` : ''}
            <span class="request-card-time">${formatRequestTime(request.created_at)}</span>
          </div>
          
        </div>
        <div class="request-card-actions">
          ${sectionStatus === 'pending' ? `
            <button 
              class="request-action-btn accept-btn ${isProcessing ? 'loading' : ''}"
              data-user-id="${request.user_id}"
              ${!canAction ? 'disabled' : ''}
            >
              ${isProcessing ? '<span class="spinner"></span>' : '✓'}
            </button>
            <button 
              class="request-action-btn decline-btn ${isProcessing ? 'loading' : ''}"
              data-user-id="${request.user_id}"
              ${!canAction ? 'disabled' : ''}
            >
              ${isProcessing ? '<span class="spinner"></span>' : '✗'}
            </button>
          ` : `
            <span class="request-status-badge" style="color: ${getStatusColor(sectionStatus as any)}">
              ${getStatusText(sectionStatus as any)}
            </span>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="requests-empty">
        <div class="requests-empty-icon">📭</div>
        <p>Заявок поки що немає</p>
        <p class="requests-empty-hint">Нові заявки з'являться тут</p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderError(): void {
    this.container.innerHTML = `
      <div class="requests-error">
        <p>Не вдалося завантажити заявки</p>
        <button class="retry-btn">Спробувати знову</button>
      </div>
    `;

    this.container.querySelector('.retry-btn')?.addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('retry'));
    });
  }

  /**
   * Attach event handlers to action buttons
   */
  private attachEventHandlers(): void {
    // Accept buttons
    this.container.querySelectorAll('.accept-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId) {
          await this.handleAccept(userId);
        }
      });
    });

    // Decline buttons
    this.container.querySelectorAll('.decline-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId) {
          await this.handleDecline(userId);
        }
      });
    });
  }

  /**
   * Handle accept request
   */
  private async handleAccept(userId: string): Promise<void> {
    if (!this.requests) return;

    const card = this.container.querySelector(`.request-card[data-user-id="${userId}"]`);
    const acceptBtn = card?.querySelector('.accept-btn');
    const declineBtn = card?.querySelector('.decline-btn');

    // Set loading state
    this.processingUsers.add(userId);
    acceptBtn?.classList.add('loading');
    declineBtn?.setAttribute('disabled', 'true');
    card?.classList.add('processing');

    try {
      const result = await JoinRequestService.acceptRequest(this.requests.event as any, userId);

      if (result.success) {
        // Success animation
        card?.classList.add('accepted');
        setTimeout(() => {
          card?.remove();
          this.updateSectionCount('pending', -1);
          this.updateSectionCount('accepted', 1);
        }, 500);

        this.callbacks.onRequestAccepted?.(userId);
      } else {
        this.callbacks.onError?.(result.error || 'Помилка схвалення');
        card?.classList.remove('processing');
      }
    } catch (err) {
      console.error('Accept request error:', err);
      this.callbacks.onError?.('Помилка схвалення');
      card?.classList.remove('processing');
    } finally {
      this.processingUsers.delete(userId);
      acceptBtn?.classList.remove('loading');
      declineBtn?.removeAttribute('disabled');
    }
  }

  /**
   * Handle decline request
   */
  private async handleDecline(userId: string): Promise<void> {
    if (!this.requests) return;

    const card = this.container.querySelector(`.request-card[data-user-id="${userId}"]`);
    const acceptBtn = card?.querySelector('.accept-btn');
    const declineBtn = card?.querySelector('.decline-btn');

    // Set loading state
    this.processingUsers.add(userId);
    declineBtn?.classList.add('loading');
    acceptBtn?.setAttribute('disabled', 'true');
    card?.classList.add('processing');

    try {
      const result = await JoinRequestService.declineRequest(this.requests.event as any, userId);

      if (result.success) {
        // Success animation
        card?.classList.add('declined');
        setTimeout(() => {
          card?.remove();
          this.updateSectionCount('pending', -1);
          this.updateSectionCount('declined', 1);
        }, 500);

        this.callbacks.onRequestDeclined?.(userId);
      } else {
        this.callbacks.onError?.(result.error || 'Помилка відхилення');
        card?.classList.remove('processing');
      }
    } catch (err) {
      console.error('Decline request error:', err);
      this.callbacks.onError?.('Помилка відхилення');
      card?.classList.remove('processing');
    } finally {
      this.processingUsers.delete(userId);
      declineBtn?.classList.remove('loading');
      acceptBtn?.removeAttribute('disabled');
    }
  }

  /**
   * Update section count after action
   */
  private updateSectionCount(status: string, delta: number): void {
    const section = this.container.querySelector(`.requests-section[data-status="${status}"]`);
    if (!section) return;

    const countEl = section.querySelector('.requests-count');
    if (!countEl) return;

    const currentCount = parseInt(countEl.textContent || '0', 10);
    const newCount = Math.max(0, currentCount + delta);
    
    if (newCount === 0) {
      section.remove();
    } else {
      countEl.textContent = String(newCount);
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.processingUsers.clear();
    this.requests = null;
  }
}

export default OrganizerRequests;
