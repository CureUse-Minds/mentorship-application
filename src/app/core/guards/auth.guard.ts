import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take, combineLatest, switchMap, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    // combine both user and verification status
    console.log('Authguard checking access');

    // combine both user and verification status
    return combineLatest([this.authService.user$, this.authService.isEmailVerified$]).pipe(
      take(1), //take only 1 current value
      switchMap(([user, isVerified]) => {
        console.log('AUTHGUARD: user:', user);
        console.log('email is verified:', isVerified);

        if (!user) {
          // no user logged in - redirect to login
          return of(this.router.createUrlTree(['/login']));
        }

        if (!isVerified) {
          // uesr exist but email not verified, redirect verification page
          return of(this.router.createUrlTree(['/verify-email']));
        }

        // user is verified - fetch actual profile to check role
        return this.profileService.getProfile(user.id).pipe(
          map((profile) => {
            console.log('authguraed: profile fetched:', profile);

            if (!profile) {
              console.log('authguard: no profile found, allowing access');
              return true; //allow access dashboard will create profile
            }

            console.log('profile exist with role:', profile.role);
            return true; // allow access user is authenticated and verified
          })
        );
      })
    );
  }
}
