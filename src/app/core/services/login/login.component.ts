import { ProfileService } from './../profile.service';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { LoginRequest } from '../../../shared/interfaces';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  showVerificationLink = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get email() {
    return this.loginForm.get('email');
  }
  get password() {
    return this.loginForm.get('password');
  }

  onSubmit() {
    // Prevent double submission
    if (this.isLoading() || !this.loginForm.valid) {
      if (!this.loginForm.valid) {
        this.markFormGroupTouched();
      }
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.showVerificationLink.set(false);

    const loginData: LoginRequest = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
    };

    this.authService.login(loginData).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Login successful, waiting for auth state update');
          // Wait for auth state to update, then navigate
          this.authService.isAuthenticated$.pipe(
            filter((isAuth: boolean) => isAuth === true),
            take(1)
          ).subscribe(() => {
            console.log('Auth state updated, navigating to dashboard');
            this.isLoading.set(false);
            this.router.navigate(['/dashboard']);
          });

          // Fallback navigation after 2 seconds if auth state doesn't update
          setTimeout(() => {
            if (this.isLoading()) {
              console.log('Fallback navigation after timeout');
              this.isLoading.set(false);
              this.router.navigate(['/dashboard']);
            }
          }, 2000);
        } else {
          this.isLoading.set(false);
          this.errorMessage.set(response.message || 'Login failed');
          // If error is about email verification, show link to resend
          if (response.message?.includes('verify your email')) {
            this.showVerificationLink.set(true);
          }
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set('An error occurred during login');
        console.error('Login error:', error);
      },
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  goToVerification() {
    this.router.navigate(['/verify-email']);
  }

  onGoogleSignIn() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.signInWithGoogle().subscribe({
      next: (response) => {
        if (response.success && response.user) {
          console.log('Google signin successful');

          this.profileService.profileExists(response.user.id).subscribe({
            next: (exists) => {
              if (!exists) {
                console.log('creating profile for google user');
                const profileData = {
                  id: response.user!.id || '',
                  email: response.user!.email || '',
                  firstName: response.user!.firstName || '',
                  lastName: response.user!.lastName || '',
                  role: 'mentee' as const, // default for google signin
                  profilePicture: response.user!.profilePicture,
                };

                this.profileService.initializeProfile(profileData).subscribe({
                  next: () => {
                    console.log('profile created for google user');
                    this.router.navigate(['/dashboard']);
                  },
                  error: (error) => {
                    console.error('error profile', error);
                    this.router.navigate(['/dashboard']);
                  },
                });
              } else {
                console.log('profile exists, navigating to dashboard');
                this.router.navigate(['/dashboard']);
              }
              this.isLoading.set(false);
            },
            error: (error) => {
              console.error('error checking profile', error);
              this.router.navigate(['/dashboard']);
              this.isLoading.set(false);
            },
          });
        } else {
          this.errorMessage.set(response.message || 'Google sign-in failed');
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        this.errorMessage.set('Google sign-in failed');
        console.error('Google sign-in error:', error);
        this.isLoading.set(false);
      },
    });
  }
}
