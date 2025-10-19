import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError, combineLatest } from 'rxjs';
import { map, switchMap, catchError, debounceTime, distinctUntilChanged } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class DynamicMentorService {
  
  private mentorsSubject = new BehaviorSubject<DynamicMentor[]>([]);
  public mentors$ = this.mentorsSubject.asObservable();
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor() {
    this.loadInitialMentors();
  }

  /**
   * Load mentors with advanced filtering and search
   */
  searchMentors(criteria: MentorSearchCriteria): Observable<PaginatedMentors> {
    this.loadingSubject.next(true);
    
    return this.getMockMentors().pipe(
      map(mentors => this.filterMentors(mentors, criteria)),
      map(filteredMentors => ({
        mentors: filteredMentors,
        total: filteredMentors.length,
        page: 1,
        limit: 10,
        hasMore: false
      })),
      catchError(error => {
        console.error('Error searching mentors:', error);
        return of({ mentors: [], total: 0, page: 1, limit: 10, hasMore: false });
      }),
      map(result => {
        this.loadingSubject.next(false);
        return result;
      })
    );
  }

  /**
   * Get real-time availability for a specific mentor and date
   */
  getMentorAvailability(request: AvailabilityRequest): Observable<AvailabilityResponse> {
    return this.getMentorById(request.mentorId).pipe(
      switchMap(mentor => {
        if (!mentor) {
          return throwError(() => new Error('Mentor not found'));
        }
        
        const availableSlots = this.generateAvailableTimeSlots(
          mentor.availability, 
          request.date,
          mentor.sessionTypes
        );
        
        const bookedSlots = this.getBookedSlots(request.mentorId, request.date);
        
        return of({
          mentorId: request.mentorId,
          date: request.date,
          availableSlots: availableSlots.filter(slot => 
            !bookedSlots.some(booked => 
              booked.startTime === slot.startTime
            )
          ),
          bookedSlots: bookedSlots,
          suggestedAlternatives: this.getSuggestedAlternatives(mentor, request.date)
        });
      }),
      catchError(error => {
        console.error('Error getting availability:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Validate booking request and check for conflicts
   */
  validateBooking(request: DynamicBookingRequest): Observable<BookingValidation> {
    return this.getMentorById(request.mentorId).pipe(
      switchMap(mentor => {
        if (!mentor) {
          return of({
            isValid: false,
            errors: ['Mentor not found'],
            warnings: [],
            suggestions: []
          });
        }

        const conflicts = this.checkBookingConflicts(mentor, request);
        const suggestions = conflicts.length > 0 
          ? this.generateAlternativeSlots(mentor, request)
          : [];

        return of({
          isValid: conflicts.length === 0,
          errors: conflicts.map(c => c.message),
          warnings: this.generateWarnings(mentor, request),
          suggestions: suggestions
        });
      })
    );
  }

  /**
   * Create a dynamic booking with real-time validation
   */
  createDynamicBooking(request: DynamicBookingRequest): Observable<any> {
    return this.validateBooking(request).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return throwError(() => new Error(`Booking validation failed: ${validation.errors.join(', ')}`));
        }

        // Here you would integrate with your backend API
        // For now, we'll simulate the booking creation
        return this.simulateBookingCreation(request);
      })
    );
  }

  /**
   * Get mentor by ID with real-time data
   */
  getMentorById(mentorId: string): Observable<DynamicMentor | null> {
    return this.mentors$.pipe(
      map(mentors => mentors.find(mentor => mentor.id === mentorId) || null)
    );
  }

  /**
   * Get available session types for a mentor
   */
  getSessionTypes(mentorId: string): Observable<SessionType[]> {
    return this.getMentorById(mentorId).pipe(
      map(mentor => mentor?.sessionTypes || [])
    );
  }

  // Private helper methods

  private loadInitialMentors(): void {
    this.getMockMentors().subscribe(mentors => {
      this.mentorsSubject.next(mentors);
    });
  }

  private getMockMentors(): Observable<DynamicMentor[]> {
    // In a real app, this would be an HTTP request to your backend
    const mockMentors: DynamicMentor[] = [
      {
        id: 'mentor-1',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        expertise: ['Software Development', 'React', 'Node.js', 'TypeScript'],
        bio: 'Senior Software Engineer with 8+ years experience in full-stack development.',
        rating: 4.8,
        totalSessions: 156,
        isActive: true,
        languages: ['English', 'Spanish'],
        timezone: 'America/New_York',
        availability: {
          weeklySchedule: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true },
            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true },
            { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', isAvailable: true }
          ],
          dateOverrides: [],
          blockedPeriods: []
        },
        sessionTypes: [
          { id: 'code-review', name: 'Code Review', description: 'Review your code and provide feedback', duration: 60, isActive: true },
          { id: 'career-guidance', name: 'Career Guidance', description: 'Career planning and advice', duration: 45, isActive: true },
          { id: 'technical-interview', name: 'Mock Technical Interview', description: 'Practice technical interviews', duration: 90, isActive: true }
        ],
        minimumNotice: 2, // 2 hours
        maximumAdvanceBooking: 30 // 30 days
      },
      {
        id: 'mentor-2',
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@example.com',
        expertise: ['Data Science', 'Machine Learning', 'Python', 'AI'],
        bio: 'Data Science Lead with expertise in ML and AI solutions.',
        rating: 4.9,
        totalSessions: 203,
        isActive: true,
        languages: ['English', 'Mandarin'],
        timezone: 'America/Los_Angeles',
        availability: {
          weeklySchedule: [
            { dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isAvailable: true },
            { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', isAvailable: true },
            { dayOfWeek: 3, startTime: '10:00', endTime: '18:00', isAvailable: true },
            { dayOfWeek: 4, startTime: '10:00', endTime: '18:00', isAvailable: true },
            { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isAvailable: true }
          ],
          dateOverrides: [],
          blockedPeriods: []
        },
        sessionTypes: [
          { id: 'ml-project', name: 'ML Project Review', description: 'Review your machine learning project', duration: 75, isActive: true },
          { id: 'data-analysis', name: 'Data Analysis Help', description: 'Help with data analysis and visualization', duration: 60, isActive: true }
        ],
        minimumNotice: 4,
        maximumAdvanceBooking: 45
      }
    ];

    return of(mockMentors);
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

  private generateAvailableTimeSlots(
    availability: MentorAvailability, 
    date: Date,
    sessionTypes: SessionType[]
  ): TimeSlot[] {
    const dayOfWeek = date.getDay();
    const weeklySlot = availability.weeklySchedule.find(slot => 
      slot.dayOfWeek === dayOfWeek && slot.isAvailable
    );

    if (!weeklySlot) {
      return [];
    }

    const slots: TimeSlot[] = [];
    const startHour = parseInt(weeklySlot.startTime.split(':')[0]);
    const endHour = parseInt(weeklySlot.endTime.split(':')[0]);

    // Generate 30-minute slots
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 30;
        const endTimeString = endMinute >= 60 
          ? `${(hour + 1).toString().padStart(2, '0')}:00`
          : `${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        slots.push({
          startTime: timeString,
          endTime: endTimeString,
          isAvailable: true,
          isBooked: false
        });
      }
    }

    return slots;
  }

  private getBookedSlots(mentorId: string, date: Date): TimeSlot[] {
    // In a real app, this would query your database for booked sessions
    // For now, return some mock booked slots
    return [
      { startTime: '10:00', endTime: '11:00', isAvailable: false, isBooked: true },
      { startTime: '14:00', endTime: '15:00', isAvailable: false, isBooked: true }
    ];
  }

  private getSuggestedAlternatives(mentor: DynamicMentor, requestedDate: Date): AlternativeSlot[] {
    // Generate alternative time slots for nearby dates
    const alternatives: AlternativeSlot[] = [];
    
    for (let i = 1; i <= 3; i++) {
      const alternativeDate = new Date(requestedDate);
      alternativeDate.setDate(alternativeDate.getDate() + i);
      
      const availableSlots = this.generateAvailableTimeSlots(
        mentor.availability,
        alternativeDate,
        mentor.sessionTypes
      );

      if (availableSlots.length > 0) {
        alternatives.push({
          date: alternativeDate,
          timeSlot: availableSlots[0],
          mentorId: mentor.id,
          mentorName: `${mentor.firstName} ${mentor.lastName}`,
          reason: `Available ${i} day${i > 1 ? 's' : ''} later`
        });
      }
    }

    return alternatives;
  }

  private checkBookingConflicts(mentor: DynamicMentor, request: DynamicBookingRequest): BookingConflict[] {
    const conflicts: BookingConflict[] = [];

    // Check minimum notice period
    const now = new Date();
    const requestDateTime = new Date(`${request.date.toDateString()} ${request.startTime}`);
    const hoursUntilBooking = (requestDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < mentor.minimumNotice) {
      conflicts.push({
        type: 'insufficient_notice',
        message: `Minimum ${mentor.minimumNotice} hours notice required`,
        suggestedAlternatives: this.getSuggestedAlternatives(mentor, request.date)
      });
    }

    // Check maximum advance booking
    const daysUntilBooking = (requestDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilBooking > mentor.maximumAdvanceBooking) {
      conflicts.push({
        type: 'too_far_advance',
        message: `Cannot book more than ${mentor.maximumAdvanceBooking} days in advance`,
        suggestedAlternatives: []
      });
    }

    return conflicts;
  }

  private generateAlternativeSlots(mentor: DynamicMentor, request: DynamicBookingRequest): AlternativeSlot[] {
    return this.getSuggestedAlternatives(mentor, request.date);
  }

  private generateWarnings(mentor: DynamicMentor, request: DynamicBookingRequest): string[] {
    const warnings: string[] = [];

    // Check if booking is close to mentor's break time
    const requestHour = parseInt(request.startTime.split(':')[0]);
    if (requestHour >= 12 && requestHour <= 13) {
      warnings.push('This time slot is during typical lunch hours');
    }

    return warnings;
  }

  private simulateBookingCreation(request: DynamicBookingRequest): Observable<any> {
    // Simulate API call delay
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          id: `booking-${Date.now()}`,
          status: 'pending',
          mentorId: request.mentorId,
          date: request.date,
          startTime: request.startTime,
          createdAt: new Date()
        });
        observer.complete();
      }, 1000);
    });
  }
}