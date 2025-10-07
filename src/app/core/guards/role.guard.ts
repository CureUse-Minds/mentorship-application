import { ProfileService } from './../services/profile.service';
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, Observable, of, switchMap, take } from 'rxjs';
import { UserRole } from '../../shared/interfaces';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const allowedRoles = route.data['roles'] as UserRole[];

    console.log('RoleGUard: checking roles access for:', allowedRoles);

    return this.authService.user$.pipe(
      take(1),
      switchMap((user) => {
        if (!user) {
          // not autheticated - redirect to login
          return of(this.router.createUrlTree(['/login']));
        }
        // CRITICAL: fetch actual role from Firestore, not from AuthService
        console.log('role guard fetching profile to get actual role');
        return this.profileService.getProfile(user.id).pipe(
          map((profile) => {
            console.log('role guard: profile fetched', profile);

            if (!profile) {
              return this.router.createUrlTree(['/dashboard']);
            }
            const actualRole = profile.role;
            console.log('actual role form Firestore', actualRole);
            if (!allowedRoles || allowedRoles.length === 0) {
              // no role restriction - allow access
              return true;
            }

            if (allowedRoles.includes(actualRole)) {
              // user has required role
              return true;
            }

            // User doesn't have required role - redirect to appropriate dashboard
            return this.redirectToDashboard(actualRole);
          })
        );
      })
    );
  }

  private redirectToDashboard(role: UserRole): UrlTree {
    switch (role) {
      case 'mentor':
        return this.router.createUrlTree(['/mentor/dashboard']);
      case 'mentee':
        return this.router.createUrlTree(['/mentee/dashboard']);
      default:
        return this.router.createUrlTree(['/dashboard']);
    }
  }
}
