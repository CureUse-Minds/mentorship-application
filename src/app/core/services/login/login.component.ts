import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { LoginRequest } from '../../../shared/interfaces';

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
    if (this.loginForm.valid) {
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
            // navigation will be handled by AuthGuard automatically
            // just navigate to dashboard and let the guard handle verification check
            // Redirect based on user role or to dashboard
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage.set(response.message || 'Login failed');
            // If error is about email verification, show link to resend
            if (response.message?.includes('verify your email')) {
              this.showVerificationLink.set(true);
            }
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set('An error occurred during login');
          console.error('Login error:', error);
          this.isLoading.set(false);
        },
      });
    } else {
      this.markFormGroupTouched();
    }
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
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(response.message || 'Google sign-in failed');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Google sign-in failed');
        console.error('Google sign-in error:', error);
        this.isLoading.set(false);
      },
    });
  }
}
