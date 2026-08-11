/**
 * Messaging primitives — delivery, read receipts, typing, unread, pagination.
 * Pure helpers; persistence stays in store / postgres adapters.
 */

export const MESSAGE_STATUSES = Object.freeze(['sending', 'sent', 'delivered', 'read', 'failed']);

export function createMessageRecord({
  id, conversationId, userId, text, createdAt = new Date().toISOString(), clientId = null,
  mediaId = null, attachment = null
} = {}) {
  return {
    id,
    conversationId,
    userId,
    text,
    createdAt,
    editedAt: null,
    clientId: clientId || null,
    mediaId: mediaId || null,
    attachment: attachment || null,
    status: 'sent',
    deliveredAt: null,
    readBy: {},
    failedReason: null
  };
}

export function markDelivered(message, userId, at = new Date().toISOString()) {
  if (!message || message.userId === userId) return message;
  if (message.status === 'read') return message;
  message.status = 'delivered';
  message.deliveredAt = message.deliveredAt || at;
  return message;
}

export function markRead(message, userId, at = new Date().toISOString()) {
  if (!message || message.userId === userId) return message;
  message.readBy = message.readBy || {};
  message.readBy[userId] = at;
  message.status = 'read';
  return message;
}

export function markConversationRead(messages, conversationId, userId, at = new Date().toISOString()) {
  let count = 0;
  for (const m of messages) {
    if (m.conversationId !== conversationId) continue;
    if (m.userId === userId) continue;
    if (m.readBy?.[userId]) continue;
    markRead(m, userId, at);
    count += 1;
  }
  return count;
}

export function unreadCountForUser(messages, conversationId, userId) {
  return messages.filter(m =>
    m.conversationId === conversationId
    && m.userId !== userId
    && !(m.readBy && m.readBy[userId])
  ).length;
}

/** Cursor pagination: before = exclusive createdAt/id boundary, newest-last page. */
export function paginateMessages(messages, conversationId, { before = null, limit = 50 } = {}) {
  const lim = Math.max(1, Math.min(200, Number(limit) || 50));
  let list = messages
    .filter(m => m.conversationId === conversationId)
    .slice()
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)));
  if (before) {
    list = list.filter(m => `${m.createdAt}:${m.id}` < before);
  }
  const page = list.slice(-lim);
  const nextBefore = page.length ? `${page[0].createdAt}:${page[0].id}` : null;
  const hasMore = list.length > page.length;
  return { messages: page, nextBefore: hasMore ? nextBefore : null, hasMore };
}

export function typingEvent({ conversationId, userId, username, typing = true } = {}) {
  return {
    type: 'typing',
    conversationId,
    userId,
    username: username || 'user',
    typing: !!typing,
    at: new Date().toISOString()
  };
}

export function enrichConversation(conversation, messages, userId) {
  const unread = unreadCountForUser(messages, conversation.id, userId);
  const last = [...messages].reverse().find(m => m.conversationId === conversation.id) || null;
  return { ...conversation, unread, lastMessage: last };
}
