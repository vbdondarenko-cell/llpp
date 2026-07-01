// Premium API Functions
import { supabase } from './supabase';
import type {
  PremiumStatus,
  PurchaseResult,
  PurchaseHistoryResult,
  PremiumPlan,
} from './types';

// Premium Plans
export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'day',
    name: '1 День',
    duration: '24 години',
    stars: 10,
    features: [
      'Преміум статус',
      'Без реклами',
      'Пріоритетна підтримка',
    ],
  },
  {
    id: 'week',
    name: '1 Тиждень',
    duration: '7 днів',
    stars: 50,
    features: [
      'Все з 1 дня',
      'Розширена аналітика',
      'Більше подій',
    ],
  },
  {
    id: 'month',
    name: '1 Місяць',
    duration: '30 днів',
    stars: 150,
    popular: true,
    features: [
      'Все з 1 тижня',
      'Необмежені події',
      'VIP підтримка',
    ],
  },
  {
    id: 'year',
    name: '1 Рік',
    duration: '365 днів',
    stars: 500,
    features: [
      'Все з 1 місяця',
      'Гарантована підтримка',
      'Ексклюзивні функції',
    ],
  },
];

// Get Premium Status
export async function getMyPremiumStatus(): Promise<PremiumStatus> {
  try {
    const { data, error } = await supabase.rpc('get_my_premium_status');

    if (error) {
      console.error('Get premium status error:', error);
      return { is_premium: false, started_at: null, expires_at: null };
    }

    return data as PremiumStatus;
  } catch (err) {
    console.error('Get premium status exception:', err);
    return { is_premium: false, started_at: null, expires_at: null };
  }
}

// Create Purchase Intent
export async function createPremiumPurchase(
  planId: string,
  starsAmount: number
): Promise<PurchaseResult> {
  try {
    const { data, error } = await supabase.rpc('create_premium_purchase', {
      p_plan_id: planId,
      p_stars_amount: starsAmount,
    });

    if (error) {
      console.error('Create purchase error:', error);
      return { success: false, error: error.message };
    }

    return data as PurchaseResult;
  } catch (err) {
    console.error('Create purchase exception:', err);
    return { success: false, error: 'Помилка створення покупки' };
  }
}

// Validate Purchase (after Telegram confirmation)
export async function validatePremiumPurchase(
  purchaseId: string,
  telegramPaymentId?: string
): Promise<{ success: boolean; error?: string; is_premium?: boolean }> {
  try {
    const { data, error } = await supabase.rpc('validate_premium_purchase', {
      p_purchase_id: purchaseId,
      p_telegram_payment_id: telegramPaymentId || null,
    });

    if (error) {
      console.error('Validate purchase error:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('Validate purchase exception:', err);
    return { success: false, error: 'Помилка валідації' };
  }
}

// Fail Purchase
export async function failPremiumPurchase(
  purchaseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('fail_premium_purchase', {
      p_purchase_id: purchaseId,
    });

    if (error) {
      console.error('Fail purchase error:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('Fail purchase exception:', err);
    return { success: false, error: 'Помилка' };
  }
}

// Get Purchase History
export async function getPurchaseHistory(): Promise<PurchaseHistoryResult> {
  try {
    const { data, error } = await supabase.rpc('get_my_purchase_history');

    if (error) {
      console.error('Get purchase history error:', error);
      return { success: false, error: error.message, purchases: [] };
    }

    return data as PurchaseHistoryResult;
  } catch (err) {
    console.error('Get purchase history exception:', err);
    return { success: false, error: 'Помилка завантаження', purchases: [] };
  }
}

// Telegram Stars Payment Integration
export async function initiateStarsPayment(
  plan: PremiumPlan
): Promise<{ success: boolean; error?: string; invoiceLink?: string }> {
  try {
    // Create purchase intent
    const purchaseResult = await createPremiumPurchase(plan.id, plan.stars);
    
    if (!purchaseResult.success || !purchaseResult.purchase_id) {
      return { success: false, error: purchaseResult.error };
    }

    // In a real implementation, you would create a Telegram invoice here
    // For now, we'll simulate the flow
    // Telegram.WebApp.createInvoiceLink({
    //   title: `LinkUp Premium - ${plan.name}`,
    //   description: `Підписка на ${plan.duration}`,
    //   payload: JSON.stringify({ purchase_id: purchaseResult.purchase_id, plan_id: plan.id }),
    //   provider_token: '', // Telegram Stars doesn't need provider token
    //   currency: 'XTR', // Telegram Stars currency
    //   prices: [{ label: plan.name, amount: plan.stars }],
    // });

    return {
      success: true,
      invoiceLink: `stars://payment?purchase_id=${purchaseResult.purchase_id}&plan=${plan.id}`,
    };
  } catch (err) {
    console.error('Initiate payment exception:', err);
    return { success: false, error: 'Помилка ініціалізації платежу' };
  }
}

// Format expiration date
export function formatExpirationDate(dateString: string | null): string {
  if (!dateString) return 'Немає';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format remaining time
export function formatRemainingTime(expiresAt: string | null): string {
  if (!expiresAt) return '';
  
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Минув';
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}д ${hours}год`;
  if (hours > 0) return `${hours}год ${minutes}хв`;
  return `${minutes}хв`;
}

// Subscribe to Premium Status Changes
export function subscribeToPremiumStatus(
  onChange: (status: PremiumStatus) => void
): () => void {
  const subscription = supabase
    .channel('premium-status')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'premium_status',
      },
      async () => {
        const status = await getMyPremiumStatus();
        onChange(status);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}