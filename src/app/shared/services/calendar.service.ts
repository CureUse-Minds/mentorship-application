import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, map, combineLatest, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { GoogleCalendarService } from './google-calendar.service';
import { 
  CalendarEvent, 
  MentorshipSession, 
  CalendarDay, 
  CalendarFilter,
  CreateSessionRequest,
  UpdateSessionRequest 
} from '../interfaces/calendar.interface';

@Injectable({
  providedIn: 'root'
})
export class CalendarService implements OnDestroy {
  private authService = inject(AuthService);
  private googleCalendarService = inject(GoogleCalendarService);
  
  // In-memory storage (in real app, this would connect to Firebase/backend)
  private eventsSubject = new BehaviorSubject<CalendarEvent[]>([]);
  private sessionsSubject = new BehaviorSubject<MentorshipSession[]>([]);
  private importedEventsSubject = new BehaviorSubject<CalendarEvent[]>([]);
  private filterSubject = new BehaviorSubject<CalendarFilter>({
    showSessions: true,
    showGoals: true,
    showMeetings: true,
    showReminders: true,
    showDeadlines: true,
    showImported: true
  });

  // Public observables
  public events$ = this.eventsSubject.asObservable();
  public sessions$ = this.sessionsSubject.asObservable();
  public importedEvents$ = this.importedEventsSubject.asObservable();
  public filter$ = this.filterSubject.asObservable();

  constructor() {
    // Initialize with empty data
    this.initializeData();
    
    // Start automatic Google Calendar sync
    this.initializeAutomaticSync();
  }

  // Get filtered events and sessions
  getFilteredData(): Observable<{events: CalendarEvent[], sessions: MentorshipSession[]}> {
    return combineLatest([
      this.events$,
      this.sessions$,
      this.importedEvents$,
      this.filter$,
      this.authService.user$
    ]).pipe(
      map(([events, sessions, importedEvents, filter, user]) => {
        if (!user) return { events: [], sessions: [] };

        // Combine regular events with imported Google Calendar events
        const allEvents = [...events, ...importedEvents];

        // Filter events based on current filter settings
        const filteredEvents = allEvents.filter(event => {
          // User-specific filtering (skip for imported events as they belong to the user)
          if (!event.isImported) {
            const isUserEvent = event.createdBy === user.id || 
                               event.participantId === user.id;
            
            if (!isUserEvent) return false;
          }

          // Type filtering
          switch (event.type) {
            case 'session': return filter.showSessions;
            case 'goal': return filter.showGoals;
            case 'meeting': return filter.showMeetings;
            case 'reminder': return filter.showReminders;
            case 'deadline': return filter.showDeadlines;
            case 'imported': return filter.showImported !== false; // Show imported events unless explicitly disabled
            default: return true;
          }
        });

        // Filter sessions
        const filteredSessions = sessions.filter(session => {
          return filter.showSessions && 
                 (session.mentorId === user.id || session.menteeId === user.id);
        });

        return { events: filteredEvents, sessions: filteredSessions };
      })
    );
  }

  // Generate calendar days for a specific month
  generateCalendarDays(year: number, month: number): Observable<CalendarDay[]> {
    return this.getFilteredData().pipe(
      map(({ events, sessions }) => {
        const today = new Date();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const calendarDays: CalendarDay[] = [];

        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          
          // Get events for this day
          const dayEvents = events.filter(event => 
            this.isSameDay(event.date, date)
          );
          
          // Get sessions for this day
          const daySessions = sessions.filter(session => 
            this.isSameDay(session.date, date)
          );



          const day: CalendarDay = {
            date: new Date(date),
            day: date.getDate(),
            isCurrentMonth: date.getMonth() === month,
            isToday: this.isSameDay(date, today),
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            hasEvents: dayEvents.length > 0 || daySessions.length > 0,
            events: dayEvents,
            sessions: daySessions
          };

          calendarDays.push(day);
        }

        return calendarDays;
      })
    );
  }

  // Get upcoming sessions (including both mentorship sessions and imported calendar events)
  getUpcomingSessions(limit: number = 5): Observable<MentorshipSession[]> {
    return combineLatest([this.sessions$, this.importedEvents$]).pipe(
      map(([sessions, importedEvents]) => {
        const now = new Date();
        
        // Filter upcoming mentorship sessions
        const upcomingSessions = sessions
          .filter(session => {
            const sessionDate = new Date(session.date);
            return sessionDate >= now && 
                   (session.status === 'pending' || session.status === 'confirmed');
          });

        // Convert upcoming imported events to session-like format for display
        const upcomingImportedEvents = importedEvents
          .filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= now;
          })
          .map(event => ({
            id: event.id,
            title: event.title,
            description: event.description || '',
            mentorId: 'imported',
            menteeId: 'imported',
            mentorName: 'Google Calendar',
            menteeName: 'Event',
            date: event.date,
            startTime: event.startTime || '00:00',
            endTime: event.endTime || '01:00',
            duration: event.duration || '1 hour',
            status: 'confirmed' as const,
            meetingLink: '',
            agenda: [],
            location: event.location || '',
            isImported: true,
            googleEventId: event.googleEventId,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
          } as MentorshipSession));

        // Combine and sort all upcoming items
        const allUpcoming = [...upcomingSessions, ...upcomingImportedEvents]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, limit);

        return allUpcoming;
      })
    );
  }

  // CRUD Operations for Sessions
  createSession(sessionData: CreateSessionRequest): Observable<MentorshipSession> {
    return new Observable(observer => {
      this.authService.user$.pipe(
        map(user => {
          if (!user) {
            throw new Error('User not authenticated');
          }

          const newSession: MentorshipSession = {
            id: this.generateId(),
            ...sessionData,
            mentorId: user.role === 'mentor' ? user.id : sessionData.participantId,
            menteeId: user.role === 'mentee' ? user.id : sessionData.participantId,
            mentorName: user.role === 'mentor' ? `${user.firstName} ${user.lastName}` : 'Mentor Name',
            menteeName: user.role === 'mentee' ? `${user.firstName} ${user.lastName}` : 'Mentee Name',
            endTime: this.calculateEndTime(sessionData.startTime, sessionData.duration),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Add to sessions array
          const currentSessions = this.sessionsSubject.value;
          this.sessionsSubject.next([...currentSessions, newSession]);

          observer.next(newSession);
          observer.complete();
          return newSession;
        })
      ).subscribe();
    });
  }

  updateSession(updateData: UpdateSessionRequest): Observable<MentorshipSession> {
    return new Observable(observer => {
      const currentSessions = this.sessionsSubject.value;
      const sessionIndex = currentSessions.findIndex(s => s.id === updateData.id);
      
      if (sessionIndex === -1) {
        observer.error(new Error('Session not found'));
        return;
      }

      const updatedSession: MentorshipSession = {
        ...currentSessions[sessionIndex],
        ...updateData,
        updatedAt: new Date()
      };

      if (updateData.startTime && updateData.duration) {
        updatedSession.endTime = this.calculateEndTime(updateData.startTime, updateData.duration);
      }

      const updatedSessions = [...currentSessions];
      updatedSessions[sessionIndex] = updatedSession;
      this.sessionsSubject.next(updatedSessions);

      observer.next(updatedSession);
      observer.complete();
    });
  }

  deleteSession(sessionId: string): Observable<boolean> {
    return new Observable(observer => {
      const currentSessions = this.sessionsSubject.value;
      const filteredSessions = currentSessions.filter(s => s.id !== sessionId);
      
      if (filteredSessions.length === currentSessions.length) {
        observer.error(new Error('Session not found'));
        return;
      }

      this.sessionsSubject.next(filteredSessions);
      observer.next(true);
      observer.complete();
    });
  }

  // Filter methods
  updateFilter(filter: Partial<CalendarFilter>): void {
    const currentFilter = this.filterSubject.value;
    this.filterSubject.next({ ...currentFilter, ...filter });
  }

  getFilter(): CalendarFilter {
    return this.filterSubject.value;
  }

  // Utility methods
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private calculateEndTime(startTime: string, duration: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const durationMinutes = this.parseDuration(duration);
    
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }

  private parseDuration(duration: string): number {
    // Parse duration like "1 hour", "45 minutes", "1.5 hours"
    const match = duration.match(/(\d+(?:\.\d+)?)\s*(hour|minute)s?/i);
    if (!match) return 60; // default to 1 hour
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    return unit.startsWith('hour') ? value * 60 : value;
  }

  private initializeData(): void {
    // Initialize with empty data - real data will come from authentication and database
    this.eventsSubject.next([]);
    this.sessionsSubject.next([]);
    this.importedEventsSubject.next([]);
  }

  // Google Calendar Integration Methods

  /**
   * Authenticate with Google Calendar
   */
  async authenticateGoogleCalendar(): Promise<boolean> {
    return await this.googleCalendarService.authenticateGoogleCalendar();
  }

  /**
   * Check if Google Calendar is authenticated
   */
  isGoogleCalendarAuthenticated(): boolean {
    return this.googleCalendarService.isGoogleCalendarAuthenticated();
  }

  /**
   * Get available Google calendars
   */
  getGoogleCalendars(): Observable<any[]> {
    return this.googleCalendarService.getUserCalendars();
  }

  /**
   * Sync a session to Google Calendar
   */
  syncSessionToGoogle(sessionId: string): Observable<any> {
    return this.getSessionById(sessionId).pipe(
      switchMap(session => {
        if (!session) {
          throw new Error('Session not found');
        }
        return this.googleCalendarService.syncSessionToGoogle(session);
      }),
      tap(googleEvent => {
        // Store the Google event ID for future updates
        if (googleEvent.id) {
          this.updateSessionGoogleEventId(sessionId, googleEvent.id);
        }
      })
    );
  }

  /**
   * Import events from Google Calendar
   */
  importFromGoogleCalendar(startDate: Date, endDate: Date): Observable<CalendarEvent[]> {
    return this.googleCalendarService.importGoogleCalendarEvents(startDate, endDate).pipe(
      map(googleEvents => 
        googleEvents.map(event => 
          this.googleCalendarService.convertGoogleEventToInternal(event)
        )
      ),
      tap(importedEvents => {
        // Add imported events to the imported events subject
        const currentImportedEvents = this.importedEventsSubject.value;
        const mergedEvents = this.mergeImportedEvents(currentImportedEvents, importedEvents);
        this.importedEventsSubject.next(mergedEvents);
      })
    );
  }

  /**
   * Enable/disable Google Calendar sync
   */
  toggleGoogleCalendarSync(enabled: boolean): void {
    this.googleCalendarService.updateSyncSettings({ syncEnabled: enabled });
  }

  /**
   * Update Google Calendar sync settings
   */
  updateGoogleCalendarSettings(settings: any): void {
    this.googleCalendarService.updateSyncSettings(settings);
  }

  /**
   * Get Google Calendar sync settings
   */
  getGoogleCalendarSettings(): Observable<any> {
    return this.googleCalendarService.syncSettings$;
  }

  /**
   * Sign out from Google Calendar
   */
  signOut(): void {
    this.googleCalendarService.signOut();
  }

  /**
   * Add imported Google Calendar events to the calendar
   */
  addImportedEvents(events: any[]): void {
    const convertedEvents: CalendarEvent[] = events.map(event => ({
      id: event.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: event.title || event.summary || 'Untitled Event',
      description: event.description || '',
      type: 'imported' as const,
      date: this.parseEventDate(event.start || event.startTime),
      startTime: this.formatTime(event.start || event.startTime),
      endTime: this.formatTime(event.end || event.endTime),
      status: 'confirmed' as const,
      location: event.location || '',
      isImported: true,
      googleEventId: event.id,
      originalStartTime: this.parseEventDate(event.start || event.startTime),
      originalEndTime: this.parseEventDate(event.end || event.endTime),
      createdBy: 'google-calendar',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Add to imported events subject
    const currentImportedEvents = this.importedEventsSubject.value;
    const mergedEvents = this.mergeImportedEvents(currentImportedEvents, convertedEvents);
    this.importedEventsSubject.next(mergedEvents);
  }

  /**
   * Clear all imported events
   */
  clearImportedEvents(): void {
    this.importedEventsSubject.next([]);
  }

  // Private helper methods for Google Calendar integration

  private updateSessionGoogleEventId(sessionId: string, googleEventId: string): void {
    const sessions = this.sessionsSubject.value;
    const updatedSessions = sessions.map(session => 
      session.id === sessionId 
        ? { ...session, googleEventId } 
        : session
    );
    this.sessionsSubject.next(updatedSessions);
  }

  private mergeImportedEvents(currentEvents: CalendarEvent[], importedEvents: CalendarEvent[]): CalendarEvent[] {
    const existingIds = new Set(currentEvents.map(event => event.id));
    const newEvents = importedEvents.filter(event => !existingIds.has(event.id));
    return [...currentEvents, ...newEvents];
  }

  private getSessionById(sessionId: string): Observable<MentorshipSession | undefined> {
    return this.sessionsSubject.pipe(
      map(sessions => sessions.find(session => session.id === sessionId))
    );
  }

  private parseEventDate(dateInput: any): Date {
    if (!dateInput) return new Date();
    
    try {
      if (typeof dateInput === 'string') {
        return new Date(dateInput);
      } else if (dateInput instanceof Date) {
        return dateInput;
      } else if (dateInput.dateTime) {
        return new Date(dateInput.dateTime);
      } else if (dateInput.date) {
        return new Date(dateInput.date);
      }
      return new Date();
    } catch (error) {
      console.warn('Error parsing event date:', error);
      return new Date();
    }
  }

  private formatTime(dateInput: any): string {
    if (!dateInput) return '';
    
    try {
      const date = this.parseEventDate(dateInput);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.warn('Error formatting time:', error);
      return '';
    }
  }

  // Automatic Sync Functionality
  private syncInterval: any;
  private isAutoSyncEnabled = true;
  private lastSyncTime: Date | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize automatic Google Calendar synchronization
   */
  private initializeAutomaticSync(): void {
    // Initial sync after a short delay (to allow app to fully load)
    setTimeout(() => {
      this.performAutoSync();
    }, 3000); // 3 seconds delay

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.performAutoSync();
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Perform automatic sync if authenticated
   */
  public performAutoSync(): void {
    if (!this.isAutoSyncEnabled) {
      return;
    }

    // Check if Google Calendar is authenticated
    if (!this.googleCalendarService.isGoogleCalendarAuthenticated()) {
      return;
    }
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3); // Sync next 3 months

    // First, sync unsynced mentorship sessions TO Google Calendar
    this.syncPendingSessionsToGoogle().then(() => {
      // Then import events FROM Google Calendar
      this.importFromGoogleCalendar(startDate, endDate).subscribe({
        next: (events) => {
          this.lastSyncTime = new Date();
        },
        error: (error: any) => {
          // Auto-sync import failed silently
        }
      });
    }).catch((error: any) => {
      // Auto-sync export failed silently
    });
  }

  /**
   * Enable or disable automatic sync
   */
  setAutoSyncEnabled(enabled: boolean): void {
    this.isAutoSyncEnabled = enabled;
    
    if (enabled && !this.syncInterval) {
      this.initializeAutomaticSync();
    } else if (!enabled && this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get whether auto-sync is enabled
   */
  getAutoSyncEnabled(): boolean {
    return this.isAutoSyncEnabled;
  }

  /**
   * Get auto-sync status
   */
  getAutoSyncStatus(): { 
    enabled: boolean; 
    lastSync: Date | null; 
    nextSync: Date | null;
    syncedSessionsCount: number;
    importedEventsCount: number;
  } {
    const nextSync = this.lastSyncTime 
      ? new Date(this.lastSyncTime.getTime() + this.SYNC_INTERVAL_MS)
      : null;
    
    const sessions = this.sessionsSubject.value;
    const syncedSessionsCount = sessions.filter(session => session.googleEventId).length;
    const importedEventsCount = this.importedEventsSubject.value.length;
    
    return {
      enabled: this.isAutoSyncEnabled,
      lastSync: this.lastSyncTime,
      nextSync: nextSync,
      syncedSessionsCount,
      importedEventsCount
    };
  }

  /**
   * Sync all unsynced mentorship sessions to Google Calendar
   */
  private async syncPendingSessionsToGoogle(): Promise<void> {
    const sessions = this.sessionsSubject.value;
    const unsyncedSessions = sessions.filter(session => 
      !session.googleEventId && 
      (session.status === 'confirmed' || session.status === 'pending')
    );

    for (const session of unsyncedSessions) {
      try {
        await this.syncSessionToGoogle(session.id).toPromise();
      } catch (error: any) {
        // Session sync failed silently
      }
    }
  }

  /**
   * Manually trigger sync
   */
  triggerManualSync(): void {
    this.performAutoSync();
  }

  /**
   * Get all events and sessions for a specific day
   */
  getEventsForDay(date: Date): Observable<{events: CalendarEvent[], sessions: MentorshipSession[]}> {
    return this.getFilteredData().pipe(
      map(({ events, sessions }) => {
        const dayEvents = events.filter(event => this.isSameDay(event.date, date));
        const daySessions = sessions.filter(session => this.isSameDay(session.date, date));
        
        return {
          events: dayEvents.sort((a, b) => {
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
          }),
          sessions: daySessions.sort((a, b) => a.startTime.localeCompare(b.startTime))
        };
      })
    );
  }

  /**
   * Clean up intervals when service is destroyed
   */
  ngOnDestroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}