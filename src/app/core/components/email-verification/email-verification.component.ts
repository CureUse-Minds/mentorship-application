import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Auth, user } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <div class="mx-auto h-12 w-12 text-indigo-600">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Verify your email address to access your account
          </p>
        </div>

        <div class="mt-8 space-y-6">
          @if (message) {
            <div class="rounded-md p-4" 
                 [class]="messageType === 'success' ? 'bg-green-50 border border-green-200' : (messageType === 'error' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200')">
              <div class="text-sm" 
                   [class]="messageType === 'success' ? 'text-green-800' : (messageType === 'error' ? 'text-red-800' : 'text-blue-800')">
                {{ message }}
              </div>
            </div>
          }

          @if (messageType !== 'success') {
            <div class="space-y-4">
              <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h3 class="text-sm font-medium text-gray-900 mb-2">Verification Steps:</h3>
                <ol class="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the verification link in the email</li>
                  <li>Return to this page or click "I've verified my email"</li>
                </ol>
              </div>

              <button
                (click)="resendVerification()"
                [disabled]="isLoading"
                class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ isLoading ? 'Sending...' : 'Resend Verification Email' }}
              </button>

              <button
                (click)="checkVerification()"
                class="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                I've verified my email
              </button>

              <div class="text-center">
                <button
                  (click)="logout()"
                  class="text-sm text-indigo-600 hover:text-indigo-500">
                  Sign in with a different account
                </button>
              </div>
            </div>
          } @else {
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p class="text-sm text-gray-600">You will be automatically redirected to your dashboard.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private auth = inject(Auth);
  private authStateSubscription?: Subscription;

  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  isLoading = false;

  ngOnInit() {
    console.log('EmailVerificationComponent initialized');
    // Listen to auth state changes to automatically redirect when verified
    this.authStateSubscription = user(this.auth).subscribe(firebaseUser => {
      console.log('Auth state changed:', firebaseUser);
      if (firebaseUser) {
        console.log('User exists, checking verification status...');
        const isEmailVerified = firebaseUser.emailVerified || 
          firebaseUser.providerData.some(provider => provider.providerId === 'google.com');
        
        console.log('Email verified:', isEmailVerified);
        if (isEmailVerified) {
          this.message = '✅ Email verified successfully! You will be redirected to your dashboard shortly...';
          this.messageType = 'success';
          console.log('Email verified! Setting success message:', this.message);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 3000); // Give user time to see the success message
        } else {
          // Show initial message for unverified users
          this.message = '📧 Please check your email and click the verification link to continue.';
          this.messageType = 'info';
          console.log('Email not verified, showing info message');
        }
      } else {
        console.log('No user found, redirecting to login');
        // No user - redirect to login
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    this.authStateSubscription?.unsubscribe();
  }

  resendVerification() {
    this.isLoading = true;
    this.message = '';

    this.authService.resendEmailVerification().subscribe({
      next: (result) => {
        this.message = result.message;
        this.messageType = result.success ? 'success' : 'error';
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Failed to send verification email';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  checkVerification() {
    console.log('Checking verification status...');
    this.authService.refreshUser().subscribe({
      next: (isVerified) => {
        console.log('Verification check result:', isVerified);
        if (isVerified) {
          this.message = '🎉 Congratulations! Your email has been successfully verified. Redirecting to your dashboard...';
          this.messageType = 'success';
          console.log('Setting success message:', this.message, 'Type:', this.messageType);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 3000);
        } else {
          this.message = '⚠️ Email verification not detected. Please make sure you clicked the verification link in your email, then try again.';
          this.messageType = 'error';
          console.log('Setting error message:', this.message);
        }
      },
      error: () => {
        this.message = '❌ Error checking verification status. Please try again or contact support.';
        this.messageType = 'error';
        console.log('Error checking verification');
      }
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}