// Dynamic Booking Interfaces for enhanced booking system
import { RecurringPattern } from './calendar.interface';

export interface DynamicMentor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  expertise: string[];
  bio: string;
  rating: number;
  totalSessions: number;
  isActive: boolean;
  languages: string[];
  timezone: string;
  // Professional information
  company?: string;
  position?: string;
  isVerified?: boolean;
  yearsOfExperience?: number;
  reviewCount?: number;
  // Availability configuration
  availability: MentorAvailability;
  // Booking preferences
  sessionTypes: SessionType[];
  minimumNotice: number; // hours
  maximumAdvanceBooking: number; // days
}

export interface MentorAvailability {
  // Weekly recurring availability
  weeklySchedule: WeeklyTimeSlot[];
  // Specific date overrides (vacation, busy days, etc.)
  dateOverrides: DateOverride[];
  // Break times and blocked periods
  blockedPeriods: BlockedPeriod[];
}

export interface WeeklyTimeSlot {
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  isAvailable: boolean;
}

export interface DateOverride {
  date: Date;
  isAvailable: boolean;
  customSlots?: TimeSlot[];
  reason?: string; // "Vacation", "Conference", etc.
}

export interface BlockedPeriod {
  startDateTime: Date;
  endDateTime: Date;
  reason: string;
  type: 'break' | 'meeting' | 'vacation' | 'other';
}

export interface SessionType {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  isActive: boolean;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  sessionTypeId?: string;
}

export interface AvailabilityRequest {
  mentorId: string;
  date: Date;
}

export interface AvailabilityResponse {
  mentorId: string;
  date: Date;
  availableSlots: TimeSlot[];
  bookedSlots: TimeSlot[];
  suggestedAlternatives?: AlternativeSlot[];
}

export interface AlternativeSlot {
  date: Date;
  timeSlot: TimeSlot;
  mentorId: string;
  mentorName: string;
  reason: string; // "Similar expertise", "Same time different day", etc.
}

export interface BookingValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: AlternativeSlot[];
}

export interface DynamicBookingRequest {
  mentorId: string;
  sessionTypeId: string;
  date: Date;
  startTime: string;
  studentId: string;
  message: string;
  agenda?: string[];
  preferredLanguage?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
}



export interface BookingConflict {
  type: 'time_conflict' | 'mentor_unavailable' | 'insufficient_notice' | 'too_far_advance';
  message: string;
  suggestedAlternatives: AlternativeSlot[];
}

// Real-time booking status
export interface BookingStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  createdAt: Date;
  updatedAt: Date;
  mentorResponse?: MentorResponse;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

export interface MentorResponse {
  status: 'accepted' | 'declined' | 'counter_offered';
  message?: string;
  counterOffer?: {
    newDate?: Date;
    newTime?: string;
    newDuration?: number;
    reason: string;
  };
  respondedAt: Date;
}

// Search and filtering
export interface MentorSearchCriteria {
  expertise?: string[];
  minRating?: number;
  languages?: string[];
  availability?: {
    date?: Date;
    timeRange?: { start: string; end: string };
  };
  sessionType?: string;
}

export interface PaginatedMentors {
  mentors: DynamicMentor[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}