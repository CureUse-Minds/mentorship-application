import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  user,
  User as FirebaseUser,
  updateProfile,
  sendEmailVerification,
  reload,
  fetchSignInMethodsForEmail,
} from '@angular/fire/auth';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../../shared/interfaces';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private googleProvider = new GoogleAuthProvider();

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    // Listen to Firebase auth state changes
    user(this.auth).subscribe(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Always reload the user to get the latest verification status
        try {
          await reload(firebaseUser);
        } catch (error) {
          console.error('Error reloading user:', error);
        }

        // Check if email is verified (Google users are automatically verified)
        const isEmailVerified =
          firebaseUser.emailVerified ||
          firebaseUser.providerData.some((provider) => provider.providerId === 'google.com');

        // Always create user object but only set as authenticated if verified
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          role: 'mentee', // Default role, you might want to store this in Firestore
          profilePicture: firebaseUser.photoURL || undefined,
          bio: undefined,
          createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
          updatedAt: new Date(),
        };

        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(isEmailVerified);
      } else {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }
    });
  }

  // Email/Password Login
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return from(
      signInWithEmailAndPassword(this.auth, credentials.email, credentials.password)
    ).pipe(
      switchMap((userCredential) => {
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          // Sign out the user immediately if email is not verified
          signOut(this.auth);
          return of({
            success: false,
            message:
              'Please verify your email before signing in. Check your inbox for a verification email.',
          });
        }

        return of({
          success: true,
          message: 'Login successful',
          user: {
            id: userCredential.user.uid,
            email: userCredential.user.email || '',
            firstName: userCredential.user.displayName?.split(' ')[0] || '',
            lastName: userCredential.user.displayName?.split(' ').slice(1).join(' ') || '',
            role: 'mentee' as const,
          },
        });
      }),
      catchError((error) => {
        let errorMessage = 'Login failed';
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email. Please register first.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password';
            break;
        }
        return of({
          success: false,
          message: errorMessage,
        });
      })
    );
  }

  // Google Sign-In
  signInWithGoogle(): Observable<LoginResponse> {
    return from(signInWithPopup(this.auth, this.googleProvider)).pipe(
      map((userCredential) => {
        // Google accounts are automatically verified
        return {
          success: true,
          message: 'Google sign-in successful',
          user: {
            id: userCredential.user.uid,
            email: userCredential.user.email || '',
            firstName: userCredential.user.displayName?.split(' ')[0] || '',
            lastName: userCredential.user.displayName?.split(' ').slice(1).join(' ') || '',
            role: 'mentee' as const,
          },
        };
      }),
      catchError((error) => {
        let errorMessage = 'Google sign-in failed';
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = 'Sign-in popup was closed';
            break;
          case 'auth/cancelled-popup-request':
            errorMessage = 'Sign-in was cancelled';
            break;
          case 'auth/account-exists-with-different-credential':
            errorMessage =
              'An account already exists with this email using a different sign-in method';
            break;
          case 'auth/popup-blocked':
            errorMessage = 'Sign-in popup was blocked by your browser';
            break;
        }
        return of({
          success: false,
          message: errorMessage,
        });
      })
    );
  }

  // Email/Password Registration
  register(userData: RegisterRequest): Observable<RegisterResponse> {
    // First check if email is already registered
    return from(fetchSignInMethodsForEmail(this.auth, userData.email)).pipe(
      switchMap((signInMethods) => {
        if (signInMethods.length > 0) {
          return of({
            success: false,
            message: 'An account with this email already exists. Please sign in instead.',
          });
        }

        // Proceed with registration if email is not taken
        return from(
          createUserWithEmailAndPassword(this.auth, userData.email, userData.password)
        ).pipe(
          switchMap((userCredential) => {
            // Update the user's display name
            const displayName = `${userData.firstName} ${userData.lastName}`;
            return from(updateProfile(userCredential.user, { displayName })).pipe(
              switchMap(() => {
                // Send email verification
                return from(sendEmailVerification(userCredential.user));
              }),
              map(() => {
                // Sign out the user immediately after registration until email is verified
                signOut(this.auth);
                return {
                  success: true,
                  message:
                    'Registration successful! Please check your email and verify your account before signing in.',
                  user: {
                    id: userCredential.user.uid,
                    email: userCredential.user.email || '',
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    role: userData.role,
                  },
                };
              })
            );
          })
        );
      }),
      catchError((error) => {
        let errorMessage = 'Registration failed';
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists. Please sign in instead.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please use at least 6 characters.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password accounts are not enabled';
            break;
        }
        return of({
          success: false,
          message: errorMessage,
        });
      })
    );
  }

  // Logout
  logout(): Observable<boolean> {
    console.log('AUTHSERVICE: logout() called');

    // clearning the local state immediatedly
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    console.log('AUTHSERVICE: Local state cleared');

    // then signout from Firebase
    return from(signOut(this.auth)).pipe(
      map(() => {
        console.log('AUTHSERVICE: Firebase signOut completed');
        return true;
      }),
      catchError((error) => {
        console.log('AUTHSERVICE: logout error', error);
        return of(false);
      })
    );
    // return from(signOut(this.auth)).pipe(
    //   map(() => {
    //     this.currentUserSubject.next(null);
    //     this.isAuthenticatedSubject.next(false);
    //     return true;
    //   }),
    //   catchError(() => of(false))
    // );
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  // Resend email verification
  resendEmailVerification(): Observable<{ success: boolean; message: string }> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return of({
        success: false,
        message: 'No user is currently signed in',
      });
    }

    if (currentUser.emailVerified) {
      return of({
        success: false,
        message: 'Email is already verified',
      });
    }

    return from(sendEmailVerification(currentUser)).pipe(
      map(() => ({
        success: true,
        message: 'Verification email sent successfully',
      })),
      catchError((error) => {
        let errorMessage = 'Failed to send verification email';
        switch (error.code) {
          case 'auth/too-many-requests':
            errorMessage =
              'Too many requests. Please wait before requesting another verification email';
            break;
        }
        return of({
          success: false,
          message: errorMessage,
        });
      })
    );
  }

  // Check if email is already registered
  checkEmailExists(email: string): Observable<boolean> {
    return from(fetchSignInMethodsForEmail(this.auth, email)).pipe(
      map((methods) => methods.length > 0),
      catchError(() => of(false))
    );
  }

  // Refresh user authentication state
  refreshUser(): Observable<boolean> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return of(false);
    }

    return from(reload(currentUser)).pipe(
      map(() => {
        // Force re-evaluation by manually triggering the auth state listener
        const isEmailVerified =
          currentUser.emailVerified ||
          currentUser.providerData.some((provider) => provider.providerId === 'google.com');

        if (isEmailVerified) {
          const user: User = {
            id: currentUser.uid,
            email: currentUser.email || '',
            firstName: currentUser.displayName?.split(' ')[0] || '',
            lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
            role: 'mentee',
            profilePicture: currentUser.photoURL || undefined,
            bio: undefined,
            createdAt: new Date(currentUser.metadata.creationTime || Date.now()),
            updatedAt: new Date(),
          };
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          return true;
        } else {
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          return false;
        }
      }),
      catchError(() => of(false))
    );
  }

  // Check if current user's email is verified
  isEmailVerified(): boolean {
    const firebaseUser = this.auth.currentUser;
    return firebaseUser ? firebaseUser.emailVerified : false;
  }

  // Handle email verification redirect
  handleEmailVerification(): Observable<{ verified: boolean; message: string }> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return of({ verified: false, message: 'No user is currently signed in' });
    }

    return from(reload(currentUser)).pipe(
      map(() => {
        if (currentUser.emailVerified) {
          // Update the authentication state immediately
          const user: User = {
            id: currentUser.uid,
            email: currentUser.email || '',
            firstName: currentUser.displayName?.split(' ')[0] || '',
            lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
            role: 'mentee',
            profilePicture: currentUser.photoURL || undefined,
            bio: undefined,
            createdAt: new Date(currentUser.metadata.creationTime || Date.now()),
            updatedAt: new Date(),
          };
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);

          return { verified: true, message: 'Email verified successfully!' };
        } else {
          return { verified: false, message: 'Email is not yet verified' };
        }
      }),
      catchError(() => of({ verified: false, message: 'Error checking verification status' }))
    );
  }
}
