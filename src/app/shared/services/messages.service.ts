import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, from, of, combineLatest, map, switchMap, take } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  getDocs
} from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';

// Simple interfaces for messages
interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  isRead: boolean;
}

interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageTimestamp: Date;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
}

interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
  private conversationsSubject = new BehaviorSubject<ConversationSummary[]>([]);
  private activeConversationSubject = new BehaviorSubject<Conversation | null>(null);
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  
  conversations$ = this.conversationsSubject.asObservable();
  activeConversation$ = this.activeConversationSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();
  
  private currentUserId: string | null = null;
  private conversationsListener?: () => void;
  private messagesListener?: () => void;

  // Helper function to safely convert Firestore timestamp to Date
  private toDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return new Date();
  }

  constructor() {
    // Initialize when user is authenticated
    this.authService.user$.subscribe(user => {
      if (user && user.id) {
        this.currentUserId = user.id;
        this.initializeListeners();
      } else {
        this.cleanup();
      }
    });
  }

  private initializeListeners(): void {
    if (!this.currentUserId) return;

    this.setupConversationsListener();
  }

  private setupConversationsListener(): void {
    if (!this.currentUserId) return;

    const conversationsRef = collection(this.firestore, 'conversations');
    const q = query(
      conversationsRef,
      where('participantIds', 'array-contains', this.currentUserId),
      orderBy('lastMessageTimestamp', 'desc')
    );

    this.conversationsListener = onSnapshot(q, (snapshot) => {
      const conversations: ConversationSummary[] = snapshot.docs.map(doc => {
        const data = doc.data() as Conversation;
        const otherParticipantName = data.participantNames.find(name => 
          data.participantIds[data.participantNames.indexOf(name)] !== this.currentUserId
        ) || 'Unknown User';
        
        return {
          id: doc.id,
          title: otherParticipantName,
          lastMessage: data.lastMessage || 'No messages yet',
          timestamp: this.toDate(data.lastMessageTimestamp) || this.toDate(data.createdAt) || new Date(),
          unreadCount: data.unreadCount?.[this.currentUserId!] || 0,
          isOnline: false // We'll implement presence later
        };
      });
      
      this.conversationsSubject.next(conversations);
    }, (error) => {
      console.error('Error listening to conversations:', error);
    });
  }

  private setupMessagesListener(conversationId: string): void {
    if (this.messagesListener) {
      this.messagesListener();
    }

    const messagesRef = collection(this.firestore, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    this.messagesListener = onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          conversationId: data['conversationId'],
          content: data['content'],
          senderId: data['senderId'],
          senderName: data['senderName'],
          timestamp: this.toDate(data['timestamp']),
          isRead: data['isRead'] || false
        } as Message;
      });
      
      this.messagesSubject.next(messages);
    }, (error) => {
      console.error('Error listening to messages:', error);
    });
  }

  async sendMessage(conversationId: string, content: string): Promise<void> {
    if (!this.currentUserId || !content.trim()) {
      throw new Error('Invalid message data');
    }

    try {
      // Get current user info
      const currentUser = await this.authService.user$.pipe(take(1)).toPromise();

      if (!currentUser) {
        throw new Error('Could not get user profile');
      }

      const messagesRef = collection(this.firestore, 'messages');
      await addDoc(messagesRef, {
        conversationId,
        content: content.trim(),
        senderId: this.currentUserId,
        senderName: currentUser.firstName + ' ' + currentUser.lastName,
        timestamp: serverTimestamp(),
        isRead: false
      });

      // Update conversation's last message
      const conversationRef = doc(this.firestore, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: content.trim(),
        lastMessageTimestamp: serverTimestamp()
      });

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async createConversation(otherUserId: string, otherUserName: string): Promise<string> {
    if (!this.currentUserId) {
      throw new Error('No authenticated user');
    }

    try {
      // Check if conversation already exists
      const existingConversation = await this.findExistingConversation(otherUserId);
      if (existingConversation) {
        return existingConversation.id;
      }

      // Get current user info
      const currentUser = await this.authService.user$.pipe(take(1)).toPromise();

      if (!currentUser) {
        throw new Error('Could not get user profile');
      }

      const conversationsRef = collection(this.firestore, 'conversations');
      const docRef = await addDoc(conversationsRef, {
        participantIds: [this.currentUserId, otherUserId],
        participantNames: [currentUser.firstName + ' ' + currentUser.lastName, otherUserName],
        lastMessage: '',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: {
          [this.currentUserId]: 0,
          [otherUserId]: 0
        },
        createdAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  private async findExistingConversation(otherUserId: string): Promise<{id: string} | null> {
    if (!this.currentUserId) return null;

    try {
      const conversationsRef = collection(this.firestore, 'conversations');
      const q = query(
        conversationsRef,
        where('participantIds', 'array-contains', this.currentUserId)
      );

      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const data = doc.data() as Conversation;
        if (data.participantIds.includes(otherUserId)) {
          return { id: doc.id };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding existing conversation:', error);
      return null;
    }
  }

  setActiveConversation(conversationId: string): void {
    // First get the conversation details
    const conversationRef = doc(this.firestore, 'conversations', conversationId);
    from(getDocs(query(collection(this.firestore, 'conversations'), where('__name__', '==', conversationId))))
      .subscribe(snapshot => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as Conversation;
          this.activeConversationSubject.next({
            ...data,
            id: conversationId,
            lastMessageTimestamp: this.toDate(data.lastMessageTimestamp),
            createdAt: this.toDate(data.createdAt)
          });
          
          // Setup messages listener for this conversation
          this.setupMessagesListener(conversationId);
          
          // Mark messages as read
          this.markMessagesAsRead(conversationId);
        }
      });
  }

  private async markMessagesAsRead(conversationId: string): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const messagesRef = collection(this.firestore, 'messages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        where('senderId', '!=', this.currentUserId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      
      // Update each unread message
      const batch = snapshot.docs.map(messageDoc => 
        updateDoc(doc(this.firestore, 'messages', messageDoc.id), { isRead: true })
      );

      await Promise.all(batch);

      // Reset unread count for this user in the conversation
      const conversationRef = doc(this.firestore, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`unreadCount.${this.currentUserId}`]: 0
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  async getAvailableUsers(): Promise<any[]> {
    // This is a mock implementation - you'll need to integrate with your user service
    // For now, return some sample users
    return [
      { id: 'user1', name: 'John Doe', role: 'mentor' },
      { id: 'user2', name: 'Jane Smith', role: 'mentee' },
      { id: 'user3', name: 'Mike Johnson', role: 'mentor' }
    ].filter(user => user.id !== this.currentUserId);
  }

  getTotalUnreadCount(): Observable<number> {
    return this.conversations$.pipe(
      map(conversations => 
        conversations.reduce((total, conv) => total + conv.unreadCount, 0)
      )
    );
  }

  private cleanup(): void {
    this.currentUserId = null;
    
    if (this.conversationsListener) {
      this.conversationsListener();
      this.conversationsListener = undefined;
    }
    
    if (this.messagesListener) {
      this.messagesListener();
      this.messagesListener = undefined;
    }

    this.conversationsSubject.next([]);
    this.activeConversationSubject.next(null);
    this.messagesSubject.next([]);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}