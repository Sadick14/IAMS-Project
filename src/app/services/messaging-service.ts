// In-system messaging service
// Covers STU-18, ACS-12, IDS-07, DLO-12, DLO-24

import { getState } from "../lib/store";

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Thread {
  id: string;
  participantIds: string[];
  participantNames: string[];
  subject: string;
  context?: string; // e.g., "Application: John Doe" or "Student: CS/2023/001"
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
}

// In-memory message store (mock)
let messages: Message[] = [];

let threads: Thread[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }
export function subscribeMessages(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get threads for a user.
 */
export function getThreadsForUser(userId: string): Thread[] {
  return threads.filter((t) => t.participantIds.includes(userId));
}

/**
 * Get messages in a thread.
 */
export function getMessagesInThread(threadId: string): Message[] {
  return messages.filter((m) => m.threadId === threadId);
}

/**
 * Get total unread count for a user.
 */
export function getUnreadMessageCount(userId: string): number {
  return messages.filter((m) => m.recipientId === userId && !m.read).length;
}

/**
 * Send a message in an existing thread.
 */
export function sendMessage(
  threadId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  recipientId: string,
  recipientName: string,
  content: string
): { success: boolean; message: string } {
  const msg: Message = {
    id: `msg-${Date.now()}`,
    threadId,
    senderId,
    senderName,
    senderRole,
    recipientId,
    recipientName,
    content,
    timestamp: new Date().toISOString(),
    read: false,
  };
  messages = [...messages, msg];

  threads = threads.map((t) =>
    t.id === threadId
      ? { ...t, lastMessage: content, lastTimestamp: msg.timestamp, unreadCount: t.unreadCount + 1 }
      : t
  );

  notify();
  return { success: true, message: "Message sent." };
}

/**
 * Create a new thread.
 */
export function createThread(
  participantIds: string[],
  participantNames: string[],
  subject: string,
  context: string,
  firstMessage: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  recipientId: string,
  recipientName: string
): { success: boolean; threadId: string } {
  const threadId = `thr-${Date.now()}`;
  const thread: Thread = {
    id: threadId,
    participantIds,
    participantNames,
    subject,
    context,
    lastMessage: firstMessage,
    lastTimestamp: new Date().toISOString(),
    unreadCount: 1,
  };
  threads = [...threads, thread];

  const msg: Message = {
    id: `msg-${Date.now()}`,
    threadId,
    senderId,
    senderName,
    senderRole,
    recipientId,
    recipientName,
    content: firstMessage,
    timestamp: new Date().toISOString(),
    read: false,
  };
  messages = [...messages, msg];

  notify();
  return { success: true, threadId };
}

/**
 * Mark thread messages as read for a user.
 */
export function markThreadRead(threadId: string, userId: string): void {
  messages = messages.map((m) =>
    m.threadId === threadId && m.recipientId === userId ? { ...m, read: true } : m
  );
  threads = threads.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t));
  notify();
}
