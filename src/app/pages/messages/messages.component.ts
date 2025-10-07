import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-messages',
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Messages</h1>
        <p class="text-gray-600">Communicate with your mentor/mentee</p>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div class="text-gray-400 mb-4">
          <svg class="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Messaging System</h3>
        <p class="text-gray-500">This feature is coming soon. You'll be able to send and receive messages from your mentor or mentees here.</p>
      </div>
    </div>
  `
})
export class MessagesComponent {}