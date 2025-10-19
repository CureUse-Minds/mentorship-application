import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, tap, catchError, of, throwError, take } from 'rxjs';
import { Router } from '@angular/router';
import { ProfileService } from './profile.service';
import { AuthService } from './auth.service';
import { UserRole } from '../../shared/interfaces';

export interface RoleSwitchResult {
  success: boolean;
  message: string;
  newRole?: UserRole;
  redirectUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleSwitchingService {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);

  /**
   * Switch user role with comprehensive validation and state management
   */
  switchRole(newRole: UserRole): Observable<RoleSwitchResult> {
    return this.validateRoleSwitch(newRole).pipe(
      switchMap(() => this.performRoleSwitch(newRole)),
      tap((result) => {
        if (result.success && result.redirectUrl) {
          // Delay navigation to allow UI feedback
          setTimeout(() => {
            this.router.navigate([result.redirectUrl]);
          }, 1000);
        }
      }),
      catchError((error) => {
        console.error('Role switching error:', error);
        return of({
          success: false,
          message: 'Failed to switch role. Please try again.',
        });
      })
    );
  }

  /**
   * Get current user role from Firestore
   */
  getCurrentRole(): Observable<UserRole | null> {
    return this.profileService.getCurrentUserRole();
  }

  /**
   * Check if role switch is allowed
   */
  canSwitchRole(currentRole: UserRole, newRole: UserRole): boolean {
    // Prevent switching to the same role
    if (currentRole === newRole) {
      return false;
    }
    
    // Allow switching between mentor and mentee
    const validRoles: UserRole[] = ['mentor', 'mentee'];
    return validRoles.includes(currentRole) && validRoles.includes(newRole);
  }

  /**
   * Get redirect URL based on role
   */
  getRoleRedirectUrl(role: UserRole): string {
    switch (role) {
      case 'mentor':
        return '/mentor/dashboard';
      case 'mentee':
        return '/mentee/dashboard';
      default:
        return '/dashboard';
    }
  }

  /**
   * Validate role switch prerequisites
   */
  private validateRoleSwitch(newRole: UserRole): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      switchMap((user) => {
        if (!user) {
          return throwError(() => new Error('No authenticated user'));
        }

        return this.getCurrentRole().pipe(
          switchMap((currentRole) => {
            if (!currentRole) {
              return throwError(() => new Error('Unable to determine current role'));
            }

            if (!this.canSwitchRole(currentRole, newRole)) {
              return throwError(() => new Error(`Cannot switch from ${currentRole} to ${newRole}`));
            }

            return of(true);
          })
        );
      })
    );
  }

  /**
   * Perform the actual role switch
   */
  private performRoleSwitch(newRole: UserRole): Observable<RoleSwitchResult> {
    return this.profileService.switchCurrentUserRole(newRole).pipe(
      switchMap(() => {
        // Refresh user data to ensure consistency
        return this.refreshUserState().pipe(
          switchMap(() => of({
            success: true,
            message: `Successfully switched to ${newRole} role!`,
            newRole: newRole,
            redirectUrl: this.getRoleRedirectUrl(newRole)
          }))
        );
      })
    );
  }

  /**
   * Refresh user authentication state
   */
  private refreshUserState(): Observable<boolean> {
    // Force a refresh of the user observable
    return this.authService.user$.pipe(
      take(1),
      switchMap(() => of(true))
    );
  }

  /**
   * Handle role-specific data migration (if needed)
   */
  handleRoleDataMigration(oldRole: UserRole, newRole: UserRole): Observable<boolean> {
    // This could be extended to handle role-specific data transformations
    // For example, migrating mentee-specific data when switching to mentor
    
    console.log(`Role migration from ${oldRole} to ${newRole} - no specific migration needed`);
    return of(true);
  }

  /**
   * Validate role permissions for specific actions
   */
  hasRolePermission(role: UserRole, action: string): boolean {
    const permissions = {
      mentor: ['create_assignments', 'manage_sessions', 'review_mentees', 'access_mentor_tools'],
      mentee: ['book_sessions', 'submit_assignments', 'find_mentors', 'access_learning_resources']
    };

    return permissions[role]?.includes(action) || false;
  }

  /**
   * Get role-specific features and capabilities
   */
  getRoleFeatures(role: UserRole): string[] {
    const features = {
      mentor: [
        'Create and manage mentorship sessions',
        'Assign tasks and track progress',
        'Access mentor dashboard and tools',
        'Review and guide mentees',
        'Manage availability and scheduling'
      ],
      mentee: [
        'Book sessions with mentors',
        'Access learning resources',
        'Track personal goals and progress',
        'Find and connect with mentors',
        'Submit assignments and get feedback'
      ]
    };

    return features[role] || [];
  }
}