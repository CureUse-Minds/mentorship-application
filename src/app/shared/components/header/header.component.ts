import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../interfaces';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private userSubscription!: Subscription;

  currentUser = signal<User | null>(null);

  isAuthenticated = computed(() => this.currentUser() !== null);

  userName = computed(() => {
    const user = this.currentUser();
    return user ? user.firstName : 'Guest';
  });

  constructor() {}

  ngOnInit(): void {
    this.userSubscription = this.authService.user$.subscribe((user) => this.currentUser.set(user));
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  logout(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }

    this.currentUser.set(null);

    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      },
    });
  }
}
