import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../shared/services/calendar.service';
import { GoogleCalendarSyncComponent } from '../../shared/components/google-calendar-sync/google-calendar-sync.component';
import { DayEventsPopupComponent } from '../../shared/components/day-events-popup/day-events-popup.component';
import { CalendarDay, MentorshipSession, CalendarEvent } from '../../shared/interfaces/calendar.interface';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, FormsModule, GoogleCalendarSyncComponent, DayEventsPopupComponent],
  template: `
    <div class="p-6">
      <!-- Tab Navigation -->
      <div class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button 
              (click)="activeTab = 'calendar'"
              [class.border-blue-500]="activeTab === 'calendar'"
              [class.text-blue-600]="activeTab === 'calendar'"
              [class.border-transparent]="activeTab !== 'calendar'"
              [class.text-gray-500]="activeTab !== 'calendar'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm hover:text-gray-700 hover:border-gray-300">
              Sessions Calendar
            </button>
            <button 
              (click)="activeTab = 'google-sync'"
              [class.border-blue-500]="activeTab === 'google-sync'"
              [class.text-blue-600]="activeTab === 'google-sync'"
              [class.border-transparent]="activeTab !== 'google-sync'"
              [class.text-gray-500]="activeTab !== 'google-sync'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm hover:text-gray-700 hover:border-gray-300">
              Google Calendar Sync
            </button>
          </nav>
        </div>
      </div>

      @if (activeTab === 'calendar') {
        <div class="mb-6">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Sessions</h1>
              <p class="text-gray-600">View and manage your mentorship sessions in calendar format</p>
            </div>
          
          <!-- Filter Controls -->
          <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Session Filters</h3>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="checkbox" 
                       [(ngModel)]="showSessions" 
                       (change)="onFilterChange()"
                       class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="ml-2 text-sm font-gray-700 font-medium">Mentorship Sessions</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" 
                       [(ngModel)]="showMeetings" 
                       (change)="onFilterChange()"
                       class="rounded border-gray-300 text-purple-600 focus:ring-purple-500">
                <span class="ml-2 text-sm text-gray-700">1:1 Meetings</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" 
                       [(ngModel)]="showGoals" 
                       (change)="onFilterChange()"
                       class="rounded border-gray-300 text-green-600 focus:ring-green-500">
                <span class="ml-2 text-sm text-gray-700">Goal Deadlines</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" 
                       [(ngModel)]="showReminders" 
                       (change)="onFilterChange()"
                       class="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500">
                <span class="ml-2 text-sm text-gray-700">Session Reminders</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" 
                       [(ngModel)]="showImported" 
                       (change)="onFilterChange()"
                       class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                <span class="ml-2 text-sm text-gray-700">Google Calendar Events</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Calendar Header -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="previousMonth()" 
                      class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              
              <h2 class="text-xl font-semibold text-gray-900">
                {{ currentMonth }} {{ currentYear }}
              </h2>
              
              <button (click)="nextMonth()" 
                      class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
            
            <button (click)="onScheduleSession()" 
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Schedule Session
            </button>
          </div>
        </div>

        <!-- Calendar Grid -->
        <div class="p-4">
          @if (isLoading) {
            <div class="flex justify-center items-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span class="ml-2 text-gray-600">Loading calendar...</span>
            </div>
          } @else {
            <!-- Days of Week Headers -->
            <div class="grid grid-cols-7 gap-1 mb-2">
            <div class="p-2 text-sm font-medium text-gray-500 text-center">Sun</div>
            <div class="p-2 text-sm font-medium text-gray-500 text-center">Mon</div>
            <div class="p-2 text-sm font-medium text-gray-500 text-center">Tue</div>
            <div class="p-2 text-sm font-medium text-gray-500 text-center">Wed</div>
            <div class="p-2 text-sm font-medium text-gray-500 text-center">Thu</div>
            <div class="p-2 text-sm font-medium text-gray-500 text-center">Fri</div>
            <div class="p-2 text-sm font-medium text-gray-500 text-center">Sat</div>
          </div>

          <!-- Calendar Days -->
          <div class="grid grid-cols-7 gap-1">
            @for (day of calendarDays; track day.date) {
              <div class="min-h-24 p-1 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer"
                   [class.bg-gray-50]="!day.isCurrentMonth"
                   [class.bg-blue-50]="day.isToday"
                   [class.border-blue-200]="day.isToday"
                   [class.bg-red-50]="day.isWeekend && day.isCurrentMonth"
                   (click)="onDayClick(day)">
                
                <div class="flex justify-between items-start">
                  <span class="text-sm font-medium"
                        [class.text-gray-400]="!day.isCurrentMonth"
                        [class.text-blue-600]="day.isToday">
                    {{ day.day }}
                  </span>
                  
                  @if (day.hasEvents) {
                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                  }
                </div>

                <!-- Events and Sessions for this day -->
                @if ((day.events && day.events.length > 0) || (day.sessions && day.sessions.length > 0)) {
                  <div class="mt-1 space-y-1">
                    <!-- Regular Events -->
                    @for (event of day.events.slice(0, 1); track event.id) {
                      <div class="text-xs p-1 rounded text-white truncate"
                           [class]="getEventTypeColor(event.type)">
                        {{ event.title }}
                        @if (event.startTime) {
                          <span class="block text-xs opacity-75">{{ formatSessionTime(event.startTime) }}</span>
                        }
                      </div>
                    }
                    <!-- Sessions -->
                    @for (session of day.sessions.slice(0, 1); track session.id) {
                      <div class="text-xs p-1 rounded bg-blue-500 text-white truncate">
                        {{ session.title }}
                        <span class="block text-xs opacity-75">{{ formatSessionTime(session.startTime) }}</span>
                      </div>
                    }
                    @if ((day.events.length + day.sessions.length) > 2) {
                      <div class="text-xs text-gray-500">
                        +{{ (day.events.length + day.sessions.length) - 2 }} more
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
          }
        </div>
      </div>

      <!-- Upcoming Sessions -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Upcoming Sessions</h3>
        </div>
        <div class="p-4">
          <div class="space-y-4">
            @for (session of upcomingSessions; track session.id) {
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-4">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 class="font-medium text-gray-900">{{ session.title }}</h4>
                    <p class="text-sm text-gray-600">
                      {{ formatSessionDate(session.date) }} at {{ formatSessionTime(session.startTime) }} - {{ session.duration }}
                    </p>
                    <p class="text-sm text-gray-500 flex items-center">
                      @if (session.mentorId === 'imported') {
                        Google Calendar Event
                        <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                          </svg>
                          Synced
                        </span>
                      } @else {
                        Mentorship Session with {{ session.mentorName }}
                      }
                    </p>
                    <span class="inline-block px-2 py-1 text-xs rounded-full"
                          [class.bg-green-100]="session.status === 'confirmed'"
                          [class.bg-yellow-100]="session.status === 'pending'"
                          [class.bg-red-100]="session.status === 'cancelled'"
                          [class.text-green-800]="session.status === 'confirmed'"
                          [class.text-yellow-800]="session.status === 'pending'"
                          [class.text-red-800]="session.status === 'cancelled'">
                      {{ session.status | titlecase }}
                    </span>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button (click)="onRescheduleSession(session)" 
                          [disabled]="session.status === 'cancelled' || session.mentorId === 'imported'"
                          class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Reschedule
                  </button>
                  <button (click)="onCancelSession(session)" 
                          [disabled]="session.status === 'cancelled' || session.mentorId === 'imported'"
                          class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Cancel
                  </button>
                </div>
              </div>
            } @empty {
              <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z"></path>
                </svg>
                <p>No upcoming sessions scheduled</p>
                <button (click)="onScheduleSession()" 
                        class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Schedule Your First Session
                </button>
              </div>
            }
          </div>
        </div>
      </div>
      
      } @else if (activeTab === 'google-sync') {
        <!-- Google Calendar Sync Tab -->
        <div>
          <app-google-calendar-sync></app-google-calendar-sync>
        </div>
      }

      <!-- Day Events Popup -->
      <app-day-events-popup
        [selectedDate]="selectedPopupDate"
        [isVisible]="isPopupVisible"
        (closePopup)="closeDayEventsPopup()"
        (addEventRequested)="onAddEventRequested($event)">
      </app-day-events-popup>

      <!-- Success/Error Messages -->
      @if (successMessage) {
        <div class="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          {{ successMessage }}
        </div>
      }
      @if (errorMessage) {
        <div class="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {{ errorMessage }}
        </div>
      }

      <!-- Cancel Confirmation Modal -->
      @if (showCancelConfirmation) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3 text-center">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Cancel Session</h3>
              <p class="text-sm text-gray-500 mb-6">
                Are you sure you want to cancel this session with {{ selectedSessionForCancel?.mentorName }}?<br>
                <strong>{{ selectedSessionForCancel?.title }}</strong><br>
                {{ selectedSessionForCancel?.date | date:'MMM d, y' }} at {{ selectedSessionForCancel?.startTime }}
              </p>
              <div class="flex justify-center space-x-3">
                <button (click)="cancelCancelSession()" 
                        class="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300">
                  Keep Session
                </button>
                <button (click)="confirmCancelSession()" 
                        class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Reschedule Modal -->
      @if (showRescheduleModal) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
              <div class="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mx-auto mb-4">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 text-center mb-4">Reschedule Session</h3>
              <p class="text-sm text-gray-600 text-center mb-6">
                Reschedule your session with {{ selectedSessionForReschedule?.mentorName }}<br>
                <strong>{{ selectedSessionForReschedule?.title }}</strong>
              </p>
              
              <div class="space-y-4 mb-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">New Date</label>
                  <input type="date" 
                         [(ngModel)]="rescheduleForm.date"
                         [min]="currentDate | date:'yyyy-MM-dd'"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">New Time</label>
                  <input type="time" 
                         [(ngModel)]="rescheduleForm.time"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
              </div>

              <div class="flex justify-center space-x-3">
                <button (click)="cancelRescheduleSession()" 
                        class="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300">
                  Cancel
                </button>
                <button (click)="confirmRescheduleSession()" 
                        [disabled]="!rescheduleForm.date || !rescheduleForm.time"
                        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: []
})
export class CalendarComponent implements OnInit, OnDestroy {
  private calendarService = inject(CalendarService);
  private destroy$ = new Subject<void>();
  
  currentDate = new Date();
  currentMonth = this.getMonthName(this.currentDate.getMonth());
  currentYear = this.currentDate.getFullYear();
  calendarDays: CalendarDay[] = [];
  upcomingSessions: MentorshipSession[] = [];
  isLoading = false;
  
  // Tab management
  activeTab: 'calendar' | 'google-sync' = 'calendar';
  
  // Filter options
  showSessions = true;
  showGoals = true;
  showMeetings = true;
  showReminders = true;
  showDeadlines = true;
  showImported = true;

  // Day events popup
  isPopupVisible = false;
  selectedPopupDate = new Date();

  // Modal states for reschedule and cancel
  showRescheduleModal = false;
  showCancelConfirmation = false;
  selectedSessionForReschedule: MentorshipSession | null = null;
  selectedSessionForCancel: MentorshipSession | null = null;
  
  // Reschedule form
  rescheduleForm = {
    date: '',
    time: ''
  };

  // Messages
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.loadCalendarData();
    this.loadUpcomingSessions();
    
    // Update filter in service
    this.updateServiceFilter();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private loadCalendarData() {
    this.isLoading = true;
    this.calendarService.generateCalendarDays(
      this.currentYear, 
      this.currentDate.getMonth()
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (days) => {
        this.calendarDays = days;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading calendar data:', error);
        this.isLoading = false;
      }
    });
  }
  
  private loadUpcomingSessions() {
    this.calendarService.getUpcomingSessions(5).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (sessions) => {
        this.upcomingSessions = sessions;
      },
      error: (error) => {
        console.error('Error loading upcoming sessions:', error);
      }
    });
  }
  
  private updateServiceFilter() {
    this.calendarService.updateFilter({
      showSessions: this.showSessions,
      showGoals: this.showGoals,
      showMeetings: this.showMeetings,
      showReminders: this.showReminders,
      showDeadlines: this.showDeadlines,
      showImported: this.showImported
    });
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.updateCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.updateCalendar();
  }

  private updateCalendar() {
    this.currentMonth = this.getMonthName(this.currentDate.getMonth());
    this.currentYear = this.currentDate.getFullYear();
    this.loadCalendarData();
  }
  
  // New methods for interaction
  onDayClick(day: CalendarDay) {
    this.selectedPopupDate = day.date;
    this.isPopupVisible = true;
  }
  
  onScheduleSession() {
    // TODO: Open session scheduling modal
  }
  
  onRescheduleSession(session: MentorshipSession) {
    // Check if this is an imported Google Calendar event
    if (session.mentorId === 'imported' || (session as any).isImported) {
      this.showErrorMessage('Google Calendar events cannot be rescheduled from here. Please reschedule in Google Calendar.');
      return;
    }
    
    this.selectedSessionForReschedule = session;
    this.showRescheduleModal = true;
  }
  
  onCancelSession(session: MentorshipSession) {
    // Check if this is an imported Google Calendar event
    if (session.mentorId === 'imported' || (session as any).isImported) {
      this.showErrorMessage('Google Calendar events cannot be cancelled from here. Please cancel in Google Calendar.');
      return;
    }
    
    this.selectedSessionForCancel = session;
    this.showCancelConfirmation = true;
  }

  confirmCancelSession() {
    if (!this.selectedSessionForCancel) return;
    
    this.calendarService.updateSession({
      id: this.selectedSessionForCancel.id,
      status: 'cancelled'
    }).subscribe({
      next: () => {
        this.loadUpcomingSessions(); // Refresh list
        this.showCancelConfirmation = false;
        this.selectedSessionForCancel = null;
        this.showSuccessMessage('Session cancelled successfully');
      },
      error: (error) => {
        console.error('Error cancelling session:', error);
        this.showErrorMessage('Failed to cancel session. Please try again.');
      }
    });
  }

  cancelCancelSession() {
    this.showCancelConfirmation = false;
    this.selectedSessionForCancel = null;
  }

  confirmRescheduleSession() {
    if (!this.selectedSessionForReschedule || !this.rescheduleForm.date || !this.rescheduleForm.time) return;
    
    const newDate = new Date(this.rescheduleForm.date);
    const [hours, minutes] = this.rescheduleForm.time.split(':');
    newDate.setHours(parseInt(hours), parseInt(minutes));
    
    const updateData = {
      id: this.selectedSessionForReschedule.id,
      date: newDate,
      startTime: this.rescheduleForm.time,
      duration: this.selectedSessionForReschedule.duration, // Preserve duration
      status: 'rescheduled' as const
    };
    
    this.calendarService.updateSession(updateData).subscribe({
      next: () => {
        this.loadUpcomingSessions(); // Refresh list
        this.showRescheduleModal = false;
        this.selectedSessionForReschedule = null;
        this.resetRescheduleForm();
        this.showSuccessMessage('Session rescheduled successfully');
      },
      error: (error) => {
        console.error('Error rescheduling session:', error);
        this.showErrorMessage('Failed to reschedule session. Please try again.');
      }
    });
  }

  cancelRescheduleSession() {
    this.showRescheduleModal = false;
    this.selectedSessionForReschedule = null;
    this.resetRescheduleForm();
  }
  
  onFilterChange() {
    this.updateServiceFilter();
    this.loadCalendarData();
  }
  
  formatSessionDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  formatSessionTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }
  
  getEventTypeColor(type: CalendarEvent['type']): string {
    switch (type) {
      case 'session': return 'bg-blue-500';
      case 'goal': return 'bg-green-500';
      case 'meeting': return 'bg-purple-500';
      case 'reminder': return 'bg-yellow-500';
      case 'deadline': return 'bg-red-500';
      case 'imported': return 'bg-indigo-500 border border-indigo-300';
      default: return 'bg-gray-500';
    }
  }

  private showSuccessMessage(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  private showErrorMessage(message: string) {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  private resetRescheduleForm() {
    this.rescheduleForm = {
      date: '',
      time: ''
    };
  }

  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  // Day events popup methods
  closeDayEventsPopup() {
    this.isPopupVisible = false;
  }

  onAddEventRequested(date: Date) {
    // TODO: Implement add event functionality
    // For now, just close the popup
    this.closeDayEventsPopup();
  }
}