import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

interface SimpleMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  isOwn: boolean;
}

interface SimpleConversation {
  id: string;
  title: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: Date;
  isOnline: boolean;
}

@Component({
  selector: 'app-messages',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="h-screen flex bg-gray-50">
      <!-- Conversations Sidebar -->
      <div class="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-xl font-semibold text-gray-900">Messages</h1>
            <button 
              (click)="showNewConversationModal = true"
              class="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors">
              <i class="fas fa-plus mr-1"></i>New Chat
            </button>
          </div>
          
          <!-- Search -->
          <input
            type="text"
            placeholder="Search conversations..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            [(ngModel)]="searchTerm"
            (input)="filterConversations()">
        </div>

        <!-- Conversations List -->
        <div class="flex-1 overflow-y-auto">
          <div *ngIf="filteredConversations().length === 0" class="p-4 text-center text-gray-500">
            <div class="text-gray-400 mb-2">
              <i class="fas fa-comments text-2xl"></i>
            </div>
            <p class="text-sm">No conversations found</p>
            <button 
              (click)="showNewConversationModal = true"
              class="mt-2 text-blue-600 hover:text-blue-700 text-sm">
              Start your first conversation
            </button>
          </div>
          
          <div 
            *ngFor="let conversation of filteredConversations()"
            (click)="selectConversation(conversation)"
            class="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
            [class]="activeConversation()?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''">
            
            <div class="flex items-center space-x-3">
              <!-- Avatar -->
              <div class="relative">
                <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                  {{ getInitials(conversation.title) }}
                </div>
                <!-- Online indicator -->
                <div *ngIf="conversation.isOnline" 
                     class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-medium text-gray-900 truncate">{{ conversation.title }}</h3>
                  <div class="flex items-center space-x-1">
                    <span class="text-xs text-gray-500">{{ formatTime(conversation.timestamp) }}</span>
                    <span *ngIf="conversation.unreadCount > 0" 
                          class="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {{ conversation.unreadCount }}
                    </span>
                  </div>
                </div>
                
                <p class="text-sm text-gray-600 truncate">{{ conversation.lastMessage }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 flex flex-col">
        <!-- No conversation selected -->
        <div *ngIf="!activeConversation()" class="flex-1 flex items-center justify-center bg-gray-50">
          <div class="text-center">
            <div class="text-gray-400 mb-4">
              <i class="fas fa-comments text-6xl"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
            <p class="text-gray-600 mb-4">Choose a conversation from the sidebar to start messaging</p>
            <button 
              (click)="showNewConversationModal = true"
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Start New Conversation
            </button>
          </div>
        </div>

        <!-- Active conversation -->
        <div *ngIf="activeConversation()" class="flex-1 flex flex-col">
          <!-- Chat Header -->
          <div class="bg-white border-b border-gray-200 p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {{ getInitials(activeConversation()!.title) }}
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">{{ activeConversation()!.title }}</h2>
                  <p class="text-sm text-gray-600">
                    <span *ngIf="activeConversation()!.isOnline" class="text-green-600">● Online</span>
                    <span *ngIf="!activeConversation()!.isOnline" class="text-gray-500">● Offline</span>
                  </p>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <button class="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
                  <i class="fas fa-phone"></i>
                </button>
                <button class="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
                  <i class="fas fa-video"></i>
                </button>
                <button class="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
                  <i class="fas fa-info-circle"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Messages Area -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            <div *ngIf="currentMessages().length === 0" class="text-center text-gray-500 py-8">
              <i class="fas fa-comments text-3xl mb-2"></i>
              <p>No messages yet. Start the conversation!</p>
            </div>

            <div *ngFor="let message of currentMessages()" 
                 class="flex"
                 [class]="message.isOwn ? 'justify-end' : 'justify-start'">
              
              <div class="max-w-xs lg:max-w-md">
                <!-- Message bubble -->
                <div class="px-4 py-2 rounded-lg"
                     [class]="message.isOwn ? 
                       'bg-blue-600 text-white' : 
                       'bg-white text-gray-900 border border-gray-200'">
                  <p class="text-sm">{{ message.content }}</p>
                </div>
                
                <!-- Message metadata -->
                <div class="mt-1 text-xs text-gray-500"
                     [class]="message.isOwn ? 'text-right' : 'text-left'">
                  <span>{{ message.senderName }}</span>
                  <span class="mx-1">•</span>
                  <span>{{ formatTime(message.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Message Input -->
          <div class="bg-white border-t border-gray-200 p-4">
            <form [formGroup]="messageForm" (ngSubmit)="sendMessage()" class="flex items-end space-x-3">
              <div class="flex-1">
                <textarea
                  formControlName="content"
                  placeholder="Type your message..."
                  rows="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  (keydown)="onMessageKeyDown($event)"
                  style="max-height: 100px; min-height: 38px;"></textarea>
              </div>
              
              <div class="flex items-center space-x-2">
                <button type="button" class="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
                  <i class="fas fa-paperclip"></i>
                </button>
                <button type="button" class="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
                  <i class="fas fa-smile"></i>
                </button>
                <button 
                  type="submit" 
                  [disabled]="!messageForm.valid"
                  class="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                  <i class="fas fa-paper-plane"></i>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- New Conversation Modal -->
    <div *ngIf="showNewConversationModal" 
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">Start New Conversation</h3>
        
        <form [formGroup]="newConversationForm" (ngSubmit)="createNewConversation()">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Select Contact</label>
              <select formControlName="contactName" 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="" disabled>Choose a contact...</option>
                <option *ngFor="let contact of availableContacts" [value]="contact">
                  {{ contact }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Initial Message (Optional)</label>
              <textarea 
                formControlName="initialMessage"
                placeholder="Start the conversation..."
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 mt-6">
            <button 
              type="button" 
              (click)="showNewConversationModal = false"
              class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button 
              type="submit" 
              [disabled]="!newConversationForm.valid"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              Start Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    textarea {
      resize: vertical;
      field-sizing: content;
    }
  `]
})
export class MessagesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);

  // Signals
  conversations = signal<SimpleConversation[]>([]);
  filteredConversations = signal<SimpleConversation[]>([]);
  activeConversation = signal<SimpleConversation | null>(null);
  messages = signal<SimpleMessage[]>([]);

  // Component state
  searchTerm = '';
  showNewConversationModal = false;
  currentUserId = 'current-user';
  
  availableContacts = [
    'Dr. Sarah Wilson (Mentor)',
    'Prof. Michael Chen (Mentor)', 
    'Alexandra Rodriguez (Mentee)',
    'James Thompson (Mentee)'
  ];

  // Sample data
  sampleConversations: SimpleConversation[] = [
    {
      id: '1',
      title: 'Dr. Sarah Wilson',
      lastMessage: 'Great work on the latest assignment! Keep it up.',
      unreadCount: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      isOnline: true
    },
    {
      id: '2', 
      title: 'Prof. Michael Chen',
      lastMessage: 'Let\'s schedule a meeting to discuss your research progress.',
      unreadCount: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      isOnline: false
    },
    {
      id: '3',
      title: 'Alexandra Rodriguez', 
      lastMessage: 'Thank you for the guidance on the project!',
      unreadCount: 1,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      isOnline: true
    }
  ];

  sampleMessages: { [conversationId: string]: SimpleMessage[] } = {
    '1': [
      {
        id: '1',
        content: 'Hi Dr. Wilson! I have a question about the assignment.',
        senderId: 'current-user',
        senderName: 'You',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        isOwn: true
      },
      {
        id: '2', 
        content: 'Of course! What would you like to know?',
        senderId: 'dr-wilson',
        senderName: 'Dr. Sarah Wilson',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        isOwn: false
      },
      {
        id: '3',
        content: 'I\'m having trouble with the data analysis section.',
        senderId: 'current-user', 
        senderName: 'You',
        timestamp: new Date(Date.now() - 1000 * 60 * 40),
        isOwn: true
      },
      {
        id: '4',
        content: 'Great work on the latest assignment! Keep it up.',
        senderId: 'dr-wilson',
        senderName: 'Dr. Sarah Wilson', 
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        isOwn: false
      }
    ],
    '2': [
      {
        id: '5',
        content: 'Hello Professor! How are you?',
        senderId: 'current-user',
        senderName: 'You',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
        isOwn: true
      },
      {
        id: '6',
        content: 'Let\'s schedule a meeting to discuss your research progress.',
        senderId: 'prof-chen',
        senderName: 'Prof. Michael Chen',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        isOwn: false
      }
    ],
    '3': [
      {
        id: '7',
        content: 'Thank you for the guidance on the project!',
        senderId: 'alexandra',
        senderName: 'Alexandra Rodriguez',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        isOwn: false
      }
    ]
  };

  // Forms
  messageForm = this.fb.group({
    content: ['', [Validators.required, Validators.minLength(1)]]
  });

  newConversationForm = this.fb.group({
    contactName: ['', Validators.required],
    initialMessage: ['']
  });

  ngOnInit(): void {
    this.conversations.set(this.sampleConversations);
    this.filteredConversations.set(this.sampleConversations);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Event handlers
  selectConversation(conversation: SimpleConversation): void {
    this.activeConversation.set(conversation);
    // Mark as read
    conversation.unreadCount = 0;
    this.conversations.update(convs => [...convs]);
  }

  sendMessage(): void {
    if (!this.messageForm.valid || !this.activeConversation()) return;

    const content = this.messageForm.get('content')?.value || '';
    const activeConv = this.activeConversation()!;
    
    const newMessage: SimpleMessage = {
      id: Date.now().toString(),
      content,
      senderId: this.currentUserId,
      senderName: 'You',
      timestamp: new Date(),
      isOwn: true
    };

    // Add message to conversation
    if (!this.sampleMessages[activeConv.id]) {
      this.sampleMessages[activeConv.id] = [];
    }
    this.sampleMessages[activeConv.id].push(newMessage);

    // Update conversation last message
    activeConv.lastMessage = content;
    activeConv.timestamp = new Date();

    this.messageForm.reset();
    this.conversations.update(convs => [...convs]);
  }

  createNewConversation(): void {
    if (!this.newConversationForm.valid) return;

    const formValue = this.newConversationForm.value;
    const contactName = formValue.contactName || '';
    const initialMessage = formValue.initialMessage || '';

    const newConversation: SimpleConversation = {
      id: Date.now().toString(),
      title: contactName,
      lastMessage: initialMessage || 'Conversation started',
      unreadCount: 0,
      timestamp: new Date(),
      isOnline: Math.random() > 0.5
    };

    // Add initial message if provided
    if (initialMessage) {
      this.sampleMessages[newConversation.id] = [{
        id: Date.now().toString(),
        content: initialMessage,
        senderId: this.currentUserId,
        senderName: 'You',
        timestamp: new Date(),
        isOwn: true
      }];
    }

    this.conversations.update(convs => [newConversation, ...convs]);
    this.filterConversations();
    this.showNewConversationModal = false;
    this.newConversationForm.reset();
    
    // Select the new conversation
    this.selectConversation(newConversation);
  }

  onMessageKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  filterConversations(): void {
    const term = this.searchTerm.toLowerCase();
    if (!term.trim()) {
      this.filteredConversations.set(this.conversations());
      return;
    }

    const filtered = this.conversations().filter(conv => 
      conv.title.toLowerCase().includes(term) ||
      conv.lastMessage.toLowerCase().includes(term)
    );
    this.filteredConversations.set(filtered);
  }

  currentMessages(): SimpleMessage[] {
    const activeConv = this.activeConversation();
    if (!activeConv) return [];
    return this.sampleMessages[activeConv.id] || [];
  }

  // Utility methods
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    
    return timestamp.toLocaleDateString();
  }
}