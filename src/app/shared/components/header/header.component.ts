import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services';
import { User } from '../../interfaces';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class Header implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private userSubscription?: Subscription;
  private authSubscription?: Subscription;

  public currentUser = signal<User | null>(null);
  public isAuthenticated = computed(() => this.currentUser() !== null);

  public userName = computed(() => {
    const user = this.currentUser();
    return user ? user.firstName : 'Guest';
  });

  ngOnInit(): void {
    // this subscribes to current user changes
    this.userSubscription = this.auth.currentUser$.subscribe((user) => {
      this.currentUser.set(user);
      console.log('HEADER: User updated:', user?.email);
    });
    //  this subscibes to authentication state changes
    this.authSubscription = this.auth.isAuthenticated$.subscribe((isAuth) => {
      this.isAuthenticated;
    });
  }

  ngOnDestroy() {
    console.log('HEADER: Component destroy, cleaning up subs');
    this.userSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
  }

  logout() {
    console.log('HEADER: logout button clicked');
    // Updates UI to show logged out state
    this.currentUser.set(null);

    // then, executes actual log out
    this.auth.logout().subscribe({
      next: (success) => {
        console.log('HEADER: logout successful:', success);
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.log('HEADER: Logout error:', error);
        this.router.navigate(['/login']);
      },
    });
  }
}
