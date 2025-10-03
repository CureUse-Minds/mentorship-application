import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take, combineLatest } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    // combine both user and verification status
    return combineLatest([this.authService.user$, this.authService.isEmailVerified$]).pipe(
      take(1), //take only 1 current value
      map(([user, isVerified]) => {
        if (!user) {
          // no user logged in - redirect to login
          return this.router.createUrlTree(['/login']);
        }

        if (isVerified) {
          // user is verified - allow access
          return true;
        } else {
          // user exists but email not verified - redirect to verification page
          return this.router.createUrlTree(['/verify-email']);
        }
      })
    );
  }
  // private authService = inject(AuthService);
  // private router = inject(Router);
  // private auth = inject(Auth);

  // canActivate(): Observable<boolean | UrlTree> {
  //   return user(this.auth).pipe(
  //     switchMap(firebaseUser => {
  //       if (!firebaseUser) {
  //         // No user logged in - redirect to login
  //         return of(this.router.createUrlTree(['/login']));
  //       }

  //       // Check if email is verified (Google users are automatically verified)
  //       const isEmailVerified = firebaseUser.emailVerified ||
  //         firebaseUser.providerData.some(provider => provider.providerId === 'google.com');

  //       if (isEmailVerified) {
  //         // User is verified - allow access
  //         return of(true);
  //       } else {
  //         // User exists but email not verified - redirect to verification page
  //         return of(this.router.createUrlTree(['/verify-email']));
  //       }
  //     })
  //   );
  // }
}
