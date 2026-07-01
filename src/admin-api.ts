// Admin Panel API Functions
import { supabase } from './supabase';
import type {
  AdminUser,
  AdminStatsResult,
  AdminUsersResult,
  AdminEventsResult,
  AdminReportsResult,
  AdminChatsResult,
  AuditLogResult,
} from './types';

// Check if current user is admin
export async function checkAdminAccess(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) throw error;
    return data as boolean;
  } catch {
    return false;
  }
}

// Get admin dashboard stats
export async function getAdminStats(): Promise<AdminStatsResult> {
  try {
    const { data, error } = await supabase.rpc('get_admin_stats');
    if (error) throw error;
    return data as AdminStatsResult;
  } catch (err) {
    console.error('Get admin stats error:', err);
    return { 
      success: false, 
      error: 'Помилка завантаження статистики',
      stats: {
        total_users: 0,
        total_events: 0,
        total_premium: 0,
        pending_reports: 0,
        suspended_users: 0,
        banned_users: 0,
        total_messages: 0,
        daily_active_users: 0,
        events_this_week: 0,
        new_users_today: 0,
      }
    };
  }
}

// Get users list
export async function getAdminUsers(
  search?: string,
  status?: 'active' | 'suspended' | 'banned',
  limit = 50,
  offset = 0
): Promise<AdminUsersResult> {
  try {
    const { data, error } = await supabase.rpc('admin_get_users', {
      p_search: search || null,
      p_status: status || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data as AdminUsersResult;
  } catch (err) {
    console.error('Get admin users error:', err);
    return { success: false, error: 'Помилка завантаження користувачів', users: [], total: 0 };
  }
}

// Get user details
export async function getAdminUser(userId: string): Promise<{ success: boolean; error?: string; user?: AdminUser & { statistics: object; recent_events: object[]; reports: number } }> {
  try {
    const { data, error } = await supabase.rpc('admin_get_user', { p_user_id: userId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Get admin user error:', err);
    return { success: false, error: 'Помилка завантаження користувача' };
  }
}

// Suspend user
export async function suspendUser(
  userId: string,
  reason: string,
  until?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_suspend_user', {
      p_user_id: userId,
      p_reason: reason,
      p_until: until || null,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Suspend user error:', err);
    return { success: false, error: 'Помилка призупинення користувача' };
  }
}

// Unsuspend user
export async function unsuspendUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_unsuspend_user', { p_user_id: userId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Unsuspend user error:', err);
    return { success: false, error: 'Помилка відновлення користувача' };
  }
}

// Ban user
export async function banUser(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_ban_user', {
      p_user_id: userId,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Ban user error:', err);
    return { success: false, error: 'Помилка блокування користувача' };
  }
}

// Unban user
export async function unbanUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_unban_user', { p_user_id: userId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Unban user error:', err);
    return { success: false, error: 'Помилка розблокування користувача' };
  }
}

// Get events list
export async function getAdminEvents(
  search?: string,
  status?: 'active' | 'cancelled' | 'hidden',
  limit = 50,
  offset = 0
): Promise<AdminEventsResult> {
  try {
    const { data, error } = await supabase.rpc('admin_get_events', {
      p_search: search || null,
      p_status: status || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data as AdminEventsResult;
  } catch (err) {
    console.error('Get admin events error:', err);
    return { success: false, error: 'Помилка завантаження подій', events: [], total: 0 };
  }
}

// Get event details
export async function getAdminEvent(eventId: string): Promise<{ success: boolean; error?: string; event?: object }> {
  try {
    const { data, error } = await supabase.rpc('admin_get_event', { p_event_id: eventId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Get admin event error:', err);
    return { success: false, error: 'Помилка завантаження події' };
  }
}

// Hide event
export async function hideEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_hide_event', { p_event_id: eventId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Hide event error:', err);
    return { success: false, error: 'Помилка приховування події' };
  }
}

// Unhide event
export async function unhideEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_unhide_event', { p_event_id: eventId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Unhide event error:', err);
    return { success: false, error: 'Помилка показу події' };
  }
}

// Delete event
export async function deleteEvent(
  eventId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_delete_event', {
      p_event_id: eventId,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Delete event error:', err);
    return { success: false, error: 'Помилка видалення події' };
  }
}

// Get reports
export async function getReports(
  type: 'user' | 'event' = 'user',
  status: 'pending' | 'resolved' | 'rejected' = 'pending',
  limit = 50,
  offset = 0
): Promise<AdminReportsResult> {
  try {
    const { data, error } = await supabase.rpc('admin_get_reports', {
      p_type: type,
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data as AdminReportsResult;
  } catch (err) {
    console.error('Get reports error:', err);
    return { success: false, error: 'Помилка завантаження скарг', reports: [], total: 0 };
  }
}

// Resolve report
export async function resolveReport(
  reportId: string,
  type: 'user' | 'event',
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_resolve_report', {
      p_report_id: reportId,
      p_type: type,
      p_notes: notes,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Resolve report error:', err);
    return { success: false, error: 'Помилка вирішення скарги' };
  }
}

// Reject report
export async function rejectReport(
  reportId: string,
  type: 'user' | 'event',
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_reject_report', {
      p_report_id: reportId,
      p_type: type,
      p_notes: notes,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Reject report error:', err);
    return { success: false, error: 'Помилка відхилення скарги' };
  }
}

// Get chats
export async function getAdminChats(
  search?: string,
  limit = 50,
  offset = 0
): Promise<AdminChatsResult> {
  try {
    const { data, error } = await supabase.rpc('admin_get_chats', {
      p_search: search || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data as AdminChatsResult;
  } catch (err) {
    console.error('Get admin chats error:', err);
    return { success: false, error: 'Помилка завантаження чатів', chats: [], total: 0 };
  }
}

// Get chat messages
export async function getChatMessages(
  chatId: string,
  limit = 100,
  offset = 0
): Promise<{ success: boolean; error?: string; messages: object[] }> {
  try {
    const { data, error } = await supabase.rpc('admin_get_chat_messages', {
      p_chat_id: chatId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Get chat messages error:', err);
    return { success: false, error: 'Помилка завантаження повідомлень', messages: [] };
  }
}

// Get premium users
export async function getPremiumUsers(
  status: 'active' | 'expired' = 'active',
  limit = 50,
  offset = 0
): Promise<{ success: boolean; error?: string; users: object[]; total: number }> {
  try {
    const { data, error } = await supabase.rpc('admin_get_premium_users', {
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Get premium users error:', err);
    return { success: false, error: 'Помилка завантаження', users: [], total: 0 };
  }
}

// Get audit log
export async function getAuditLog(
  action?: string,
  targetType?: string,
  limit = 100,
  offset = 0
): Promise<AuditLogResult> {
  try {
    const { data, error } = await supabase.rpc('admin_get_audit_log', {
      p_action: action || null,
      p_target_type: targetType || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data as AuditLogResult;
  } catch (err) {
    console.error('Get audit log error:', err);
    return { success: false, error: 'Помилка завантаження логу', logs: [], total: 0 };
  }
}

// Format number helper
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format date helper
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get initials helper
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}