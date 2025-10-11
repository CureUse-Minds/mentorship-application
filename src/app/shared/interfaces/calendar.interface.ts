export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: 'session' | 'goal' | 'meeting' | 'reminder' | 'deadline' | 'imported';
  date: Date;
  startTime?: string;
  endTime?: string;
  duration?: string;
  participantId?: string;
  participantName?: string;
  participantEmail?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  location?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isImported?: boolean;
  googleEventId?: string;
  originalStartTime?: Date;
  originalEndTime?: Date;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number; // every X days/weeks/months
  endDate?: Date;
  endAfterOccurrences?: number;
}

export interface MentorshipSession {
  id: string;
  title: string;
  description?: string;
  mentorId: string;
  menteeId: string;
  mentorName: string;
  menteeName: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
  location?: string;
  meetingLink?: string;
  agenda?: string[];
  notes?: string;
  feedback?: SessionFeedback;
  googleEventId?: string; // Track Google Calendar event ID for sync
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionFeedback {
  mentorRating?: number;
  menteeRating?: number;
  mentorComments?: string;
  menteeComments?: string;
  objectives?: string[];
  accomplishments?: string[];
  nextSteps?: string[];
}

export interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  hasEvents: boolean;
  events: CalendarEvent[];
  sessions: MentorshipSession[];
}

export interface CalendarFilter {
  showSessions: boolean;
  showGoals: boolean;
  showMeetings: boolean;
  showReminders: boolean;
  showDeadlines: boolean;
  showImported?: boolean;
  participantId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CreateSessionRequest {
  title: string;
  description?: string;
  participantId: string;
  date: Date;
  startTime: string;
  duration: string;
  location?: string;
  meetingLink?: string;
  agenda?: string[];
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
}

export interface UpdateSessionRequest extends Partial<CreateSessionRequest> {
  id: string;
  status?: MentorshipSession['status'];
  notes?: string;
}