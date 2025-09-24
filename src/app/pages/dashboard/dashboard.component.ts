import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../shared/interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
                @if (currentUser) {
                  <p class="text-gray-600 mt-1">
                    Welcome back, {{ currentUser.firstName }}!
                  </p>
                }
              </div>
              <div class="flex items-center space-x-4">
                @if (currentUser?.profilePicture) {
                  <div class="h-10 w-10 rounded-full overflow-hidden">
                    <img [src]="currentUser?.profilePicture" [alt]="currentUser?.firstName || 'User'" class="h-full w-full object-cover">
                  </div>
                }
                <button 
                  (click)="onLogout()"
                  [disabled]="isLoggingOut"
                  class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
                  @if (isLoggingOut) {
                    Logging out...
                  } @else {
                    Logout
                  }
                </button>
              </div>
            </div>
            
            @if (currentUser) {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-blue-50 p-4 rounded-lg">
                  <h3 class="text-lg font-medium text-blue-900 mb-2">Profile</h3>
                  <p class="text-blue-700">Email: {{ currentUser.email }}</p>
                  <p class="text-blue-700">Role: {{ currentUser.role | titlecase }}</p>
                </div>
                
                <div class="bg-green-50 p-4 rounded-lg">
                  <h3 class="text-lg font-medium text-green-900 mb-2">Status</h3>
                  <p class="text-green-700">Account Active</p>
                  <p class="text-green-700">Authenticated via {{ authMethod }}</p>
                </div>
                
                <div class="bg-purple-50 p-4 rounded-lg">
                  <h3 class="text-lg font-medium text-purple-900 mb-2">Next Steps</h3>
                  <p class="text-purple-700">Complete your profile</p>
                  <p class="text-purple-700">Find mentors/mentees</p>
                </div>
              </div>
            } @else {
              <div class="text-center py-8">
                <div class="text-gray-500">Loading user information...</div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  currentUser: User | null = null;
  isLoggingOut = false;
  authMethod = 'Firebase';

  ngOnInit() {
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }

  onLogout() {
    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: (success: boolean) => {
        if (success) {
          this.router.navigate(['/login']);
        }
        this.isLoggingOut = false;
      },
      error: (error: any) => {
        console.error('Logout error:', error);
        this.isLoggingOut = false;
      }
    });
  }
}