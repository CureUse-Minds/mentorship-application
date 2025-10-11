import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { combineLatest, from, map, Observable, switchMap, take, throwError } from 'rxjs';
import { MentorProfile, Session } from '../../shared/interfaces';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  sendRequest(mentorId: string, message: string): Observable<void> {
    // Get the current user (mentee)
    const mentee$ = this.authService.getCurrentUser().pipe(take(1));

    // create a reference and an observable for the mentor's profile
    const mentorProfileRef = doc(this.firestore, `profiles/${mentorId}`);
    const mentor$ = from(getDoc(mentorProfileRef)).pipe(
      map((docSnap) => {
        if (!docSnap.exists()) {
          throw new Error('Mentor profile not found');
        }
        return docSnap.data() as MentorProfile;
      })
    );
    return combineLatest([mentee$, mentor$]).pipe(
      switchMap(([mentee, mentorProfile]) => {
        if (!mentee) {
          return throwError(() => new Error('User not logged in'));
        }

        const request: Omit<Session, 'id'> = {
          menteeId: mentee.id,
          mentorId,
          menteeName: `${mentee.firstName} ${mentee.lastName}`,
          mentorName: `${mentorProfile.firstName} ${mentorProfile.lastName}`,
          message,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const requestCollection = collection(this.firestore, 'sessions');
        // return the promise from addDoc wrapped in from
        return from(addDoc(requestCollection, request));
      }),
      // map the final result to void
      map(() => void 0)
    );
  }

  getRequestForMentor(mentorId: string): Observable<Session[]> {
    const requestCollection = collection(this.firestore, 'sessions');
    const q = query(
      requestCollection,
      where('mentorId', '==', mentorId),
      where('status', '==', 'pending')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Session[]>;
  }

  // Get all requests for a mentee
  getRequestsForMentee(menteeId: string): Observable<Session[]> {
    const requestCollection = collection(this.firestore, 'sessions');
    const q = query(requestCollection, where('menteeId', '==', menteeId));
    return collectionData(q, { idField: 'id' }) as Observable<Session[]>;
  }

  acceptRequest(requestId: string): Observable<void> {
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap((user) => {
        if (!user) {
          return throwError(() => new Error('Mentor not logged in'));
        }
        const requestRef = doc(this.firestore, 'sessions', requestId);
        const mentorProfileRef = doc(this.firestore, `profiles/${user.id}`);

        return from(
          runTransaction(this.firestore, async (transaction) => {
            const requestDoc = await transaction.get(requestRef);
            if (!requestDoc.exists()) {
              throw 'Request does not exist';
            }

            const mentorProfileDoc = await transaction.get(mentorProfileRef);
            if (!mentorProfileDoc.exists()) {
              throw 'Mentor profile does not exist!';
            }

            const mentorProfileData = mentorProfileDoc.data() as MentorProfile;
            const activeMentees = mentorProfileData.activeMentees || 0;
            const menteeLimit = mentorProfileData.menteeLimit || 5;

            if (activeMentees >= menteeLimit) {
              throw `Mentee limit of ${menteeLimit} reached!`;
            }

            transaction.update(requestRef, { status: 'accepted', updatedAt: new Date() });
            transaction.update(mentorProfileRef, { activeMentees: activeMentees + 1 });
          })
        );
      })
    );
  }

  rejectRequest(requestId: string): Observable<void> {
    const requestRef = doc(this.firestore, 'sessions', requestId);
    return from(updateDoc(requestRef, { status: 'rejected', updatedAt: new Date() }));
  }
}
