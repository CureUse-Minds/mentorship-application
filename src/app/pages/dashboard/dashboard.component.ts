import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class Dashboard {
  private auth = inject(AuthService);
  role = computed(() => this.auth.getCurrentUser()?.role ?? 'mentee');

  // additional paths will be added along the process specific to each role
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
