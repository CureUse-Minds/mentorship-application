import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  Firestore,
  getDoc,
  onSnapshot,
  query,
  QuerySnapshot,
  runTransaction,
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
        console.log('Creating session request:', request);

        return from(addDoc(requestCollection, request));
      }),
      map(() => {
        console.log('Session request created successfully');
        return void 0;
      })
    );
  }

  getRequestForMentor(mentorId: string): Observable<Session[]> {
    // console.log('Setting up real-time listener for mentor:', mentorId);

    return new Observable<Session[]>((subscriber) => {
      try {
        const sessionsRef = collection(this.firestore, 'sessions');
        const q = query(
          sessionsRef,
          where('mentorId', '==', mentorId),
          where('status', '==', 'pending')
        );

        // FIX: Set up real-time listener using onSnapshot
        const unsubscribe = onSnapshot(
          q,
          (querySnapshot: QuerySnapshot) => {
            console.log('Snapshot received, number of docs:', querySnapshot.size);

            const sessions: Session[] = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              console.log('Document data:', data);

              sessions.push({
                id: doc.id,
                ...data,
                createdAt: data['createdAt']?.toDate
                  ? data['createdAt'].toDate()
                  : data['createdAt'],
                updatedAt: data['updatedAt']?.toDate
                  ? data['updatedAt'].toDate()
                  : data['updatedAt'],
              } as Session);
            });

            // Sort by createdAt descending (newest first)
            sessions.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            });

            console.log('Emitting sessions:', sessions);
            subscriber.next(sessions);
          },
          (error) => {
            console.error('Snapshot error:', error);
            subscriber.error(error);
          }
        );

        // Return cleanup function
        return () => {
          console.log('Unsubscribing from sessions listener');
          unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up listener:', error);
        subscriber.error(error);
        return () => {};
      }
    });
  }

  // Get all requests for a mentee
  getRequestsForMentee(menteeId: string): Observable<Session[]> {
    console.log('Setting up real-time listener for mentee:', menteeId);

    return new Observable<Session[]>((subscriber) => {
      try {
        const sessionsRef = collection(this.firestore, 'sessions');
        const q = query(sessionsRef, where('menteeId', '==', menteeId));

        // FIX: onSnapshot firebase method to fetch data changes
        const unsubscribe = onSnapshot(
          q,
          (querySnapshot: QuerySnapshot) => {
            const sessions: Session[] = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              sessions.push({
                id: doc.id,
                ...data,
                createdAt: data['createdAt']?.toDate
                  ? data['createdAt'].toDate()
                  : data['createdAt'],
                updatedAt: data['updatedAt']?.toDate
                  ? data['updatedAt'].toDate()
                  : data['updatedAt'],
              } as Session);
            });

            // Sort by createdAt descending
            sessions.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            });

            subscriber.next(sessions);
          },
          (error) => {
            console.error('Snapshot error:', error);
            subscriber.error(error);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up listener:', error);
        subscriber.error(error);
        return () => {};
      }
    });
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

        console.log('Accepting request:', requestId);

        return from(
          runTransaction(this.firestore, async (transaction) => {
            const requestDoc = await transaction.get(requestRef);
            if (!requestDoc.exists()) {
              throw new Error('Request does not exist');
            }

            const mentorProfileDoc = await transaction.get(mentorProfileRef);
            if (!mentorProfileDoc.exists()) {
              throw new Error('Mentor profile does not exist!');
            }

            const mentorProfileData = mentorProfileDoc.data() as MentorProfile;
            const activeMentees = mentorProfileData.activeMentees || 0;
            const menteeLimit = mentorProfileData.menteeLimit || 5;

            if (activeMentees >= menteeLimit) {
              throw new Error(`Mentee limit of ${menteeLimit} reached!`);
            }

            transaction.update(requestRef, {
              status: 'accepted',
              updatedAt: new Date(),
            });
            transaction.update(mentorProfileRef, {
              activeMentees: activeMentees + 1,
            });
          })
        ).pipe(
          map(() => {
            console.log('Request accepted successfully');
            return void 0;
          })
        );
      })
    );
  }

  rejectRequest(requestId: string): Observable<void> {
    // console.log('Rejecting request:', requestId);
    const requestRef = doc(this.firestore, 'sessions', requestId);
    return from(
      updateDoc(requestRef, {
        status: 'rejected',
        updatedAt: new Date(),
      })
    ).pipe(
      map(() => {
        console.log('Request rejected successfully');
        return void 0;
      })
    );
  }
}
