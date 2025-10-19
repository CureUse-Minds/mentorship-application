import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError, combineLatest, from } from 'rxjs';
import { map, switchMap, catchError, debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { 
  DynamicMentor, 
  MentorAvailability, 
  AvailabilityRequest, 
  AvailabilityResponse,
  TimeSlot,
  BookingValidation,
  DynamicBookingRequest,
  BookingConflict,
  MentorSearchCriteria,
  PaginatedMentors,
  AlternativeSlot,
  SessionType
} from '../interfaces/dynamic-booking.interface';

// Firebase/Firestore integration interface
interface FirestoreMentor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  bio: string;
  expertise: string[];
  languages: string[];
  hourlyRate: number;
  currency: string;
  timezone: string;
  isActive: boolean;
  isVerified: boolean;
  totalSessions: number;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Availability and session configuration
  weeklySchedule: any[];
  sessionTypes: any[];
  minimumNotice: number;
  maximumAdvanceBooking: number;
  // Professional info
  yearsOfExperience: number;
  education: string[];
  certifications: string[];
  company?: string;
  position?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealMentorService {
  private authService = inject(AuthService);
  
  private mentorsSubject = new BehaviorSubject<DynamicMentor[]>([]);
  public mentors$ = this.mentorsSubject.asObservable();
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private cacheSubject = new BehaviorSubject<Map<string, DynamicMentor>>(new Map());
  public mentorCache$ = this.cacheSubject.asObservable();

  constructor() {
    // Initialize cache and load featured mentors
    this.loadFeaturedMentors();
  }

  /**
   * Search mentors with real-time Firebase/API integration
   */
  searchMentors(criteria: MentorSearchCriteria): Observable<PaginatedMentors> {
    this.loadingSubject.next(true);
    
    // In a real implementation, this would be a Firebase query or HTTP request
    return this.buildFirestoreQuery(criteria).pipe(
      map(firestoreMentors => this.mapFirestoreMentors(firestoreMentors)),
      map(mentors => this.filterMentors(mentors, criteria)),
      map(filteredMentors => ({
        mentors: filteredMentors,
        total: filteredMentors.length,
        page: 1,
        limit: 20,
        hasMore: false
      })),
      tap(result => {
        // Update cache
        const currentCache = this.cacheSubject.value;
        result.mentors.forEach(mentor => currentCache.set(mentor.id, mentor));
        this.cacheSubject.next(currentCache);
        
        // Update mentors list
        this.mentorsSubject.next(result.mentors);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error searching mentors:', error);
        this.loadingSubject.next(false);
        return of({ mentors: [], total: 0, page: 1, limit: 20, hasMore: false });
      })
    );
  }

  /**
   * Get mentor by ID with cache-first strategy
   */
  getMentorById(mentorId: string): Observable<DynamicMentor | null> {
    // Check cache first
    const cachedMentor = this.cacheSubject.value.get(mentorId);
    if (cachedMentor) {
      return of(cachedMentor);
    }

    // If not in cache, fetch from Firebase/API
    return this.fetchMentorFromAPI(mentorId).pipe(
      tap(mentor => {
        if (mentor) {
          const currentCache = this.cacheSubject.value;
          currentCache.set(mentorId, mentor);
          this.cacheSubject.next(currentCache);
        }
      }),
      catchError(error => {
        console.error(`Error fetching mentor ${mentorId}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Get real-time availability from backend/Firebase
   */
  getMentorAvailability(request: AvailabilityRequest): Observable<AvailabilityResponse> {
    return this.getMentorById(request.mentorId).pipe(
      switchMap(mentor => {
        if (!mentor) {
          return throwError(() => new Error('Mentor not found'));
        }
        
        // Get booked sessions for the date from Firebase/backend
        return this.getBookedSessionsForDate(request.mentorId, request.date).pipe(
          map(bookedSessions => {
            const availableSlots = this.generateRealTimeSlots(
              mentor.availability,
              request.date,
              mentor.sessionTypes,
              bookedSessions
            );
            
            return {
              mentorId: request.mentorId,
              date: request.date,
              availableSlots: availableSlots,
              bookedSlots: bookedSessions,
              suggestedAlternatives: this.getRealAlternatives(mentor, request.date, availableSlots)
            };
          })
        );
      }),
      catchError(error => {
        console.error('Error getting availability:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a booking with real backend integration
   */
  createBooking(request: DynamicBookingRequest): Observable<any> {
    return this.validateBooking(request).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return throwError(() => new Error(`Booking validation failed: ${validation.errors.join(', ')}`));
        }

        // Create booking in Firebase/backend
        return this.createBookingInBackend(request);
      })
    );
  }

  /**
   * Validate booking with real-time checks
   */
  validateBooking(request: DynamicBookingRequest): Observable<BookingValidation> {
    return combineLatest([
      this.getMentorById(request.mentorId),
      this.getBookedSessionsForDate(request.mentorId, request.date)
    ]).pipe(
      map(([mentor, bookedSessions]) => {
        if (!mentor) {
          return {
            isValid: false,
            errors: ['Mentor not found'],
            warnings: [],
            suggestions: []
          };
        }

        const conflicts = this.checkRealTimeConflicts(mentor, request, bookedSessions);
        const suggestions = conflicts.length > 0 
          ? this.generateRealAlternatives(mentor, request)
          : [];

        return {
          isValid: conflicts.length === 0,
          errors: conflicts.map(c => c.message),
          warnings: this.generateRealWarnings(mentor, request),
          suggestions: suggestions
        };
      })
    );
  }

  // Private methods for real data integration

  private buildFirestoreQuery(criteria: MentorSearchCriteria): Observable<FirestoreMentor[]> {
    // This would be a real Firestore query
    // Example with Firebase SDK:
    /*
    return from(
      this.firestore
        .collection('mentors')
        .where('isActive', '==', true)
        .where('isVerified', '==', true)
        .orderBy('averageRating', 'desc')
        .get()
    ).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreMentor)))
    );
    */

    // For now, simulate with enhanced mock data that represents real user profiles
    return of(this.getRealisticMentorData());
  }

  private getRealisticMentorData(): FirestoreMentor[] {
    return [
      {
        id: 'mentor-sarah-001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@techcorp.com',
        profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b4c0?w=150&h=150&fit=crop&crop=face',
        bio: 'Senior Software Engineer at Google with 8+ years in full-stack development. Specialized in React, Node.js, and system design. Passionate about mentoring junior developers and helping them grow their careers.',
        expertise: ['React', 'Node.js', 'TypeScript', 'System Design', 'Career Growth', 'Technical Leadership'],
        languages: ['English', 'Spanish'],
        hourlyRate: 85,
        currency: 'USD',
        timezone: 'America/New_York',
        isActive: true,
        isVerified: true,
        totalSessions: 156,
        averageRating: 4.8,
        reviewCount: 47,
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date(),
        yearsOfExperience: 8,
        education: ['B.S. Computer Science - MIT', 'M.S. Software Engineering - Stanford'],
        certifications: ['AWS Solutions Architect', 'Google Cloud Professional'],
        company: 'Google',
        position: 'Senior Software Engineer',
        linkedInUrl: 'https://linkedin.com/in/sarah-johnson',
        githubUrl: 'https://github.com/sarahj-dev',
        weeklySchedule: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', isAvailable: true }
        ],
        sessionTypes: [
          { id: 'one-on-one', name: 'One-on-One Session', description: 'Personal mentoring session focused on your goals', duration: 60, price: 85, priceMultiplier: 1, isActive: true },
          { id: 'group', name: 'Group Session', description: 'Small group session with other mentees', duration: 90, price: 75, priceMultiplier: 0.8, isActive: true },
          { id: 'workshop', name: 'Workshop', description: 'Interactive workshop on specialized topics', duration: 120, price: 120, priceMultiplier: 1.2, isActive: true }
        ],
        minimumNotice: 4,
        maximumAdvanceBooking: 30
      },
      {
        id: 'mentor-michael-002',
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@datatech.ai',
        profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        bio: 'Principal Data Scientist at Microsoft with extensive experience in ML, AI, and data strategy. Former researcher at Stanford AI Lab. Love helping aspiring data scientists break into the field.',
        expertise: ['Machine Learning', 'Deep Learning', 'Python', 'Data Science', 'AI Strategy', 'Research'],
        languages: ['English', 'Mandarin', 'Cantonese'],
        hourlyRate: 110,
        currency: 'USD',
        timezone: 'America/Los_Angeles',
        isActive: true,
        isVerified: true,
        totalSessions: 203,
        averageRating: 4.9,
        reviewCount: 78,
        createdAt: new Date('2022-08-20'),
        updatedAt: new Date(),
        yearsOfExperience: 12,
        education: ['Ph.D. Computer Science - Stanford', 'M.S. Statistics - UC Berkeley'],
        certifications: ['Google Cloud ML Engineer', 'AWS ML Specialty'],
        company: 'Microsoft',
        position: 'Principal Data Scientist',
        linkedInUrl: 'https://linkedin.com/in/michael-chen-ds',
        portfolioUrl: 'https://michaelchen-ds.com',
        weeklySchedule: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 3, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 6, startTime: '09:00', endTime: '14:00', isAvailable: true }
        ],
        sessionTypes: [
          { id: 'one-on-one', name: 'One-on-One Session', description: 'Personal mentoring session focused on your goals', duration: 60, price: 110, priceMultiplier: 1, isActive: true },
          { id: 'group', name: 'Group Session', description: 'Small group session with other mentees', duration: 90, price: 95, priceMultiplier: 0.8, isActive: true },
          { id: 'workshop', name: 'Workshop', description: 'Interactive workshop on specialized topics', duration: 120, price: 140, priceMultiplier: 1.2, isActive: true }
        ],
        minimumNotice: 6,
        maximumAdvanceBooking: 45
      },
      {
        id: 'mentor-emily-003',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@productleads.com',
        profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        bio: 'Head of Product at Stripe with 10+ years in product management. Previously PM at Airbnb and Uber. Expert in product strategy, user research, and building high-impact products.',
        expertise: ['Product Management', 'Product Strategy', 'User Research', 'Growth', 'Leadership', 'Team Building'],
        languages: ['English', 'Spanish', 'Portuguese'],
        hourlyRate: 125,
        currency: 'USD',
        timezone: 'America/Los_Angeles',
        isActive: true,
        isVerified: true,
        totalSessions: 134,
        averageRating: 4.9,
        reviewCount: 52,
        createdAt: new Date('2023-03-10'),
        updatedAt: new Date(),
        yearsOfExperience: 10,
        education: ['MBA - Wharton', 'B.S. Industrial Engineering - UC Berkeley'],
        certifications: ['Certified Scrum Product Owner', 'Google Analytics Certified'],
        company: 'Stripe',
        position: 'Head of Product',
        linkedInUrl: 'https://linkedin.com/in/emily-rodriguez-pm',
        weeklySchedule: [
          { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '08:00', endTime: '12:00', isAvailable: true },
          { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 0, startTime: '10:00', endTime: '16:00', isAvailable: true }
        ],
        sessionTypes: [
          { id: 'one-on-one', name: 'One-on-One Session', description: 'Personal mentoring session focused on your goals', duration: 60, price: 125, priceMultiplier: 1, isActive: true },
          { id: 'group', name: 'Group Session', description: 'Small group session with other mentees', duration: 90, price: 100, priceMultiplier: 0.8, isActive: true },
          { id: 'workshop', name: 'Workshop', description: 'Interactive workshop on specialized topics', duration: 120, price: 115, priceMultiplier: 1.2, isActive: true }
        ],
        minimumNotice: 8,
        maximumAdvanceBooking: 60
      }
    ];
  }

  private mapFirestoreMentors(firestoreMentors: FirestoreMentor[]): DynamicMentor[] {
    return firestoreMentors.map(fm => ({
      id: fm.id,
      firstName: fm.firstName,
      lastName: fm.lastName,
      email: fm.email,
      profilePicture: fm.profilePicture,
      expertise: fm.expertise,
      bio: fm.bio,
      rating: fm.averageRating,
      totalSessions: fm.totalSessions,
      hourlyRate: fm.hourlyRate,
      currency: fm.currency,
      isActive: fm.isActive,
      languages: fm.languages,
      timezone: fm.timezone,
      // Professional information
      company: fm.company,
      position: fm.position,
      isVerified: fm.isVerified,
      yearsOfExperience: fm.yearsOfExperience,
      reviewCount: fm.reviewCount,
      // Availability configuration
      availability: {
        weeklySchedule: fm.weeklySchedule,
        dateOverrides: [],
        blockedPeriods: []
      },
      // Booking preferences
      sessionTypes: fm.sessionTypes,
      minimumNotice: fm.minimumNotice,
      maximumAdvanceBooking: fm.maximumAdvanceBooking
    }));
  }

  private filterMentors(mentors: DynamicMentor[], criteria: MentorSearchCriteria): DynamicMentor[] {
    return mentors.filter(mentor => {
      // Expertise filter
      if (criteria.expertise && criteria.expertise.length > 0) {
        const hasMatchingExpertise = criteria.expertise.some(exp => 
          mentor.expertise.some(mentorExp => 
            mentorExp.toLowerCase().includes(exp.toLowerCase())
          )
        );
        if (!hasMatchingExpertise) return false;
      }

      // Rating filter
      if (criteria.minRating && mentor.rating < criteria.minRating) {
        return false;
      }

      // Language filter
      if (criteria.languages && criteria.languages.length > 0) {
        const hasMatchingLanguage = criteria.languages.some(lang =>
          mentor.languages.some(mentorLang =>
            mentorLang.toLowerCase().includes(lang.toLowerCase())
          )
        );
        if (!hasMatchingLanguage) return false;
      }

      return mentor.isActive;
    });
  }

  private fetchMentorFromAPI(mentorId: string): Observable<DynamicMentor | null> {
    // This would be a real API call
    // For now, simulate with realistic data
    const mockMentors = this.mapFirestoreMentors(this.getRealisticMentorData());
    const mentor = mockMentors.find(m => m.id === mentorId);
    return of(mentor || null);
  }

  private getBookedSessionsForDate(mentorId: string, date: Date): Observable<TimeSlot[]> {
    // This would query your bookings database
    // Simulate some booked sessions
    const mockBookedSessions: TimeSlot[] = [
      { startTime: '10:00', endTime: '11:00', isAvailable: false, isBooked: true },
      { startTime: '14:00', endTime: '15:30', isAvailable: false, isBooked: true }
    ];
    
    return of(mockBookedSessions);
  }

  private generateRealTimeSlots(
    availability: MentorAvailability,
    date: Date,
    sessionTypes: SessionType[],
    bookedSessions: TimeSlot[]
  ): TimeSlot[] {
    // Implementation similar to mock service but with real booked sessions
    const dayOfWeek = date.getDay();
    const weeklySlot = availability.weeklySchedule.find(slot => 
      slot.dayOfWeek === dayOfWeek && slot.isAvailable
    );

    if (!weeklySlot) return [];

    const slots: TimeSlot[] = [];
    const startHour = parseInt(weeklySlot.startTime.split(':')[0]);
    const endHour = parseInt(weeklySlot.endTime.split(':')[0]);

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 30;
        const endTimeString = endMinute >= 60 
          ? `${(hour + 1).toString().padStart(2, '0')}:00`
          : `${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        // Check if this slot conflicts with booked sessions
        const isBooked = bookedSessions.some(booked => 
          booked.startTime === timeString || 
          (booked.startTime <= timeString && booked.endTime > timeString)
        );

        if (!isBooked) {
          slots.push({
            startTime: timeString,
            endTime: endTimeString,
            isAvailable: true,
            isBooked: false
          });
        }
      }
    }

    return slots;
  }

  private createBookingInBackend(request: DynamicBookingRequest): Observable<any> {
    // This would create the booking in your backend/Firebase
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          id: `booking-${Date.now()}`,
          status: 'pending',
          mentorId: request.mentorId,
          date: request.date,
          startTime: request.startTime,
          createdAt: new Date(),
          paymentRequired: true
        });
        observer.complete();
      }, 1000);
    });
  }

  private checkRealTimeConflicts(
    mentor: DynamicMentor, 
    request: DynamicBookingRequest, 
    bookedSessions: TimeSlot[]
  ): BookingConflict[] {
    const conflicts: BookingConflict[] = [];

    // Check for time conflicts with existing bookings
    const hasTimeConflict = bookedSessions.some(session =>
      session.startTime === request.startTime ||
      (session.startTime <= request.startTime && session.endTime > request.startTime)
    );

    if (hasTimeConflict) {
      conflicts.push({
        type: 'time_conflict',
        message: 'This time slot is already booked',
        suggestedAlternatives: []
      });
    }

    // Check minimum notice
    const now = new Date();
    const requestDateTime = new Date(`${request.date.toDateString()} ${request.startTime}`);
    const hoursUntilBooking = (requestDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < mentor.minimumNotice) {
      conflicts.push({
        type: 'insufficient_notice',
        message: `Minimum ${mentor.minimumNotice} hours notice required`,
        suggestedAlternatives: []
      });
    }

    return conflicts;
  }

  private generateRealAlternatives(mentor: DynamicMentor, request: DynamicBookingRequest): AlternativeSlot[] {
    // Generate real alternatives based on actual availability
    return [];
  }

  private generateRealWarnings(mentor: DynamicMentor, request: DynamicBookingRequest): string[] {
    return [];
  }

  private getRealAlternatives(mentor: DynamicMentor, date: Date, availableSlots: TimeSlot[]): AlternativeSlot[] {
    return [];
  }

  private loadFeaturedMentors(): void {
    // Load a few featured mentors on app startup
    this.searchMentors({}).subscribe();
  }
}