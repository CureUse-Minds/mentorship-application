export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  location?: string;
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet';
      };
    };
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  visibility?: 'default' | 'public' | 'private';
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface GoogleCalendarApiResponse {
  kind: string;
  etag: string;
  summary: string;
  timeZone: string;
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export interface CalendarSyncSettings {
  syncEnabled: boolean;
  defaultCalendarId: string;
  syncDirection: 'both' | 'import-only' | 'export-only';
  autoCreateMeetLinks: boolean;
  defaultReminders: Array<{
    method: 'email' | 'popup';
    minutes: number;
  }>;
  syncCategories: {
    mentorshipSessions: boolean;
    goals: boolean;
    meetings: boolean;
    deadlines: boolean;
  };
}