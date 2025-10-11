import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/interfaces/user.interface';
import { ProfileService } from '../../../core/services/profile.service';
import { of, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  isOpen = signal(false);

  // Converts the user observable stream directly into a signal.
  // This signal will now hold the full user profile, including the role,
  private user$ = this.authService.user$.pipe(
    switchMap((user) => {
      if (!user) {
        return of(null);
      }
      return this.profileService.getProfile(user.id);
    })
  );

  currentUser = toSignal(this.user$, { initialValue: null });

  // --- Utility Functions (computed signals for better performance) ---

  // A computed signal that derives the user's initials.
  // It only recalculates when the currentUser signal changes.
  getUserInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return 'User';

    const firstName = user.firstName?.charAt(0).toUpperCase() || '';
    const lastName = user.lastName?.charAt(0).toUpperCase() || '';

    if (firstName && lastName) {
      return firstName + lastName;
    }
    if (firstName) {
      return firstName;
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  });

  getDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email || 'User';
  });

  toggleSidebar(): void {
    this.isOpen.update((value) => !value);
  }

  closeSidebar() {
    this.isOpen.set(false);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: (success) => {
        if (success) {
          this.router.navigate(['/login']);
        }
      },
      error: (error) => {
        console.error('Logout error:', error);
      },
    });
  }
}
