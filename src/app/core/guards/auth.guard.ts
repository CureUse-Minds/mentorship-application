import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, switchMap, of, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Auth, user } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);
  private auth = inject(Auth);

  canActivate(): Observable<boolean | UrlTree> {
    return user(this.auth).pipe(
      take(1),
      switchMap((firebaseUser) => {
        console.log('AUTHGUARD: checking user...', firebaseUser?.email);

        if (!firebaseUser) {
          // No user logged in - redirect to login
          console.log('AUTHGUARD: No user, redirect to login');
          return of(this.router.createUrlTree(['/login']));
        }

        // Check if email is verified (Google users are automatically verified)
        const isEmailVerified =
          firebaseUser.emailVerified ||
          firebaseUser.providerData.some((provider) => provider.providerId === 'google.com');

        if (isEmailVerified) {
          // User is verified - allow access
          return of(true);
        } else {
          // User exists but email not verified - redirect to verification page
          return of(this.router.createUrlTree(['/verify-email']));
        }
      })
    );
  }
}
