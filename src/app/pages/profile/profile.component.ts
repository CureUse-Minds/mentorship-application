import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Profile</h1>
        <p class="text-gray-600">Manage your profile information</p>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div class="text-gray-400 mb-4">
          <svg class="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Profile Management</h3>
        <p class="text-gray-500">This feature is coming soon. You'll be able to edit your profile information and preferences here.</p>
      </div>
    </div>
  `
})
export class ProfileComponent {}