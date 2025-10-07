import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Auth, user } from '@angular/fire/auth';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-email-verification',
  imports: [CommonModule, RouterModule],
  templateUrl: './email-verification.component.html',
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private verificationSubscription?: Subscription;

  message = signal('');
  messageType = signal<'success' | 'error' | 'info'>('info');
  isLoading = signal(false);
  checking = signal(false);

  ngOnInit() {
    // listen to email verification
    this.verificationSubscription = this.authService.isEmailVerified$
      .pipe(filter((isVerified) => isVerified === true))
      .subscribe(() => {
        // email has been verified
        this.message.set('Email verified successfully! Redirecting to your dashboard...');
        this.messageType.set('success');

        // redirect to dashboard
        this.router.navigate(['/dashboard']);
      });

    // set initial message
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.message.set('Please check your email and click the verification link to continue.');
        this.messageType.set('info');
      } else {
        // no user - redirect to login
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.verificationSubscription?.unsubscribe();
  }

  resendVerification() {
    this.isLoading.set(true);
    this.message.set('');

    this.authService.resendEmailVerification().subscribe({
      next: (result) => {
        this.message.set(result.message);
        this.messageType.set(result.success ? 'success' : 'error');
        this.isLoading.set(false);
      },
      error: () => {
        this.message.set('Failed to send verification email');
        this.messageType.set('error');
        this.isLoading.set(false);
      },
    });
  }

  checkVerification() {
    this.checking.set(true);

    this.authService.checkEmailVerification().subscribe({
      next: (result) => {
        if (result.verified) {
          this.message.set(
            'Congratulations! Your email has been verified successfully. Redirecting you to dashboard'
          );
          this.messageType.set('success');

          this.router.navigate(['/dashboard']);
        } else {
          this.message.set(
            'Email verification not detected. Please make sure you clicked the verificaiton link in your email, then try again.'
          );
          this.messageType.set('error');
        }
        this.checking.set(false);
      },
      error: () => {
        this.message.set('error checking verificaiton status. please try again or contact support');
        this.messageType.set('error');
        this.checking.set(false);
      },
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
    });
  }

  // private auth = inject(Auth);
  // private authStateSubscription?: Subscription;

  // message = '';
  // messageType: 'success' | 'error' | 'info' = 'info';
  // isLoading = false;

  // ngOnInit() {
  //   console.log('EmailVerificationComponent initialized');
  //   // Listen to auth state changes to automatically redirect when verified
  //   this.authStateSubscription = user(this.auth).subscribe((firebaseUser) => {
  //     console.log('Auth state changed:', firebaseUser);
  //     if (firebaseUser) {
  //       console.log('User exists, checking verification status...');
  //       const isEmailVerified =
  //         firebaseUser.emailVerified ||
  //         firebaseUser.providerData.some((provider) => provider.providerId === 'google.com');

  //       console.log('Email verified:', isEmailVerified);
  //       if (isEmailVerified) {
  //         this.message =
  //           '✅ Email verified successfully! You will be redirected to your dashboard shortly...';
  //         this.messageType = 'success';
  //         console.log('Email verified! Setting success message:', this.message);
  //         setTimeout(() => {
  //           this.router.navigate(['/dashboard']);
  //         }, 3000); // Give user time to see the success message
  //       } else {
  //         // Show initial message for unverified users
  //         this.message = '📧 Please check your email and click the verification link to continue.';
  //         this.messageType = 'info';
  //         console.log('Email not verified, showing info message');
  //       }
  //     } else {
  //       console.log('No user found, redirecting to login');
  //       // No user - redirect to login
  //       this.router.navigate(['/login']);
  //     }
  //   });
  // }

  // ngOnDestroy() {
  //   this.authStateSubscription?.unsubscribe();
  // }

  // resendVerification() {
  //   this.isLoading = true;
  //   this.message = '';

  //   this.authService.resendEmailVerification().subscribe({
  //     next: (result) => {
  //       this.message = result.message;
  //       this.messageType = result.success ? 'success' : 'error';
  //       this.isLoading = false;
  //     },
  //     error: () => {
  //       this.message = 'Failed to send verification email';
  //       this.messageType = 'error';
  //       this.isLoading = false;
  //     },
  //   });
  // }

  // checkVerification() {
  //   console.log('Checking verification status...');
  //   this.authService.refreshUser().subscribe({
  //     next: (isVerified) => {
  //       console.log('Verification check result:', isVerified);
  //       if (isVerified) {
  //         this.message =
  //           '🎉 Congratulations! Your email has been successfully verified. Redirecting to your dashboard...';
  //         this.messageType = 'success';
  //         console.log('Setting success message:', this.message, 'Type:', this.messageType);
  //         setTimeout(() => {
  //           this.router.navigate(['/dashboard']);
  //         }, 3000);
  //       } else {
  //         this.message =
  //           '⚠️ Email verification not detected. Please make sure you clicked the verification link in your email, then try again.';
  //         this.messageType = 'error';
  //         console.log('Setting error message:', this.message);
  //       }
  //     },
  //     error: () => {
  //       this.message =
  //         '❌ Error checking verification status. Please try again or contact support.';
  //       this.messageType = 'error';
  //       console.log('Error checking verification');
  //     },
  //   });
  // }

  // logout() {
  //   this.authService.logout().subscribe({
  //     next: () => {
  //       this.router.navigate(['/login']);
  //     },
  //   });
  // }
}
