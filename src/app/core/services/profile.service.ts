import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { UserProfile, MentorProfile, MenteeProfile, User } from '../../shared/interfaces';
import { doc, docData, Firestore, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { catchError, from, Observable, of, switchMap, take, throwError, map } from 'rxjs';
import { prepareForFirestore, removeUndefined } from '../../shared/utils/firestore.helpers';
@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // Create Profile
  createProfile(userId: string, profileData: Partial<UserProfile>): Observable<void> {
    const profileRef = doc(this.firestore, `profiles/${userId}`);

    const cleanData = prepareForFirestore(profileData, false);

    return from(setDoc(profileRef, cleanData));
  }

  getProfile(userId: string): Observable<UserProfile | null> {
    const profileRef = doc(this.firestore, `profiles/${userId}`);
    return from(getDoc(profileRef)).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          return docSnap.data() as UserProfile;
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error getting profile:', error);
        return of(null);
      })
    );
  }

  getCurrentUserProfile(): Observable<UserProfile | null> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return of(null);
        }
        return this.getProfile(user.id);
      })
    );
  }

  // real-time profile updates
  getProfileRealtime(userId: string): Observable<UserProfile | null> {
    const profileRef = doc(this.firestore, `profiles/${userId}`);
    return docData(profileRef) as Observable<UserProfile | null>;
  }

  getCurrentUserProfileRealtime(): Observable<UserProfile | null> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return of(null);
        }
        return this.getProfileRealtime(user.id);
      })
    );
  }

  // UPDATE PROFILE
  updateProfile(userId: string, updates: Partial<UserProfile>): Observable<void> {
    const profileRef = doc(this.firestore, `profiles/${userId}`);

    const cleanUpdates = prepareForFirestore(updates, true);

    return from(updateDoc(profileRef, cleanUpdates));
  }

  updateCurrentUserProfile(updates: Partial<UserProfile>): Observable<void> {
    return this.authService.user$.pipe(
      take(1),
      switchMap((user) => {
        if (!user) {
          return throwError(() => new Error('No authenticated user'));
        }
        return this.updateProfile(user.id, updates);
      })
    );
  }

  // Mentor-specific methods
  getMentorProfile(userId: string): Observable<MentorProfile | null> {
    return this.getProfile(userId).pipe(
      map((profile) => {
        if (profile && profile.role === 'mentor') {
          return profile as MentorProfile;
        }
        return null;
      })
    );
  }

  updateMentorProfile(userId: string, updates: Partial<MentorProfile>): Observable<void> {
    return this.updateProfile(userId, updates);
  }

  addExpertise(userId: string, expertise: string): Observable<void> {
    return this.getMentorProfile(userId).pipe(
      switchMap((profile) => {
        if (!profile) {
          return throwError(() => new Error('Mentor profile not found'));
        }
        const updateExpertise = [...(profile.expertise || []), expertise];
        return this.updateProfile(userId, { expertise: updateExpertise });
      })
    );
  }

  removeExpertise(userId: string, expertise: string): Observable<void> {
    return this.getMentorProfile(userId).pipe(
      switchMap((profile) => {
        if (!profile) {
          return throwError(() => new Error('Mentor profile not found'));
        }
        const updateExpertise = profile.expertise.filter((e) => e !== expertise);
        return this.updateProfile(userId, { expertise: updateExpertise });
      })
    );
  }

  addSkill(userId: string, skill: string): Observable<void> {
    return this.getProfile(userId).pipe(
      switchMap((profile) => {
        if (!profile) {
          return throwError(() => new Error('Profile not found'));
        }
        const updateSkills = [...(profile.skills || []), skill];
        return this.updateProfile(userId, { skills: updateSkills });
      })
    );
  }

  removeSkill(userId: string, skill: string): Observable<void> {
    return this.getProfile(userId).pipe(
      switchMap((profile) => {
        if (!profile) {
          return throwError(() => new Error('Profile not found'));
        }
        const updatedSkills = profile.skills.filter((s) => s !== skill);
        return this.updateProfile(userId, { skills: updatedSkills });
      })
    );
  }

  // MENTEE-SPECIFIC METHODS
  getMenteeProfile(userId: string): Observable<MenteeProfile | null> {
    return this.getProfile(userId).pipe(
      map((profile) => {
        if (profile && profile.role === 'mentee') {
          return profile as MenteeProfile;
        }
        return null;
      })
    );
  }

  updateMenteeProfile(userId: string, updates: Partial<MenteeProfile>): Observable<void> {
    return this.updateProfile(userId, updates);
  }

  addInterests(userId: string, interest: string): Observable<void> {
    return this.getMenteeProfile(userId).pipe(
      switchMap((profile) => {
        if (!profile) {
          return throwError(() => new Error('Mentee profile not found'));
        }
        const updatedInterests = [...(profile.interests || []), interest];
        return this.updateProfile(userId, { interests: updatedInterests });
      })
    );
  }

  removeInterest(userId: string, interest: string): Observable<void> {
    return this.getMenteeProfile(userId).pipe(
      switchMap((profile) => {
        if (!profile) {
          return throwError(() => new Error('Mentee profile not found'));
        }

        const updatedInterests = profile.interests.filter((i) => i !== interest);
        return this.updateProfile(userId, { interests: updatedInterests });
      })
    );
  }

  // PROFILE INITIALIZATION
  // Initialize a new profile based on user role
  // this should be called after user registration or first Google sign-in
  initializeProfile(user: User): Observable<void> {
    const baseProfile: Partial<UserProfile> = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      bio: '',
      skills: [],
      preferredLanguages: ['English'],
    };

    // only add profilePicture if it exists
    if (user.profilePicture) {
      baseProfile.profilePicture = user.profilePicture;
    }

    if (user.role === 'mentor') {
      const mentorProfile = {
        ...baseProfile,
        role: 'mentor' as const,
        expertise: [],
        availability: [],
        rating: 0,
        totalMentees: 0,
        yearsOfExperience: 0,
      };
      return this.createProfile(user.id, removeUndefined(mentorProfile));
    }

    // handle mentee profile creation
    else if (user.role === 'mentee') {
      const menteeProfile = {
        ...baseProfile,
        role: 'mentee' as const, //explicit literal type
        interests: [],
        completedSessions: 0,
        goalsAndObjectives: '',
      };
      return this.createProfile(user.id, removeUndefined(menteeProfile));
    }

    // handle admin or unknown roles
    else {
      return throwError(
        () => new Error(`Cannot initialize profile: unsupported role '${user.role}'`)
      );
    }
  }

  // check if profile exists
  profileExists(userId: string): Observable<boolean> {
    return this.getProfile(userId).pipe(map((profile) => profile !== null));
  }
}
