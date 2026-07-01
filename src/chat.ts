// Chat Screen Component
import { telegramAuth } from './telegram-auth';
import {
  sendMessage,
  getChatMessages,
  markMessagesRead,
  subscribeToMessages,
  subscribeToMessageUpdates,
  subscribeToChatArchive,
  subscribeToTyping,
  broadcastTyping,
  formatMessageTime,
  formatTimer,
} from './chat-api';
import type { Message, ChatListItem } from './types';

export interface ChatCallbacks {
  onBack?: () => void;
  onArchived?: () => void;
}

interface ChatState {
  chat: ChatListItem | null;
  messages: Message[];
  typingUsers: Set<string>;
  isLoading: boolean;
  isArchived: boolean;
  currentUserId: string | null;
}

let state: ChatState = {
  chat: null,
  messages: [],
  typingUsers: new Set(),
  isLoading: false,
  isArchived: false,
  currentUserId: null,
};

let callbacks: ChatCallbacks = {};
let unsubscribers: (() => void)[] = [];
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;

export async function renderChatScreen(
  container: HTMLElement,
  chat: ChatListItem,
  currentUserId: string,
  cb?: ChatCallbacks
): Promise<void> {
  callbacks = cb || {};
  state = {
    chat,
    messages: [],
    typingUsers: new Set(),
    isLoading: true,
    isArchived: false,
    currentUserId,
  };

  // Cleanup previous subscriptions
  cleanup();

  renderLoadingState(container);
  injectChatStyles();

  // Load messages
  const result = await getChatMessages(chat.id);
  if (result.success) {
    state.messages = result.messages.reverse();
  }
  state.isLoading = false;

  // Mark as read
  await markMessagesRead(chat.id);

  // Setup subscriptions
  setupSubscriptions(chat.id, currentUserId);

  // Start timer
  startTimer(chat.expires_at);

  renderChatUI(container);
}

function renderLoadingState(container: HTMLElement): void {
  container.innerHTML = `
    <div class="chat-screen">
      <div class="chat-loading">
        <div class="spinner"></div>
      </div>
    </div>
  `;
}

function renderChatUI(container: HTMLElement): void {
  const chat = state.chat;
  if (!chat) return;

  const isExpired = new Date(chat.expires_at) < new Date();

  container.innerHTML = `
    <div class="chat-screen">
      <!-- Header -->
      <header class="chat-header">
        <button class="back-btn" id="chat-back-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div class="chat-info">
          <span class="chat-name">${escapeHtml(chat.name)}</span>
          <div class="chat-timer" id="chat-timer">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <span id="timer-display">${formatTimer(chat.expires_at)}</span>
          </div>
        </div>
        <button class="menu-btn" id="chat-menu-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </header>

      ${state.isArchived ? `
        <div class="archived-banner">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
          </svg>
          <span>Чат архівовано</span>
        </div>
      ` : ''}

      <!-- Messages -->
      <div class="messages-container" id="messages-container">
        ${renderMessages()}
      </div>

      <!-- Typing Indicator -->
      <div class="typing-indicator ${state.typingUsers.size > 0 ? 'visible' : ''}" id="typing-indicator">
        <span>${escapeHtml(Array.from(state.typingUsers).join(', '))} пише...</span>
      </div>

      ${!state.isArchived && !isExpired ? `
        <!-- Input Area -->
        <div class="chat-input-area">
          <button class="attach-btn" id="attach-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          </button>
          <div class="input-wrapper">
            <input
              type="text"
              class="message-input"
              id="message-input"
              placeholder="Повідомлення..."
              maxlength="1000"
              autocomplete="off"
            >
          </div>
          <button class="send-btn" id="send-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      ` : `
        <div class="chat-input-area disabled">
          <span class="expired-message">Чат закінчився</span>
        </div>
      `}
    </div>
  `;

  attachChatListeners();
  scrollToBottom(container);
}

function renderMessages(): string {
  if (state.messages.length === 0) {
    return `
      <div class="empty-messages">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
        <span>Повідомлень ще немає</span>
        <span class="sub">Напишіть першим!</span>
      </div>
    `;
  }

  // Group messages by date
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  state.messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msgDate, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  });

  return groups.map(group => `
    <div class="message-date-group">
      <div class="date-divider">
        <span>${formatDateHeader(group.date)}</span>
      </div>
      ${group.messages.map(msg => renderSingleMessage(msg)).join('')}
    </div>
  `).join('');
}

function renderSingleMessage(msg: Message): string {
  const isOwn = msg.sender_id === state.currentUserId;
  const isSystem = msg.message_type === 'system';
  const isImage = msg.message_type === 'image';

  if (isSystem) {
    return `
      <div class="message system-message">
        <span>${escapeHtml(msg.content)}</span>
      </div>
    `;
  }

  const avatar = msg.sender?.avatar_url
    ? `<img src="${msg.sender.avatar_url}" alt="" class="msg-avatar">`
    : `<div class="msg-avatar-placeholder">${(msg.sender?.first_name || msg.sender?.username || 'U')[0]}</div>`;

  const readIcon = msg.is_read && isOwn
    ? `<svg class="read-receipt" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        <path d="M9 11.17L4.83 7 3.41 8.41 9 14l10.59-10.6L18.17 2z"/>
       </svg>`
    : '';

  return `
    <div class="message ${isOwn ? 'own' : 'other'}">
      ${!isOwn ? avatar : ''}
      <div class="message-content">
        <div class="message-bubble ${isImage ? 'image-bubble' : ''}">
          ${isImage && msg.metadata?.url
            ? `<img src="${msg.metadata.url as string}" alt="" class="message-image">`
            : `<span>${escapeHtml(msg.content)}</span>`
          }
        </div>
        <div class="message-meta">
          <span class="message-time">${formatMessageTime(msg.created_at)}</span>
          ${readIcon}
        </div>
      </div>
    </div>
  `;
}

function attachChatListeners(): void {
  // Back button
  document.getElementById('chat-back-btn')?.addEventListener('click', () => {
    cleanup();
    callbacks.onBack?.();
  });

  // Send button
  document.getElementById('send-btn')?.addEventListener('click', () => {
    sendChatMessage();
  });

  // Input enter key
  const input = document.getElementById('message-input') as HTMLInputElement;
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Typing indicator
  input?.addEventListener('input', () => {
    broadcastTyping(state.chat!.id, state.currentUserId!, true);
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    typingTimeout = setTimeout(() => {
      broadcastTyping(state.chat!.id, state.currentUserId!, false);
    }, 2000);
  });

  // Scroll to load more
  const messagesContainer = document.getElementById('messages-container');
  messagesContainer?.addEventListener('scroll', () => {
    if (messagesContainer.scrollTop === 0 && state.messages.length > 0) {
      loadMoreMessages();
    }
  });
}

async function sendChatMessage(): Promise<void> {
  const input = document.getElementById('message-input') as HTMLInputElement;
  const content = input?.value.trim();

  if (!content || !state.chat) return;

  // Clear input
  input.value = '';
  input.focus();

  // Stop typing
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  broadcastTyping(state.chat.id, state.currentUserId!, false);

  // Optimistically add message
  const tempMessage: Message = {
    id: `temp-${Date.now()}`,
    chat_id: state.chat.id,
    sender_id: state.currentUserId!,
    content,
    message_type: 'text',
    metadata: {},
    is_read: false,
    read_by: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    sender: undefined,
  };

  state.messages.push(tempMessage);
  renderMessagesUI();

  // Send to server
  const result = await sendMessage(state.chat.id, content);
  
  if (result.success && result.message) {
    // Replace temp message with real one
    const index = state.messages.findIndex(m => m.id === tempMessage.id);
    if (index !== -1) {
      state.messages[index] = result.message;
      renderMessagesUI();
    }
  } else {
    telegramAuth.hapticNotification('error');
    telegramAuth.showAlert(result.error || 'Помилка відправки');
  }
}

async function loadMoreMessages(): Promise<void> {
  if (!state.chat || state.messages.length === 0) return;

  const oldestMessage = state.messages[0];
  const result = await getChatMessages(state.chat.id, oldestMessage.created_at);
  
  if (result.success && result.messages.length > 0) {
    state.messages = [...result.messages.reverse(), ...state.messages];
    renderMessagesUI();
  }
}

function renderMessagesUI(): void {
  const container = document.getElementById('messages-container');
  if (container) {
    const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    container.innerHTML = renderMessages();
    if (wasAtBottom) {
      scrollToBottom(document.querySelector('.chat-screen') as HTMLElement);
    }
  }
}

function scrollToBottom(container: HTMLElement): void {
  const messagesContainer = container?.querySelector('.messages-container');
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function setupSubscriptions(chatId: string, userId: string): void {
  // New messages
  const unsubMessages = subscribeToMessages(chatId, (message) => {
    // Avoid duplicates
    if (!state.messages.find(m => m.id === message.id)) {
      state.messages.push(message);
      renderMessagesUI();
      
      // Mark as read if from another user
      if (message.sender_id !== userId) {
        markMessagesRead(chatId, message.id);
      }
      
      telegramAuth.hapticFeedback('light');
      scrollToBottom(document.querySelector('.chat-screen') as HTMLElement);
    }
  });
  unsubscribers.push(unsubMessages);

  // Message updates (read status)
  const unsubUpdates = subscribeToMessageUpdates(chatId, (message) => {
    const index = state.messages.findIndex(m => m.id === message.id);
    if (index !== -1) {
      state.messages[index] = message;
      renderMessagesUI();
    }
  });
  unsubscribers.push(unsubUpdates);

  // Chat archive
  const unsubArchive = subscribeToChatArchive(chatId, () => {
    state.isArchived = true;
    telegramAuth.showAlert('Чат архівовано');
    const container = document.querySelector('.chat-screen');
    if (container) {
      const banner = container.querySelector('.archived-banner') || createArchivedBanner();
      if (!container.querySelector('.archived-banner')) {
        container.insertBefore(banner, container.querySelector('.messages-container'));
      }
    }
    callbacks.onArchived?.();
  });
  unsubscribers.push(unsubArchive);

  // Typing status
  const unsubTyping = subscribeToTyping(chatId, (typingUserId, isTyping) => {
    if (typingUserId !== userId) {
      if (isTyping) {
        state.typingUsers.add(typingUserId);
      } else {
        state.typingUsers.delete(typingUserId);
      }
      updateTypingIndicator();
    }
  });
  unsubscribers.push(unsubTyping);
}

function startTimer(expiresAt: string): void {
  const updateTimer = () => {
    const display = document.getElementById('timer-display');
    if (display) {
      const time = formatTimer(expiresAt);
      display.textContent = time;
      
      if (time === '00:00:00') {
        state.isArchived = true;
        if (timerInterval) {
          clearInterval(timerInterval);
        }
      }
    }
  };

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTypingIndicator(): void {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    if (state.typingUsers.size > 0) {
      indicator.classList.add('visible');
      indicator.querySelector('span')!.textContent = 'пише...';
    } else {
      indicator.classList.remove('visible');
    }
  }
}

function createArchivedBanner(): HTMLElement {
  const banner = document.createElement('div');
  banner.className = 'archived-banner';
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
    </svg>
    <span>Чат архівовано</span>
  `;
  return banner;
}

export function cleanup(): void {
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }
}

// Helper functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return 'Сьогодні';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчора';
  }
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

// Inject styles
function injectChatStyles(): void {
  if (document.getElementById('chat-styles')) return;

  const style = document.createElement('style');
  style.id = 'chat-styles';
  style.textContent = `
    .chat-screen {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
    }

    .chat-loading {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--bg-tertiary);
      border-top-color: var(--accent-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .back-btn, .menu-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .back-btn svg, .menu-btn svg {
      width: 24px;
      height: 24px;
    }

    .chat-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .chat-name {
      font-size: 16px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-timer {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--warning);
    }

    .chat-timer svg {
      width: 14px;
      height: 14px;
    }

    .archived-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: var(--warning);
      color: white;
      font-size: 13px;
      font-weight: 500;
    }

    .archived-banner svg {
      width: 18px;
      height: 18px;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      padding-bottom: 8px;
    }

    .empty-messages {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary);
      gap: 8px;
    }

    .empty-messages svg {
      width: 64px;
      height: 64px;
      opacity: 0.3;
    }

    .empty-messages .sub {
      font-size: 13px;
      opacity: 0.7;
    }

    .message-date-group {
      margin-bottom: 16px;
    }

    .date-divider {
      text-align: center;
      margin: 16px 0;
    }

    .date-divider span {
      padding: 4px 12px;
      background: var(--bg-tertiary);
      border-radius: 12px;
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .message {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      animation: messageAppear 0.2s ease-out;
    }

    @keyframes messageAppear {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message.own {
      flex-direction: row-reverse;
    }

    .message.system-message {
      justify-content: center;
      margin: 16px 0;
    }

    .message.system-message span {
      padding: 6px 12px;
      background: var(--bg-tertiary);
      border-radius: 12px;
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .msg-avatar, .msg-avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .msg-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .msg-avatar-placeholder {
      background: var(--bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .message-content {
      max-width: 75%;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .message.own .message-content {
      align-items: flex-end;
    }

    .message-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .message.other .message-bubble {
      background: var(--bg-secondary);
      border-bottom-left-radius: 4px;
    }

    .message.own .message-bubble {
      background: var(--accent-primary);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message-bubble.image-bubble {
      padding: 4px;
      background: transparent;
    }

    .message-image {
      max-width: 200px;
      border-radius: 12px;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 4px;
    }

    .message-time {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .read-receipt {
      width: 16px;
      height: 16px;
      color: var(--accent-primary);
    }

    .typing-indicator {
      padding: 8px 16px;
      font-size: 13px;
      color: var(--text-tertiary);
      height: 0;
      overflow: hidden;
      transition: height 0.2s;
    }

    .typing-indicator.visible {
      height: auto;
    }

    .chat-input-area {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
    }

    .chat-input-area.disabled {
      justify-content: center;
    }

    .expired-message {
      color: var(--text-tertiary);
      font-size: 14px;
    }

    .attach-btn, .send-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .attach-btn {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .send-btn {
      background: var(--accent-gradient);
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .send-btn:hover {
      transform: scale(1.05);
    }

    .send-btn:active {
      transform: scale(0.95);
    }

    .attach-btn svg, .send-btn svg {
      width: 22px;
      height: 22px;
    }

    .input-wrapper {
      flex: 1;
    }

    .message-input {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 22px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      font-size: 15px;
    }

    .message-input:focus {
      outline: none;
    }

    .message-input::placeholder {
      color: var(--text-tertiary);
    }
  `;
  document.head.appendChild(style);
}

export { cleanup as cleanupChat };
