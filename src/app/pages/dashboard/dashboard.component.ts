import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../shared/interfaces';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser: User | null = null;
  isLoggingOut = false;
  authMethod = 'Firebase';

  ngOnInit() {
    this.authService.user$.subscribe((user: User | null) => {
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
      },
    });
  }
}
