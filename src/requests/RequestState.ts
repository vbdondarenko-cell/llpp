// Request State Machine - Manages join button states
import type { RequestState, JoinButtonState } from './types';

/**
 * State machine transitions for join requests
 */
export class RequestStateManager {
  private state: RequestState = 'none';
  private isLoading = false;

  constructor(initialState: RequestState = 'none') {
    this.state = initialState;
  }

  /**
   * Get current state
   */
  getState(): RequestState {
    return this.state;
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.isLoading = loading;
  }

  /**
   * Check if currently loading
   */
  isRequestLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Check if user can perform action
   */
  canJoin(): boolean {
    return this.state === 'none' && !this.isLoading;
  }

  /**
   * Check if user can cancel request
   */
  canCancel(): boolean {
    return this.state === 'pending' && !this.isLoading;
  }

  /**
   * Check if user can leave event
   */
  canLeave(): boolean {
    return this.state === 'accepted' && !this.isLoading;
  }

  /**
   * Get button UI state
   */
  getButtonState(): JoinButtonState {
    return {
      state: this.state,
      isLoading: this.isLoading,
      isDisabled: this.isLoading,
      label: this.getLabel(),
      variant: this.getVariant(),
    };
  }

  /**
   * Get button label based on state
   */
  private getLabel(): string {
    if (this.isLoading) {
      return 'Завантаження...';
    }

    switch (this.state) {
      case 'none':
        return 'Приєднатися';
      case 'pending':
        return 'Заявку надіслано';
      case 'accepted':
        return 'Ви учасник';
      case 'joined':
        return 'Ви учасник';
      case 'declined':
        return 'Відхилено';
      case 'cancelled':
        return 'Скасувати заявку';
      default:
        return 'Приєднатися';
    }
  }

  /**
   * Get button variant based on state
   */
  private getVariant(): JoinButtonState['variant'] {
    switch (this.state) {
      case 'none':
        return 'primary';
      case 'pending':
        return 'secondary';
      case 'accepted':
      case 'joined':
        return 'success';
      case 'declined':
        return 'error';
      case 'cancelled':
        return 'outline';
      default:
        return 'primary';
    }
  }

  /**
   * Transition to new state
   */
  transition(newState: RequestState): void {
    // Validate transition
    const validTransitions: Record<RequestState, RequestState[]> = {
      none: ['pending', 'joined'],
      pending: ['accepted', 'declined', 'cancelled'],
      accepted: ['none'],
      joined: ['none'],
      declined: ['none'],
      cancelled: ['none', 'pending'],
    };

    if (validTransitions[this.state]?.includes(newState)) {
      this.state = newState;
    } else {
      console.warn(`Invalid state transition: ${this.state} -> ${newState}`);
    }
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = 'none';
    this.isLoading = false;
  }
}

/**
 * Format request time to Ukrainian relative time
 */
export function formatRequestTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'щойно';
  if (diffMins < 60) return `${diffMins} хв. тому`;
  if (diffHours < 24) return `${diffHours} год. тому`;
  if (diffDays < 7) return `${diffDays} дн. тому`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} тиж. тому`;

  return date.toLocaleDateString('uk-UA');
}

/**
 * Get status display text in Ukrainian
 */
export function getStatusText(status: RequestState): string {
  switch (status) {
    case 'none':
      return 'Не подано';
    case 'pending':
      return 'Очікує';
    case 'accepted':
      return 'Прийнято';
    case 'joined':
      return 'Учасник';
    case 'declined':
      return 'Відхилено';
    case 'cancelled':
      return 'Скасовано';
    default:
      return status;
  }
}

/**
 * Get status color CSS variable
 */
export function getStatusColor(status: RequestState): string {
  switch (status) {
    case 'none':
      return 'var(--text-tertiary)';
    case 'pending':
      return 'var(--warning)';
    case 'accepted':
    case 'joined':
      return 'var(--success)';
    case 'declined':
      return 'var(--error)';
    case 'cancelled':
      return 'var(--text-secondary)';
    default:
      return 'var(--text-secondary)';
  }
}

/**
 * Get status icon
 */
export function getStatusIcon(status: RequestState): string {
  switch (status) {
    case 'none':
      return '➕';
    case 'pending':
      return '⏳';
    case 'accepted':
    case 'joined':
      return '✅';
    case 'declined':
      return '❌';
    case 'cancelled':
      return '↩️';
    default:
      return '❓';
  }
}

export default RequestStateManager;
