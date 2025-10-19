import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { UserRole } from '../interfaces';

export interface UserStateInfo {
  isAuthenticated: boolean;
  user: any;
  role: UserRole | null;
  canSwitchRoles: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  /**
   * Get complete user state information including current role
   */
  getUserState(): Observable<UserStateInfo> {
    return combineLatest([
      this.authService.user$,
      this.authService.isAuthenticated$,
      this.profileService.getCurrentUserRole()
    ]).pipe(
      map(([user, isAuthenticated, role]) => ({
        isAuthenticated,
        user,
        role,
        canSwitchRoles: isAuthenticated && !!user && !!role
      }))
    );
  }

  /**
   * Get role-specific navigation items
   */
  getRoleBasedNavigation(role: UserRole | null): Array<{title: string, route: string, icon: string}> {
    if (!role) return [];

    const commonItems = [
      { title: 'Dashboard', route: `/${role}/dashboard`, icon: 'home' },
      { title: 'Messages', route: '/messages', icon: 'chat' },
      { title: 'Sessions', route: '/calendar', icon: 'calendar' },
      { title: 'Settings', route: '/settings', icon: 'settings' }
    ];

    const roleSpecificItems = {
      mentor: [
        { title: 'Mentee Requests', route: '/mentor/requests', icon: 'users' },
        { title: 'Assignments', route: '/mentor/assignments', icon: 'clipboard' }
      ],
      mentee: [
        { title: 'Find Mentor', route: '/mentee/find-mentor', icon: 'search' },
        { title: 'Goals', route: '/goals', icon: 'target' },
        { title: 'Resources', route: '/resources', icon: 'book' }
      ]
    };

    return [...commonItems.slice(0, 1), ...(roleSpecificItems[role] || []), ...commonItems.slice(1)];
  }
}