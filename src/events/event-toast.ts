// Sprint 3.5: Event Toast Notifications
// Success and error toast messages with haptic feedback

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

const TOAST_CONTAINER_ID = 'event-toast-container';

export function showToast(options: ToastOptions): void {
  const { message, type = 'success', duration = 3000 } = options;

  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `event-toast event-toast-${type}`;
  toast.style.cssText = `
    background: ${getBackgroundColor(type)};
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toastSlideIn 0.3s ease-out;
    pointer-events: auto;
    min-width: 200px;
    max-width: 320px;
    text-align: center;
  `;

  const icon = getIcon(type);
  toast.innerHTML = `
    <span style="font-size: 18px;">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Haptic feedback
  triggerHaptic(type);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
    setTimeout(() => {
      toast.remove();
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, duration);

  // Add animation styles if not exists
  addToastStyles();
}

function getBackgroundColor(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    case 'error':
      return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    case 'info':
      return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
  }
}

function getIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'info':
      return 'ℹ';
  }
}

function triggerHaptic(type: ToastType): void {
  try {
    if (typeof window !== 'undefined' && 'Telegram' in window) {
      const tg = (window as unknown as { Telegram: { WebApp: { hapticFeedback: (type: string) => void } } }).Telegram.WebApp;
      if (tg?.hapticFeedback) {
        switch (type) {
          case 'success':
          case 'error':
          case 'info':
            tg.hapticFeedback('impact');
            break;
        }
      }
    }
  } catch {
    // Haptic not available
  }
}

function addToastStyles(): void {
  if (document.getElementById('event-toast-styles')) return;

  const style = document.createElement('style');
  style.id = 'event-toast-styles';
  style.textContent = `
    @keyframes toastSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes toastSlideOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-20px);
      }
    }
  `;
  document.head.appendChild(style);
}

// Convenience functions
export function showSuccessToast(message: string, duration?: number): void {
  showToast({ message, type: 'success', duration });
}

export function showErrorToast(message: string, duration?: number): void {
  showToast({ message, type: 'error', duration });
}

export function showInfoToast(message: string, duration?: number): void {
  showToast({ message, type: 'info', duration });
}
