// Request Notifications - Handles notification display for join requests
// RequestState types
import { telegramAuth } from '../telegram-auth';

export interface NotificationOptions {
  showToast?: boolean;
  showAlert?: boolean;
  hapticFeedback?: boolean;
}

/**
 * Request Notification Manager
 */
export class RequestNotification {
  private static lastNotificationTime = 0;
  private static notificationCooldown = 2000; // 2 seconds

  /**
   * Show notification for request state change
   */
  static notify(
    type: 'join' | 'accept' | 'decline' | 'cancel' | 'error',
    options: NotificationOptions = {}
  ): void {
    const { showToast = true, showAlert = false, hapticFeedback = true } = options;

    // Throttle notifications
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return;
    }
    this.lastNotificationTime = now;

    // Haptic feedback
    if (hapticFeedback) {
      this.triggerHaptic(type);
    }

    // Toast notification
    if (showToast) {
      this.showToast(type);
    }

    // Alert for important events
    if (showAlert) {
      this.showAlert(type);
    }
  }

  /**
   * Trigger appropriate haptic feedback
   */
  private static triggerHaptic(type: 'join' | 'accept' | 'decline' | 'cancel' | 'error'): void {
    try {
      switch (type) {
        case 'join':
        case 'accept':
          telegramAuth.hapticNotification('success');
          break;
        case 'decline':
        case 'cancel':
          telegramAuth.hapticNotification('warning');
          break;
        case 'error':
          telegramAuth.hapticNotification('error');
          break;
      }
    } catch (err) {
      console.warn('Haptic feedback not available:', err);
    }
  }

  /**
   * Show toast notification
   */
  private static showToast(type: 'join' | 'accept' | 'decline' | 'cancel' | 'error'): void {
    const message = this.getToastMessage(type);
    
    // Use Telegram's showPopup if available, otherwise create custom toast
    try {
      telegramAuth.showAlert(message);
    } catch {
      // Fallback to custom toast
      this.showCustomToast(message, type);
    }
  }

  /**
   * Show alert for important events
   */
  private static showAlert(type: 'join' | 'accept' | 'decline' | 'cancel' | 'error'): void {
    const message = this.getAlertMessage(type);
    
    try {
      telegramAuth.showAlert(message);
    } catch (err) {
      console.warn('Show alert not available:', err);
    }
  }

  /**
   * Get toast message for notification type
   */
  private static getToastMessage(type: 'join' | 'accept' | 'decline' | 'cancel' | 'error'): string {
    switch (type) {
      case 'join':
        return '✅ Заявку надіслано!';
      case 'accept':
        return '✅ Заявку прийнято!';
      case 'decline':
        return '❌ Заявку відхилено';
      case 'cancel':
        return '↩️ Заявку скасовано';
      case 'error':
        return '❌ Сталася помилка';
      default:
        return '';
    }
  }

  /**
   * Get alert message for notification type
   */
  private static getAlertMessage(type: 'join' | 'accept' | 'decline' | 'cancel' | 'error'): string {
    switch (type) {
      case 'join':
        return 'Вашу заявку надіслано організатору';
      case 'accept':
        return 'Вашу заявку прийнято! Ви можете приєднатися до події.';
      case 'decline':
        return 'Вашу заявку відхилено.';
      case 'cancel':
        return 'Заявку скасовано.';
      case 'error':
        return 'Сталася помилка. Спробуйте пізніше.';
      default:
        return '';
    }
  }

  /**
   * Show custom toast (fallback)
   */
  private static showCustomToast(message: string, type: 'join' | 'accept' | 'decline' | 'cancel' | 'error'): void {
    // Remove existing toast
    const existingToast = document.querySelector('.request-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `request-toast request-toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .request-toast {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--surface-primary, #1a1a2e);
        color: var(--text-primary, #fff);
        padding: 12px 20px;
        border-radius: 24px;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 9999;
        animation: toastSlideIn 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
      .request-toast-join, .request-toast-accept {
        border-left: 4px solid var(--success, #22c55e);
      }
      .request-toast-decline, .request-toast-error {
        border-left: 4px solid var(--error, #ef4444);
      }
      .request-toast-cancel {
        border-left: 4px solid var(--warning, #f59e0b);
      }
      .toast-icon { font-size: 18px; }
      .toast-message { font-size: 14px; font-weight: 500; }
      @keyframes toastSlideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => {
        toast.remove();
        styles.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Get icon for toast type
   */
  private static getToastIcon(type: 'join' | 'accept' | 'decline' | 'cancel' | 'error'): string {
    switch (type) {
      case 'join':
        return '📨';
      case 'accept':
        return '🎉';
      case 'decline':
        return '👋';
      case 'cancel':
        return '↩️';
      case 'error':
        return '⚠️';
      default:
        return '📢';
    }
  }
}

/**
 * Notification events for tracking
 */
export type RequestNotificationEvent = {
  type: 'join' | 'accept' | 'decline' | 'cancel';
  eventId: string;
  userId?: string;
  timestamp: number;
};

/**
 * In-app notification center for requests
 */
export class RequestNotificationCenter {
  private listeners: ((event: RequestNotificationEvent) => void)[] = [];

  /**
   * Subscribe to request notifications
   */
  subscribe(callback: (event: RequestNotificationEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Emit notification event
   */
  emit(event: RequestNotificationEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Notify join request sent
   */
  notifyJoin(eventId: string): void {
    RequestNotification.notify('join');
    this.emit({ type: 'join', eventId, timestamp: Date.now() });
  }

  /**
   * Notify request accepted
   */
  notifyAccept(eventId: string, userId: string): void {
    RequestNotification.notify('accept', { showAlert: true });
    this.emit({ type: 'accept', eventId, userId, timestamp: Date.now() });
  }

  /**
   * Notify request declined
   */
  notifyDecline(eventId: string, userId: string): void {
    RequestNotification.notify('decline');
    this.emit({ type: 'decline', eventId, userId, timestamp: Date.now() });
  }

  /**
   * Notify request cancelled
   */
  notifyCancel(eventId: string): void {
    RequestNotification.notify('cancel');
    this.emit({ type: 'cancel', eventId, timestamp: Date.now() });
  }

  /**
   * Notify error
   */
  notifyError(error: string): void {
    RequestNotification.notify('error');
    console.error('Request error:', error);
  }
}

// Singleton instance
export const requestNotificationCenter = new RequestNotificationCenter();

export default RequestNotification;
