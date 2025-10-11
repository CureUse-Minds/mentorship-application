import { Injectable, inject } from '@angular/core';
import { doc, docData, Firestore, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { catchError, from, Observable, of, switchMap, throwError, map } from 'rxjs';
import { User } from '../../shared/interfaces';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // Get user profile from Firestore by userId
  getUserProfile(userId: string): Observable<any> {
    const userDocRef = doc(this.firestore, `user/${userId}`);
    return docData(userDocRef, { idField: 'id' });
  }

  // get current authenticated user's profile
  getCurrentUserProfile(): Observable<any> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return throwError(() => new Error('No authenticated user'));
        }
        return this.getUserProfile(user.id);
      }),
      catchError((error) => {
        console.error('Error getting current user profile:', error);
        return of(null);
      })
    );
  }

  // Update user profile in Firestore
  updateUserProfile(userId: string, profileData: any): Observable<void> {
    const userDocRef = doc(this.firestore, `user/${userId}`);
    return from(setDoc(userDocRef, profileData, { merge: true }));
  }

  // update the current authenticated user's profile
  updateCurrentUserProfile(profileData: any): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return throwError(() => new Error('No authenticated user'));
        }
        return this.updateUserProfile(user.id, profileData);
      }),
      catchError((error) => {
        console.error('Error updating current user profile', error);
        return throwError(() => error);
      })
    );
  }

  // check if user profile exists in Firestore
  profileExists(userId: string): Observable<boolean> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return from(getDoc(userDocRef)).pipe(
      map((docSnapshot) => docSnapshot.exists()),
      catchError(() => of(false))
    );
  }

  // create initial user profile in Firestore
  // should be called after successful registration
  createUserProfile(user: User): Observable<void> {
    const userDocRef = doc(this.firestore, `users/${user.id}`);
    const profileData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profilePicture: user.profilePicture || null,
      bio: user.bio || null,
      createdAt: user.createdAt,
      updateAt: new Date(),
    };

    return from(setDoc(userDocRef, profileData));
  }

  // initialize user profile if it doesn't exist
  // useful for google sign-in where user may not have a firestore profile yet
  initializeProfileIfNeeded(): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return throwError(() => new Error('No authenticated user'));
        }
        return this.profileExists(user.id).pipe(
          switchMap((exists) => {
            if (!exists) {
              // create profile if it doesn't exists
              return this.createUserProfile(user);
            }
            return of(void 0);
          })
        );
      }),
      catchError((error) => {
        console.error('Error initializing user profile:', error);
        return throwError(() => error);
      })
    );
  }

  // Delete user profile from Firestore
  deleteUserProfile(userId: string): Observable<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return from(setDoc(userDocRef, { deleted: true, deteledAt: new Date() }, { merge: true }));
  }

  // update specific fields in user profile
  updateUserFields(userId: string, fields: Partial<User>): Observable<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    const updateData = {
      ...fields,
      updatedAt: new Date(),
    };
    return from(setDoc(userDocRef, updateData, { merge: true }));
  }

  // getUserProfileRealtime
  getUserProfileRealtime(userId: string): Observable<any> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return docData(userDocRef, { idField: 'id' });
  }

  // get current user profile with realtime update
  getCurrentUserProfileRealtime(): Observable<any> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return of(null);
        }
        return this.getUserProfileRealtime(user.id);
      })
    );
  }
}
