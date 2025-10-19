import { Timestamp } from '@angular/fire/firestore';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'mentor' | 'mentee';
  content: string;
  timestamp: Timestamp;
  isRead: boolean;
  readAt?: Timestamp;
  messageType: 'text' | 'image' | 'file' | 'assignment_link' | 'meeting_link';
  attachments?: MessageAttachment[];
  replyTo?: string; // ID of message being replied to
  editedAt?: Timestamp;
  isDeleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // in bytes
  url: string;
  uploadedAt: Timestamp;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  lastMessageAt?: Timestamp;
  unreadCount: { [userId: string]: number };
  isActive: boolean;
  conversationType: 'direct' | 'group';
  title?: string; // For group conversations
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ConversationParticipant {
  userId: string;
  userName: string;
  userRole: 'mentor' | 'mentee';
  avatar?: string;
  joinedAt: Timestamp;
  lastSeenAt?: Timestamp;
  isOnline: boolean;
  notificationSettings: {
    muted: boolean;
    muteUntil?: Timestamp;
  };
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: Timestamp;
  currentlyTyping?: {
    conversationId: string;
    startedAt: Timestamp;
  };
}

export interface ConversationSummary {
  id: string;
  title: string;
  participants: Pick<ConversationParticipant, 'userId' | 'userName' | 'userRole' | 'avatar'>[];
  lastMessage?: {
    content: string;
    timestamp: Timestamp;
    senderName: string;
    isRead: boolean;
  };
  unreadCount: number;
  isOnline: boolean; // At least one participant is online
  conversationType: 'direct' | 'group';
}

// DTOs for creating and updating messages
export interface CreateMessageDto {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'assignment_link' | 'meeting_link';
  attachments?: Omit<MessageAttachment, 'id' | 'uploadedAt'>[];
  replyTo?: string;
}

export interface CreateConversationDto {
  participantIds: string[];
  title?: string;
  description?: string;
  conversationType?: 'direct' | 'group';
  initialMessage?: string;
}

export interface UpdateMessageDto {
  content?: string;
  isRead?: boolean;
}

export interface MessageStats {
  totalConversations: number;
  activeConversations: number;
  totalUnreadMessages: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  averageResponseTime: number; // in minutes
  onlineParticipants: number;
}

// Real-time event types
export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Timestamp;
}

export interface MessageSeenEvent {
  conversationId: string;
  messageId: string;
  userId: string;
  seenAt: Timestamp;
}

// Search and filtering
export interface MessageSearchQuery {
  query?: string;
  conversationId?: string;
  senderId?: string;
  messageType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface ConversationFilter {
  hasUnread?: boolean;
  conversationType?: 'direct' | 'group';
  participantRole?: 'mentor' | 'mentee';
  isActive?: boolean;
  search?: string;
}