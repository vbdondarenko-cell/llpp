// Chat API Functions
import { supabase } from './supabase';
import type {
  ChatResult,
  MessageResult,
  MessagesResult,
  ChatsResult,
  MembersResult,
  Message,
  MessageType,
} from './types';

// Create or get chat for event
export async function createOrGetChat(
  eventId: string,
  name?: string,
  durationHours = 6
): Promise<ChatResult> {
  try {
    const { data, error } = await supabase.rpc('create_chat', {
      p_event_id: eventId,
      p_name: name,
      p_duration_hours: durationHours,
    });

    if (error) {
      console.error('Create chat error:', error);
      return { success: false, error: error.message };
    }

    return data as ChatResult;
  } catch (err) {
    console.error('Create chat exception:', err);
    return { success: false, error: 'Помилка створення чату' };
  }
}

// Add member to chat
export async function addChatMember(
  chatId: string,
  userId: string,
  role: 'organizer' | 'member' = 'member'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('add_chat_member', {
      p_chat_id: chatId,
      p_user_id: userId,
      p_role: role,
    });

    if (error) {
      console.error('Add member error:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('Add member exception:', err);
    return { success: false, error: 'Помилка додавання' };
  }
}

// Send message
export async function sendMessage(
  chatId: string,
  content: string,
  messageType: MessageType = 'text',
  metadata: Record<string, unknown> = {}
): Promise<MessageResult> {
  try {
    const { data, error } = await supabase.rpc('send_message', {
      p_chat_id: chatId,
      p_content: content,
      p_message_type: messageType,
      p_metadata: metadata,
    });

    if (error) {
      console.error('Send message error:', error);
      return { success: false, error: error.message };
    }

    return data as MessageResult;
  } catch (err) {
    console.error('Send message exception:', err);
    return { success: false, error: 'Помилка відправки' };
  }
}

// Mark messages as read
export async function markMessagesRead(
  chatId: string,
  messageId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('mark_messages_read', {
      p_chat_id: chatId,
      p_message_id: messageId || null,
    });

    if (error) {
      console.error('Mark read error:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('Mark read exception:', err);
    return { success: false, error: 'Помилка' };
  }
}

// Get chat messages
export async function getChatMessages(
  chatId: string,
  before?: string,
  limit = 50
): Promise<MessagesResult> {
  try {
    const { data, error } = await supabase.rpc('get_chat_messages', {
      p_chat_id: chatId,
      p_before: before || null,
      p_limit: limit,
    });

    if (error) {
      console.error('Get messages error:', error);
      return { success: false, error: error.message, messages: [] };
    }

    return data as MessagesResult;
  } catch (err) {
    console.error('Get messages exception:', err);
    return { success: false, error: 'Помилка завантаження', messages: [] };
  }
}

// Get user's chats
export async function getMyChats(): Promise<ChatsResult> {
  try {
    const { data, error } = await supabase.rpc('get_my_chats');

    if (error) {
      console.error('Get chats error:', error);
      return { success: false, error: error.message, chats: [] };
    }

    return data as ChatsResult;
  } catch (err) {
    console.error('Get chats exception:', err);
    return { success: false, error: 'Помилка завантаження', chats: [] };
  }
}

// Archive chat
export async function archiveChat(
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('archive_chat', {
      p_chat_id: chatId,
    });

    if (error) {
      console.error('Archive chat error:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('Archive chat exception:', err);
    return { success: false, error: 'Помилка архівації' };
  }
}

// Delete chat
export async function deleteChat(
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('delete_chat', {
      p_chat_id: chatId,
    });

    if (error) {
      console.error('Delete chat error:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('Delete chat exception:', err);
    return { success: false, error: 'Помилка видалення' };
  }
}

// Get chat members
export async function getChatMembers(
  chatId: string
): Promise<MembersResult> {
  try {
    const { data, error } = await supabase.rpc('get_chat_members', {
      p_chat_id: chatId,
    });

    if (error) {
      console.error('Get members error:', error);
      return { success: false, error: error.message, members: [] };
    }

    return data as MembersResult;
  } catch (err) {
    console.error('Get members exception:', err);
    return { success: false, error: 'Помилка завантаження', members: [] };
  }
}

// Subscribe to new messages (Realtime)
export function subscribeToMessages(
  chatId: string,
  onNewMessage: (message: Message) => void
): () => void {
  const subscription = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      async (payload) => {
        // Get full message with sender info
        const msg = payload.new as Message;
        if (!msg.sender) {
          const { data } = await supabase
            .from('profiles')
            .select('id, username, first_name, avatar_url')
            .eq('user_id', msg.sender_id)
            .single();
          
          if (data) {
            msg.sender = data;
          }
        }
        onNewMessage(msg);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// Subscribe to message updates (read status)
export function subscribeToMessageUpdates(
  chatId: string,
  onUpdate: (message: Message) => void
): () => void {
  const subscription = supabase
    .channel(`messages-update:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onUpdate(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// Subscribe to chat archive
export function subscribeToChatArchive(
  chatId: string,
  onArchive: () => void
): () => void {
  const subscription = supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chats',
        filter: `id=eq.${chatId}`,
      },
      (payload) => {
        const chat = payload.new as { archived_at: string | null; is_active: boolean };
        if (chat.archived_at || !chat.is_active) {
          onArchive();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// Subscribe to member changes
export function subscribeToMemberChanges(
  chatId: string,
  onChange: () => void
): () => void {
  const subscription = supabase
    .channel(`members:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_members',
        filter: `chat_id=eq.${chatId}`,
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// Broadcast typing status
export function broadcastTyping(
  chatId: string,
  userId: string,
  isTyping: boolean
): void {
  const channel = supabase.channel(`typing:${chatId}`);
  
  if (isTyping) {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId },
    });
  } else {
    channel.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { user_id: userId },
    });
  }
}

// Subscribe to typing status
export function subscribeToTyping(
  chatId: string,
  onTyping: (userId: string, isTyping: boolean) => void
): () => void {
  const channel = supabase.channel(`typing:${chatId}`);
  
  channel
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      onTyping(payload.user_id, true);
    })
    .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
      onTyping(payload.user_id, false);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Format message time
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  }
  
  if (diffDays === 0 && diffHours < 24) {
    return `Вчора ${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  if (diffDays < 7) {
    return date.toLocaleDateString('uk-UA', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

// Format chat timer
export function formatTimer(expiresAt: string): string {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  
  if (diffMs <= 0) return '00:00:00';
  
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Get total unread count
export async function getTotalUnreadCount(): Promise<number> {
  const result = await getMyChats();
  if (!result.success) return 0;
  
  return result.chats.reduce((total, chat) => total + chat.unread_count, 0);
}
