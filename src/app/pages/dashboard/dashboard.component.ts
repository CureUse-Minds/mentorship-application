import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../shared/interfaces';
import { take } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser: User | null = null;
  isLoggingOut = signal(false);
  authMethod = 'Firebase';

  ngOnInit() {
    // this will redirect user based on their role
    this.authService.user$.pipe(take(1)).subscribe((user) => {
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      switch (user.role) {
        case 'mentor':
          this.router.navigate(['/mentor/dashboard']);
          break;
        case 'mentee':
          this.router.navigate(['/mentee/dashboard']);
          break;
        default:
          this.router.navigate(['/login']);
      }
    });
  }

  onLogout() {
    this.isLoggingOut.set(true);
    this.authService.logout().subscribe({
      next: (success: boolean) => {
        if (success) {
          this.router.navigate(['/login']);
        }
        this.isLoggingOut.set(false);
      },
      error: (error: any) => {
        console.error('Logout error:', error);
        this.isLoggingOut.set(false);
      },
    });
  }
}
