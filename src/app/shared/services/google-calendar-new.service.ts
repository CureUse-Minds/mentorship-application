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
  
  private isInitialized = false;
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
    this.initializeGoogleServices();
  }

  /**
   * Initialize Google Services with new Google Identity Services (GIS)
   */
  private async initializeGoogleServices(): Promise<void> {
    try {
      await this.loadGoogleScripts();
      await this.initializeGapi();
      this.initializeTokenClient();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google services:', error);
    }
  }

  /**
   * Load required Google scripts
   */
  private loadGoogleScripts(): Promise<void> {
    return Promise.all([
      this.loadScript('https://apis.google.com/js/api.js'),
      this.loadScript('https://accounts.google.com/gsi/client')
    ]).then(() => {});
  }

  /**
   * Load a script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (src.includes('api.js') && typeof gapi !== 'undefined') {
        resolve();
        return;
      }
      if (src.includes('gsi/client') && typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google API client
   */
  private async initializeGapi(): Promise<void> {
    return new Promise<void>((resolve) => {
      gapi.load('client', async () => {
        await gapi.client.init({
          apiKey: environment.googleCalendar.apiKey,
          discoveryDocs: [this.DISCOVERY_DOC],
        });
        resolve();
      });
    });
  }

  /**
   * Initialize Google Identity Services token client
   */
  private initializeTokenClient(): void {
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: environment.googleCalendar.clientId,
      scope: this.SCOPES,
      callback: (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          this.accessToken = tokenResponse.access_token;
          gapi.client.setToken({ access_token: tokenResponse.access_token });
        }
      },
    });
  }

  /**
   * Authenticate with Google Calendar using new GIS
   */
  async authenticateGoogleCalendar(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeGoogleServices();
      }

      return new Promise((resolve, reject) => {
        this.tokenClient.callback = (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(tokenResponse.error);
            return;
          }
          
          if (tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            gapi.client.setToken({ access_token: tokenResponse.access_token });
            console.log('Google Calendar authentication successful');
            resolve(true);
          } else {
            reject('No access token received');
          }
        };

        this.tokenClient.requestAccessToken({ prompt: 'consent' });
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
    return this.accessToken !== null && gapi.client.getToken() !== null;
  }

  /**
   * Get user's Google calendars
   */
  getUserCalendars(): Observable<any[]> {
    return from(this.ensureAuthenticated()).pipe(
      switchMap(() => {
        return gapi.client.calendar.calendarList.list();
      }),
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

    return from(this.ensureAuthenticated()).pipe(
      switchMap(() => {
        return gapi.client.calendar.events.insert({
          calendarId: this.syncSettingsSubject.value.defaultCalendarId,
          resource: googleEvent,
          conferenceDataVersion: 1
        });
      }),
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

    return from(this.ensureAuthenticated()).pipe(
      switchMap(() => {
        return gapi.client.calendar.events.update({
          calendarId: this.syncSettingsSubject.value.defaultCalendarId,
          eventId: eventId,
          resource: googleEvent
        });
      }),
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
    return from(this.ensureAuthenticated()).pipe(
      switchMap(() => {
        return gapi.client.calendar.events.delete({
          calendarId: this.syncSettingsSubject.value.defaultCalendarId,
          eventId: eventId
        });
      }),
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
    return from(this.ensureAuthenticated()).pipe(
      switchMap(() => {
        return gapi.client.calendar.events.list({
          calendarId: this.syncSettingsSubject.value.defaultCalendarId,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        });
      }),
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
    return {
      id: `google-${googleEvent.id}`,
      title: googleEvent.summary,
      description: googleEvent.description,
      type: this.determineEventType(googleEvent),
      date: new Date(googleEvent.start.dateTime),
      startTime: this.extractTime(googleEvent.start.dateTime),
      endTime: this.extractTime(googleEvent.end.dateTime),
      status: googleEvent.status === 'cancelled' ? 'cancelled' : 'scheduled',
      location: googleEvent.location,
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
   * Ensure user is authenticated before making API calls
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.isGoogleCalendarAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }
  }

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