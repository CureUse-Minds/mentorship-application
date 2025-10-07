import { ProfileService } from './../profile.service';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { RegisterRequest } from '../../../shared/interfaces';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  registerForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');

  constructor() {
    this.registerForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        role: ['mentee', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  // Custom validator for password confirmation
  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmPassword?.errors?.['passwordMismatch']) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }

    return null;
  }

  get firstName() {
    return this.registerForm.get('firstName');
  }
  get lastName() {
    return this.registerForm.get('lastName');
  }
  get email() {
    return this.registerForm.get('email');
  }
  get password() {
    return this.registerForm.get('password');
  }
  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
  get role() {
    return this.registerForm.get('role');
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const registerData: RegisterRequest = {
        firstName: this.registerForm.value.firstName,
        lastName: this.registerForm.value.lastName,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        confirmPassword: this.registerForm.value.confirmPassword,
        role: this.registerForm.value.role,
      };

      this.authService.register(registerData).subscribe({
        next: (response) => {
          if (response.success && response.user) {
            // after successful registration, create the Firestore profile
            const profileData = {
              id: response.user.id,
              email: response.user.email,
              firstName: response.user.firstName,
              lastName: response.user.lastName,
              role: response.user.role,
            };

            // Initialize profile in Firestore with the selected role
            this.profileService.initializeProfile(profileData).subscribe({
              next: () => {
                console.log('Profile initialized with role:', response.user?.role);
                // redirect to verification page after successful registration
                this.router.navigate(['/verify-email']);
              },
              error: (error) => {
                console.log('Error initializing profile:', error);
                // still redirect to verification even if profile creation fails
                this.router.navigate(['/verify-email']);
              },
            });
          } else {
            this.errorMessage.set(response.message || 'Registration failed');
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set('An error occurred during registration');
          console.error('Registration error:', error);
          this.isLoading.set(false);
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach((key) => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  onGoogleSignUp() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.signInWithGoogle().subscribe({
      next: (response) => {
        if (response.success && response.user) {
          // check if profile exists, if not create one
          this.profileService.profileExists(response.user.id).subscribe({
            next: (exists) => {
              if (!exists) {
                // profile doesnt exist, create it with default mentee role
                // user can change role later in settings if needed (kung kaya pa ng powers ang settings shinanegan)
                const profileData = {
                  id: response.user!.id,
                  email: response.user!.email,
                  firstName: response.user!.firstName,
                  lastName: response.user!.lastName,
                  role: 'mentee' as const, //default for google sign-up
                  profilePicture: response.user!.profilePicture,
                };

                this.profileService.initializeProfile(profileData).subscribe({
                  next: () => {
                    console.log('Google profile initialized');
                    this.router.navigate(['/dashboard']);
                  },
                  error: (error) => {
                    console.error('Error initializing profile', error);
                    this.router.navigate(['/dashboard']);
                  },
                });
              } else {
                // Redirect to dashboard after successful Google sign-up
                this.router.navigate(['/dashboard']);
              }
            },
          });
        } else {
          this.errorMessage.set(response.message || 'Google sign-up failed');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Google sign-up failed');
        console.error('Google sign-up error:', error);
        this.isLoading.set(false);
      },
    });
  }
}
