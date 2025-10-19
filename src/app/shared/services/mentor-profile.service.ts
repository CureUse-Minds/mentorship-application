import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  QueryConstraint
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { MentorProfile } from '../interfaces/profile.interface';
import { 
  DynamicMentor, 
  MentorSearchCriteria, 
  SessionType,
  AvailabilityRequest,
  AvailabilityResponse,
  BookingValidation 
} from '../interfaces/dynamic-booking.interface';

@Injectable({
  providedIn: 'root'
})
export class MentorProfileService {
  private firestore = inject(Firestore);
  private cachedMentors = new BehaviorSubject<DynamicMentor[]>([]);
  private loading = new BehaviorSubject<boolean>(false);

  // Observable streams
  mentors$ = this.cachedMentors.asObservable();
  loading$ = this.loading.asObservable();

  constructor() {
    this.loadMentors();
  }

  /**
   * Load all active mentors from Firestore
   */
  private async loadMentors(): Promise<void> {
    this.loading.next(true);
    
    try {
      console.log('🔍 MentorProfileService: Starting to load mentors from Firestore...');
      // FIXED: Use 'profiles' collection instead of 'users' to match ProfileService
      const mentorsRef = collection(this.firestore, 'profiles');
      
      // First, try a simple query to check database connection
      console.log('📡 Testing basic database connection...');
      const testQuery = query(mentorsRef, limit(1));
      const testSnapshot = await getDocs(testQuery);
      console.log(`✅ Database connection successful. Sample documents available: ${testSnapshot.docs.length > 0}`);
      
      // Now try the mentor query (simplified to avoid composite index requirement)
      console.log('🎓 Querying for mentors with role="mentor" from profiles collection...');
      const mentorsQuery = query(
        mentorsRef,
        where('role', '==', 'mentor')
        // Removed orderBy and deleted filter to avoid composite index requirement
        // We'll filter and sort in memory instead
      );

      const mentorProfiles = await getDocs(mentorsQuery);
      console.log(`📊 Mentor query returned ${mentorProfiles.docs.length} documents`);
      
      const mentors: DynamicMentor[] = [];

      mentorProfiles.docs.forEach(doc => {
        const profile = { ...doc.data(), id: doc.id } as any;
        console.log(`👤 Processing mentor document:`, profile);
        
        // Filter out deleted mentors in memory (instead of in query)
        if (profile.deleted === true) {
          console.log(`⏭️ Skipping deleted mentor: ${profile.firstName} ${profile.lastName}`);
          return;
        }
        
        const mentor = this.mapFirestoreMentorToDynamicMentor(profile);
        if (mentor) {
          console.log(`✅ Successfully mapped mentor: ${mentor.firstName} ${mentor.lastName}`);
          mentors.push(mentor);
        } else {
          console.warn(`❌ Failed to map mentor profile:`, profile);
        }
      });

      // Sort by rating in memory (instead of in query)
      mentors.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      console.log(`🎯 Final result: ${mentors.length} mentors loaded successfully`);
      this.cachedMentors.next(mentors);
    } catch (error: any) {
      console.error('❌ Error loading mentors:', error);
      console.error('🔍 Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Provide helpful error messages
      if (error.code === 'failed-precondition') {
        console.error('💡 This error suggests you need to create a composite index in Firestore');
        console.error('🔧 Try removing the orderBy clause or create the required index');
      } else if (error.code === 'permission-denied') {
        console.error('🔒 Permission denied - check your Firestore security rules');
      }
      
      this.cachedMentors.next([]);
    } finally {
      this.loading.next(false);
    }
  }

  /**
   * Search mentors based on criteria
   */
  searchMentors(criteria: MentorSearchCriteria): Observable<DynamicMentor[]> {
    return this.mentors$.pipe(
      map(mentors => this.filterMentorsByCriteria(mentors, criteria))
    );
  }

  /**
   * Get a specific mentor by ID
   */
  getMentorById(mentorId: string): Observable<DynamicMentor | null> {
    return this.mentors$.pipe(
      map(mentors => mentors.find(m => m.id === mentorId) || null)
    );
  }

  /**
   * Get mentor availability for a specific date
   */
  getMentorAvailability(request: AvailabilityRequest): Observable<AvailabilityResponse> {
    return this.getMentorById(request.mentorId).pipe(
      map(mentor => {
        if (!mentor) {
          throw new Error('Mentor not found');
        }
        return this.calculateAvailability(mentor, request);
      }),
      catchError(error => {
        console.error('Error getting mentor availability:', error);
        return of({
          mentorId: request.mentorId,
          date: request.date,
          availableSlots: [],
          bookedSlots: [],
          suggestedAlternatives: []
        });
      })
    );
  }

  /**
   * Refresh mentor data from Firestore
   */
  refreshMentors(): Observable<DynamicMentor[]> {
    this.loadMentors();
    return this.mentors$;
  }

  /**
   * Map Firestore mentor profile to DynamicMentor interface
   */
  private mapFirestoreMentorToDynamicMentor(firestoreProfile: any): DynamicMentor | null {
    try {
      const mentor: DynamicMentor = {
        id: firestoreProfile.id || firestoreProfile.userId,
        firstName: firestoreProfile.firstName || '',
        lastName: firestoreProfile.lastName || '',
        email: firestoreProfile.email || '',
        profilePicture: firestoreProfile.profilePicture || null,
        expertise: firestoreProfile.expertise || firestoreProfile.skills || [],
        bio: firestoreProfile.bio || 'Experienced mentor ready to help you grow.',
        rating: firestoreProfile.rating || 4.0,
        totalSessions: firestoreProfile.totalMentees || firestoreProfile.completedSessions || 0,
        isActive: firestoreProfile.isActive !== false, // Default to true unless explicitly false
        languages: firestoreProfile.preferredLanguages || ['English'],
        timezone: firestoreProfile.timezone || 'UTC',
        
        // Professional information
        company: firestoreProfile.company || null,
        position: firestoreProfile.position || firestoreProfile.title || null,
        isVerified: firestoreProfile.isVerified || firestoreProfile.emailVerified || false,
        yearsOfExperience: firestoreProfile.yearsOfExperience || this.calculateExperience(firestoreProfile),
        reviewCount: firestoreProfile.reviewCount || firestoreProfile.totalMentees || 0,
        
        // Availability and session configuration
        availability: this.getDefaultAvailability(),
        sessionTypes: this.getSessionTypesForMentor(),
        minimumNotice: firestoreProfile.minimumNotice || 24, // 24 hours
        maximumAdvanceBooking: firestoreProfile.maximumAdvanceBooking || 30 // 30 days
      };

      return mentor;
    } catch (error) {
      console.error('Error mapping Firestore profile to DynamicMentor:', error);
      return null;
    }
  }

  /**
   * Calculate years of experience from profile
   */
  private calculateExperience(profile: any): number {
    if (profile.yearsOfExperience) return profile.yearsOfExperience;
    
    // Try to calculate from account age or other indicators
    if (profile.createdAt) {
      const accountAge = new Date().getFullYear() - new Date(profile.createdAt).getFullYear();
      return Math.max(accountAge, 1); // At least 1 year
    }
    
    // Default based on expertise
    const expertiseCount = (profile.expertise || profile.skills || []).length;
    return Math.max(expertiseCount * 0.5, 1);
  }

  /**
   * Get session types for mentors (free application)
   */
  private getSessionTypesForMentor(): SessionType[] {
    return [
      {
        id: 'quick-chat',
        name: 'Quick Chat',
        description: 'Brief consultation for quick questions or advice',
        duration: 30,
        isActive: true
      },
      {
        id: 'one-on-one',
        name: 'One-on-One Session',
        description: 'Personal mentoring session focused on your specific needs',
        duration: 60,
        isActive: true
      },
      {
        id: 'deep-dive',
        name: 'Deep Dive Session',
        description: 'Extended session for complex topics or project reviews',
        duration: 90,
        isActive: true
      },
      {
        id: 'workshop',
        name: 'Workshop',
        description: 'Interactive workshop session with hands-on learning',
        duration: 120,
        isActive: true
      }
    ];
  }

  /**
   * Filter mentors based on search criteria
   */
  private filterMentorsByCriteria(mentors: DynamicMentor[], criteria: MentorSearchCriteria): DynamicMentor[] {
    let filtered = [...mentors];

    // Filter by expertise
    if (criteria.expertise && criteria.expertise.length > 0) {
      filtered = filtered.filter(mentor =>
        criteria.expertise!.some(skill =>
          mentor.expertise.some(mentorSkill =>
            mentorSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    // Filter by minimum rating
    if (criteria.minRating) {
      filtered = filtered.filter(mentor => mentor.rating >= criteria.minRating!);
    }

    // Filter by languages
    if (criteria.languages && criteria.languages.length > 0) {
      filtered = filtered.filter(mentor =>
        criteria.languages!.some(lang =>
          mentor.languages.some(mentorLang =>
            mentorLang.toLowerCase().includes(lang.toLowerCase())
          )
        )
      );
    }

    // Filter by availability
    if (criteria.availability?.date) {
      // This would require more complex availability checking
      // For now, return all mentors
    }

    return filtered;
  }

  /**
   * Calculate availability for a mentor on a specific date
   */
  private calculateAvailability(mentor: DynamicMentor, request: AvailabilityRequest): AvailabilityResponse {
    // This is a simplified implementation
    // In a real app, you'd check against actual bookings in the database
    
    const availableSlots = [
      { startTime: '09:00', endTime: '10:00', isAvailable: true, isBooked: false },
      { startTime: '10:00', endTime: '11:00', isAvailable: true, isBooked: false },
      { startTime: '11:00', endTime: '12:00', isAvailable: true, isBooked: false },
      { startTime: '14:00', endTime: '15:00', isAvailable: true, isBooked: false },
      { startTime: '15:00', endTime: '16:00', isAvailable: true, isBooked: false },
      { startTime: '16:00', endTime: '17:00', isAvailable: true, isBooked: false }
    ];

    return {
      mentorId: mentor.id,
      date: request.date,
      availableSlots,
      bookedSlots: [],
      suggestedAlternatives: []
    };
  }

  /**
   * Get default availability configuration
   */
  private getDefaultAvailability() {
    return {
      weeklySchedule: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Monday
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Tuesday
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Wednesday
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Thursday
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Friday
        { dayOfWeek: 6, startTime: '10:00', endTime: '14:00', isAvailable: true }, // Saturday
        { dayOfWeek: 0, startTime: '10:00', endTime: '14:00', isAvailable: false } // Sunday
      ],
      dateOverrides: [],
      blockedPeriods: []
    };
  }

  /**
   * Validate booking request
   */
  validateBooking(bookingData: any): Observable<BookingValidation> {
    // Implement booking validation logic here
    return of({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    });
  }

  /**
   * Create a booking (this would typically save to Firestore)
   */
  createBooking(bookingData: any): Observable<any> {
    // Implement booking creation logic here
    console.log('Creating booking:', bookingData);
    return of({ id: 'booking_' + Date.now(), status: 'confirmed' });
  }
}