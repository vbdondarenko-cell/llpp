// Telegram WebApp authentication
import type { TelegramUser } from './types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface AuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    telegram_id: number;
    username?: string;
    first_name: string;
  };
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  ready: () => void;
  close: () => void;
  expand: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
  sendData: (data: string) => void;
  showPopup: (params: object) => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  openTelegramInvoice: (slug: string) => void;
  HapticFeedback: HapticFeedback;
  cloudStorage: CloudStorage;
  isVersionAtLeast: (version: string) => boolean;
  platform: string;
  version: string;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  headerColor: string;
  backgroundColor: string;
  expanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  screenHeight: number;
  screenWidth: number;
  safeAreaInset: SafeAreaInset;
}

interface TelegramInitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  start_param?: string;
  chat_type?: string;
  chat_instance?: string;
  auth_date: number;
  hash: string;
}

interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
  notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
  selectionChanged: () => void;
}

interface CloudStorage {
  getItem: (key: string, callback: (error: string | null, result: string | null) => void) => void;
  setItem: (key: string, value: string, callback: (error: string | null) => void) => void;
  removeItem: (key: string, callback: (error: string | null) => void) => void;
  getItems: (keys: string[], callback: (error: string | null, result: string[]) => void) => void;
  setItems: (items: { key: string; value: string }[], callback: (error: string | null) => void) => void;
  removeItems: (keys: string[], callback: (error: string | null) => void) => void;
  getKeys: (callback: (error: string | null, result: string[]) => void) => void;
}

interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface SafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

class TelegramAuth {
  private webApp: TelegramWebApp | null = null;

  constructor() {
    // Bot token for validation (should be in environment variable)
    void import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.initialize();
  }

  private initialize(): void {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;
      this.webApp.ready();
      this.webApp.expand();
    }
  }

  public isAvailable(): boolean {
    return this.webApp !== null;
  }

  public getUser(): TelegramUser | null {
    return this.webApp?.initDataUnsafe.user ?? null;
  }

  public getInitData(): string {
    return this.webApp?.initData ?? '';
  }

  public getAuthDate(): number {
    return this.webApp?.initDataUnsafe.auth_date ?? 0;
  }

  public getColorScheme(): 'light' | 'dark' {
    return this.webApp?.colorScheme ?? 'dark';
  }

  public getSafeArea(): SafeAreaInset {
    return this.webApp?.safeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
  }

  public showAlert(message: string): void {
    this.webApp?.showAlert(message);
  }

  public hapticFeedback(style: 'light' | 'medium' | 'heavy'): void {
    this.webApp?.HapticFeedback.impactOccurred(style);
  }

  public hapticNotification(type: 'success' | 'warning' | 'error'): void {
    this.webApp?.HapticFeedback.notificationOccurred(type);
  }

  // Validate initData hash (for production use)
  public async validateInitData(): Promise<boolean> {
    if (!this.webApp?.initData) {
      return false;
    }

    // Check auth_date is not too old (24 hours)
    const authDate = this.webApp.initDataUnsafe.auth_date;
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      console.error('InitData expired');
      return false;
    }

    // For production, validate hash against bot token
    // This requires server-side validation for security
    // Client-side validation is for demo purposes only
    return true;
  }

  // Authenticate via Supabase Edge Function
  public async authenticate(): Promise<AuthResult> {
    if (!this.webApp?.initData) {
      // Demo mode - no Telegram WebApp
      return { success: false, error: 'No Telegram WebApp' };
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return { success: false, error: 'Supabase URL not configured' };
      }

      // Call Edge Function to authenticate
      const response = await fetch(`${supabaseUrl}/functions/v1/telegram-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initData: this.webApp.initData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Authentication failed' };
      }

      const result: AuthResult = await response.json();

      if (result.success && result.user) {
        // Try to get session from localStorage or establish one
        // The Edge Function creates/finds user, but doesn't return JWT
        // For now, store the telegram_id in localStorage as a fallback
        localStorage.setItem('telegram_id', result.user.telegram_id.toString());
        localStorage.setItem('telegram_user_id', result.user.id);
      }

      return result;
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get user data for profile creation
  public getUserData(): {
    telegramId: number;
    username: string | null;
    firstName: string;
    lastName: string | null;
    avatarUrl: string | null;
  } | null {
    const user = this.getUser();
    if (!user) return null;

    return {
      telegramId: user.id,
      username: user.username ?? null,
      firstName: user.first_name,
      lastName: user.last_name ?? null,
      avatarUrl: user.photo_url ?? null,
    };
  }
}

export const telegramAuth = new TelegramAuth();
export default telegramAuth;
