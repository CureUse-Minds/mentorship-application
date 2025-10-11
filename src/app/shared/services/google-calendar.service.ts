import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { 
  GoogleCalendarEvent, 
  GoogleCalendarApiResponse, 
  CalendarSyncSettings 
} from '../interfaces/google-calendar.interface';
import { MentorshipSession, CalendarEvent } from '../interfaces/calendar.interface';

declare var gapi: any;
declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private authService = inject(AuthService);
  
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar';
  
  private isGapiInitialized = false;
  private isGisLoaded = false;
  private tokenClient: any;
  private accessToken: string | null = null;
  
  private syncSettingsSubject = new BehaviorSubject<CalendarSyncSettings>({
    syncEnabled: false,
    defaultCalendarId: 'primary',
    syncDirection: 'both',
    autoCreateMeetLinks: true,
    defaultReminders: [
      { method: 'popup', minutes: 15 },
      { method: 'email', minutes: 60 }
    ],
    syncCategories: {
      mentorshipSessions: true,
      goals: true,
      meetings: true,
      deadlines: false
    }
  });

  public syncSettings$ = this.syncSettingsSubject.asObservable();

  constructor() {
    this.initializeServices();
  }

  /**
   * Initialize Google Services
   */
  private async initializeServices(): Promise<void> {
    try {
      await this.loadGoogleIdentityServices();
      await this.initializeGoogleApiClient();
      this.initializeTokenClient();
    } catch (error) {
      console.error('Failed to initialize Google services:', error);
    }
  }

  /**
   * Load Google Identity Services script only
   */
  private loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts) {
        this.isGisLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.isGisLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google API client (without auth2)
   */
  private async initializeGoogleApiClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof gapi !== 'undefined' && this.isGapiInitialized) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = async () => {
        gapi.load('client', async () => {
          try {
            await gapi.client.init({
              apiKey: environment.googleCalendar.apiKey,
              discoveryDocs: [this.DISCOVERY_DOC],
            });
            this.isGapiInitialized = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google Identity Services token client
   */
  private initializeTokenClient(): void {
    console.log('Initializing token client...');
    console.log('GIS available:', typeof google !== 'undefined' && google.accounts);
    console.log('Client ID:', environment.googleCalendar.clientId);
    
    if (!this.isGisLoaded) {
      console.error('Google Identity Services not loaded');
      return;
    }

    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      console.error('Google Identity Services not properly loaded');
      return;
    }

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: environment.googleCalendar.clientId,
        scope: this.SCOPES,
        callback: (tokenResponse: any) => {
          console.log('Default callback - token response:', tokenResponse);
          if (tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            // Set token for API client
            if (typeof gapi !== 'undefined' && gapi.client) {
              gapi.client.setToken({ access_token: tokenResponse.access_token });
            }
          }
        },
      });
      console.log('Token client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize token client:', error);
    }
  }

  /**
   * Authenticate with Google Calendar using Google Identity Services
   */
  async authenticateGoogleCalendar(): Promise<boolean> {
    try {
      console.log('Starting Google Calendar authentication...');
      console.log('GIS loaded:', this.isGisLoaded);
      console.log('GAPI initialized:', this.isGapiInitialized);
      
      // Force re-initialization to ensure clean state
      await this.initializeServices();
      
      // Wait a bit for services to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!this.tokenClient) {
        console.error('Token client still not initialized after initialization');
        throw new Error('Token client not initialized');
      }

      console.log('Token client ready, requesting access...');

      return new Promise((resolve, reject) => {
        // Override callback for this specific authentication request
        this.tokenClient.callback = (tokenResponse: any) => {
          console.log('Token response received:', tokenResponse);
          
          if (tokenResponse.error) {
            console.error('Google Calendar authentication failed:', tokenResponse);
            reject(tokenResponse);
            return;
          }
          
          if (tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            gapi.client.setToken({ access_token: tokenResponse.access_token });
            console.log('Google Calendar authentication successful');
            resolve(true);
          } else {
            reject(new Error('No access token received'));
          }
        };

        // Request access token with explicit prompt
        this.tokenClient.requestAccessToken({ 
          prompt: 'consent',
          include_granted_scopes: true 
        });
      });
    } catch (error) {
      console.error('Google Calendar authentication failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated with Google Calendar
   */
  isGoogleCalendarAuthenticated(): boolean {
    return this.accessToken !== null && this.isGapiInitialized;
  }

  /**
   * Get user's Google calendars
   */
  getUserCalendars(): Observable<any[]> {
    if (!this.isGoogleCalendarAuthenticated()) {
      return throwError(() => new Error('Not authenticated with Google Calendar'));
    }

    return from(gapi.client.calendar.calendarList.list()).pipe(
      map((response: any) => response.result.items || []),
      catchError(error => {
        console.error('Error fetching calendars:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Sync mentorship session to Google Calendar
   */
  syncSessionToGoogle(session: MentorshipSession): Observable<GoogleCalendarEvent> {
    if (!this.isGoogleCalendarAuthenticated()) {
      return throwError(() => new Error('Not authenticated with Google Calendar'));
    }

    const googleEvent: GoogleCalendarEvent = {
      summary: session.title,
      description: this.buildSessionDescription(session),
      start: {
        dateTime: this.combineDateTime(session.date, session.startTime),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: this.combineDateTime(session.date, session.endTime),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: [
        { email: session.mentorId, displayName: session.mentorName },
        { email: session.menteeId, displayName: session.menteeName }
      ],
      location: session.location,
      reminders: {
        useDefault: false,
        overrides: this.syncSettingsSubject.value.defaultReminders
      }
    };

    // Add Google Meet link if enabled
    if (this.syncSettingsSubject.value.autoCreateMeetLinks) {
      googleEvent.conferenceData = {
        createRequest: {
          requestId: `meet-${session.id}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
    }

    return from(gapi.client.calendar.events.insert({
      calendarId: this.syncSettingsSubject.value.defaultCalendarId,
      resource: googleEvent,
      conferenceDataVersion: 1
    })).pipe(
      map((response: any) => response.result),
      catchError(error => {
        console.error('Error syncing session to Google Calendar:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update Google Calendar event
   */
  updateGoogleCalendarEvent(eventId: string, session: MentorshipSession): Observable<GoogleCalendarEvent> {
    if (!this.isGoogleCalendarAuthenticated()) {
      return throwError(() => new Error('Not authenticated with Google Calendar'));
    }

    const googleEvent: GoogleCalendarEvent = {
      summary: session.title,
      description: this.buildSessionDescription(session),
      start: {
        dateTime: this.combineDateTime(session.date, session.startTime),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: this.combineDateTime(session.date, session.endTime),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      status: session.status === 'cancelled' ? 'cancelled' : 'confirmed'
    };

    return from(gapi.client.calendar.events.update({
      calendarId: this.syncSettingsSubject.value.defaultCalendarId,
      eventId: eventId,
      resource: googleEvent
    })).pipe(
      map((response: any) => response.result),
      catchError(error => {
        console.error('Error updating Google Calendar event:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete Google Calendar event
   */
  deleteGoogleCalendarEvent(eventId: string): Observable<boolean> {
    if (!this.isGoogleCalendarAuthenticated()) {
      return throwError(() => new Error('Not authenticated with Google Calendar'));
    }

    return from(gapi.client.calendar.events.delete({
      calendarId: this.syncSettingsSubject.value.defaultCalendarId,
      eventId: eventId
    })).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting Google Calendar event:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Import Google Calendar events
   */
  importGoogleCalendarEvents(startDate: Date, endDate: Date): Observable<GoogleCalendarEvent[]> {
    if (!this.isGoogleCalendarAuthenticated()) {
      return throwError(() => new Error('Not authenticated with Google Calendar'));
    }

    return from(gapi.client.calendar.events.list({
      calendarId: this.syncSettingsSubject.value.defaultCalendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    })).pipe(
      map((response: any) => response.result.items || []),
      catchError(error => {
        console.error('Error importing Google Calendar events:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Convert Google Calendar event to internal event format
   */
  convertGoogleEventToInternal(googleEvent: GoogleCalendarEvent): CalendarEvent {
    const startDateTime = googleEvent.start.dateTime;
    const endDateTime = googleEvent.end.dateTime;
    
    return {
      id: `google-${googleEvent.id}`,
      title: googleEvent.summary,
      description: googleEvent.description,
      type: 'imported' as const,
      date: new Date(startDateTime),
      startTime: this.extractTime(startDateTime),
      endTime: this.extractTime(endDateTime),
      status: googleEvent.status === 'cancelled' ? 'cancelled' : 'scheduled',
      location: googleEvent.location,
      isImported: true,
      googleEventId: googleEvent.id,
      originalStartTime: new Date(startDateTime),
      originalEndTime: new Date(endDateTime),
      createdBy: 'google-import',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Update sync settings
   */
  updateSyncSettings(settings: Partial<CalendarSyncSettings>): void {
    const currentSettings = this.syncSettingsSubject.value;
    this.syncSettingsSubject.next({ ...currentSettings, ...settings });
  }

  /**
   * Get current sync settings
   */
  getSyncSettings(): CalendarSyncSettings {
    return this.syncSettingsSubject.value;
  }

  /**
   * Sign out from Google Calendar
   */
  signOut(): void {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken);
      this.accessToken = null;
      gapi.client.setToken(null);
    }
  }

  // Private utility methods

  /**
   * Build session description for Google Calendar
   */
  private buildSessionDescription(session: MentorshipSession): string {
    const parts = [];
    
    if (session.description) {
      parts.push(session.description);
    }
    
    parts.push(`Mentor: ${session.mentorName}`);
    parts.push(`Mentee: ${session.menteeName}`);
    
    if (session.agenda && session.agenda.length > 0) {
      parts.push('', 'Agenda:');
      session.agenda.forEach((item, index) => {
        parts.push(`${index + 1}. ${item}`);
      });
    }
    
    if (session.meetingLink) {
      parts.push('', `Meeting Link: ${session.meetingLink}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Combine date and time into ISO string
   */
  private combineDateTime(date: Date, time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime.toISOString();
  }

  /**
   * Extract time from ISO datetime string
   */
  private extractTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Determine event type from Google Calendar event
   */
  private determineEventType(googleEvent: GoogleCalendarEvent): CalendarEvent['type'] {
    const summary = googleEvent.summary.toLowerCase();
    
    if (summary.includes('mentoring') || summary.includes('session')) {
      return 'session';
    } else if (summary.includes('goal') || summary.includes('objective')) {
      return 'goal';
    } else if (summary.includes('meeting')) {
      return 'meeting';
    } else if (summary.includes('deadline') || summary.includes('due')) {
      return 'deadline';
    }
    
    return 'meeting'; // default
  }
}