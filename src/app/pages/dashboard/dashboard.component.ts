import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  public userRole = signal<'mentor' | 'mentee' | 'admin'>('mentee');
  public role = computed(() => this.userRole());

  ngOnInit() {
    this.auth.currentUser$.subscribe((user) => {
      console.log('DASHBOARD: User received:', user);
      if (user) {
        this.userRole.set(user.role || 'mentee');
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  menteeItems = [
    {
      path: 'profile',
      label: 'Profile',
    },
    {
      path: 'calendar',
      label: 'Calendar',
    },
    {
      path: 'messages',
      label: 'Messages',
    },
  ];

  mentorItems = [
    {
      path: 'profile',
      label: 'Profile',
    },
    {
      path: 'calendar',
      label: 'Calendar',
    },
    {
      path: 'messages',
      label: 'Messages',
    },
  ];
}
