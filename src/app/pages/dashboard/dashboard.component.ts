import { ProfileService } from './../../core/services/profile.service';
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { catchError, of, switchMap, take } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  ngOnInit() {
    console.log('Dashboard component initialized');
    // get user from auth service, then fetch their profile to get the actual role
    this.authService.user$
      .pipe(
        take(1),
        switchMap((user) => {
          if (!user) {
            console.log('No user found, redirecting to login');
            this.router.navigate(['/login']);
            throw new Error('No user found');
          }
          console.log('User found:', user);
          // fetch the actual profile from Firestore to get the correct role
          return this.profileService.getProfile(user.id);
        })
      )
      .subscribe({
        next: (profile) => {
          console.log('Profile fetched:', profile);

          if (!profile) {
            console.log('No profile found,redirecting to log');
            this.router.navigate(['/login']);
            return;
          }

          // redirects based on the role from Firestore profile
          console.log('Redirecting based on role:', profile.role);
          switch (profile.role) {
            case 'mentor':
              this.router.navigate(['/mentor/dashboard']);
              break;
            case 'mentee':
              this.router.navigate(['/mentee/dashboard']);
              break;
            default:
              this.router.navigate(['/login']);
          }
        },
        error: (error) => {
          console.error('Error fetching profile:', error);
          this.router.navigate(['/login']);
        },
      });
  }
}
