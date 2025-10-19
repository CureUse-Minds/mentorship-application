import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { RoleSwitchingService } from '../../core/services/role-switching.service';
import { User, UserRole } from '../../shared/interfaces';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
        <p class="text-gray-600">Configure your application preferences</p>
      </div>
      
      <!-- Role Settings Card -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Role Management</h3>
          <p class="text-gray-600 text-sm">Switch between mentor and mentee roles</p>
        </div>

        @if (currentUser()) {
          <div class="space-y-4">
            <!-- Current Role Display -->
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="text-sm font-medium text-gray-900">Current Role</p>
                <p class="text-xs text-gray-600">{{ currentRole() === 'mentor' ? 'Mentor (providing mentorship)' : 'Mentee (seeking mentorship)' }}</p>
              </div>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" 
                    [class]="currentRole() === 'mentor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
                {{ currentRole() | titlecase }}
              </span>
            </div>

            <!-- Role Switch Section -->
            <div class="border-t pt-4">
              <h4 class="text-sm font-medium text-gray-900 mb-2">Switch Role</h4>
              <div class="flex items-center space-x-4">
                <select [(ngModel)]="selectedRole" 
                        class="block w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="mentee">Mentee (seeking mentorship)</option>
                  <option value="mentor">Mentor (providing mentorship)</option>
                </select>
                <button (click)="showConfirmation = true" 
                        [disabled]="isLoading() || selectedRole === currentRole()"
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Switching...
                  } @else {
                    Switch Role
                  }
                </button>
              </div>
              @if (selectedRole !== currentRole()) {
                <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p class="text-xs font-medium text-blue-800 mb-2">Features you'll get as {{ selectedRole | titlecase }}:</p>
                  <ul class="text-xs text-blue-700 space-y-1">
                    @for (feature of getRoleFeatures(selectedRole); track feature) {
                      <li class="flex items-start">
                        <span class="text-blue-500 mr-1">•</span>
                        {{ feature }}
                      </li>
                    }
                  </ul>
                  <p class="text-xs text-amber-600 mt-2">
                    ⚠️ Switching roles will redirect you to the appropriate dashboard
                  </p>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Confirmation Modal -->
      @if (showConfirmation) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div class="relative p-6 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
              <div class="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 text-center mb-2">Confirm Role Switch</h3>
              <p class="text-sm text-gray-500 text-center mb-4">
                Are you sure you want to switch from <strong>{{ currentRole() }}</strong> to <strong>{{ selectedRole }}</strong>?
              </p>
              <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p class="text-xs text-yellow-800">
                  <strong>Note:</strong> You'll be redirected to the {{ selectedRole }} dashboard. Your profile data will be preserved.
                </p>
              </div>
              <div class="flex space-x-3">
                <button (click)="confirmRoleSwitch()" 
                        [disabled]="isLoading()"
                        class="flex-1 inline-flex justify-center items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Switching...
                  } @else {
                    Confirm Switch
                  }
                </button>
                <button (click)="showConfirmation = false" 
                        [disabled]="isLoading()"
                        class="flex-1 inline-flex justify-center items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Error Message -->
      @if (errorMessage()) {
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-600">{{ errorMessage() }}</p>
        </div>
      }

      <!-- Success Message -->
      @if (successMessage()) {
        <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p class="text-sm text-green-600">{{ successMessage() }}</p>
        </div>
      }

      <!-- Additional Settings Placeholder -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div class="text-gray-400 mb-4">
          <svg class="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Additional Settings</h3>
        <p class="text-gray-500">More configuration options coming soon. Notifications, privacy settings, and more.</p>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private roleSwitchingService = inject(RoleSwitchingService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  currentRole = signal<UserRole | null>(null);
  selectedRole: UserRole = 'mentee';
  showConfirmation = false;
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit() {
    this.loadUserData();
  }

  private loadUserData() {
    this.authService.user$.subscribe(user => {
      this.currentUser.set(user);
      if (user) {
        this.roleSwitchingService.getCurrentRole().subscribe(role => {
          this.currentRole.set(role);
          this.selectedRole = role || 'mentee';
        });
      }
    });
  }

  confirmRoleSwitch() {
    const currentRole = this.currentRole();
    
    if (!this.selectedRole || !currentRole || this.selectedRole === currentRole) {
      return;
    }

    // Check if role switch is allowed
    if (!this.roleSwitchingService.canSwitchRole(currentRole, this.selectedRole)) {
      this.errorMessage.set('Role switching not allowed between these roles.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.roleSwitchingService.switchRole(this.selectedRole).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        this.showConfirmation = false;
        
        if (result.success) {
          this.successMessage.set(result.message);
          this.currentRole.set(result.newRole || this.selectedRole);
          
          // Navigation is handled by the service
          // Just show success message here
        } else {
          this.errorMessage.set(result.message);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.showConfirmation = false;
        this.errorMessage.set('Failed to switch role. Please try again.');
        console.error('Role switch error:', error);
      }
    });
  }

  getRoleFeatures(role: UserRole): string[] {
    return this.roleSwitchingService.getRoleFeatures(role);
  }
}