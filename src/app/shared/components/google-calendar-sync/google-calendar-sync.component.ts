import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject } from 'rxjs';
import { CalendarService } from '../../services/calendar.service';
import { GoogleCalendarService } from '../../services/google-calendar.service';

@Component({
  selector: 'app-google-calendar-sync',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900">Google Calendar Sync</h3>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600">Status:</span>
          <span [class]="isAuthenticated ? 'text-green-600' : 'text-red-600'" 
                class="text-sm font-medium">
            {{ isAuthenticated ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <!-- Authentication Section -->
      @if (!isAuthenticated) {
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-start">
            <svg class="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">Connect to Google Calendar</h3>
              <p class="mt-1 text-sm text-blue-700">
                Sync your mentorship sessions with Google Calendar to manage all your appointments in one place.
              </p>
              <div class="mt-3">
                <button 
                  (click)="authenticateGoogle()"
                  [disabled]="isConnecting"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (isConnecting) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  } @else {
                    Connect Google Calendar
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      } @else {
        
        <!-- Sync Settings -->
        <div class="space-y-6">
          
          <!-- Sync Toggle -->
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-900">Enable Sync</label>
              <p class="text-sm text-gray-500">Automatically sync mentorship sessions with Google Calendar</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" 
                     [(ngModel)]="syncSettings.syncEnabled"
                     (change)="updateSyncSettings()"
                     class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          @if (syncSettings.syncEnabled) {
            
            <!-- Auto-Sync Status -->
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-medium text-green-800">Automatic Sync Active</h4>
                  <p class="text-sm text-green-700 mt-1">
                    @if (autoSyncStatus.lastSync) {
                      Last synced: {{ formatRelativeTime(autoSyncStatus.lastSync) }}
                    } @else {
                      Syncing will start automatically...
                    }
                  </p>
                  <p class="text-xs text-green-600 mt-1">
                    Your Google Calendar events will automatically appear on your calendar every 5 minutes
                  </p>
                </div>
                <div class="flex items-center space-x-2">
                  <button 
                    (click)="triggerManualSync()"
                    [disabled]="isManualSyncing"
                    class="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50">
                    @if (isManualSyncing) {
                      <svg class="animate-spin -ml-1 mr-1 h-3 w-3 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Syncing...
                    } @else {
                      Sync Now
                    }
                  </button>
                  <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Auto-sync active"></div>
                </div>
              </div>
            </div>
            
            <!-- Calendar Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">Default Calendar</label>
              <select [(ngModel)]="syncSettings.defaultCalendarId"
                      (change)="updateSyncSettings()"
                      class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                @for (calendar of availableCalendars$ | async; track calendar.id) {
                  <option [value]="calendar.id">{{ calendar.summary || 'Primary Calendar' }}</option>
                }
              </select>
            </div>

            <!-- Sync Direction -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">Sync Direction</label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input type="radio" 
                         [(ngModel)]="syncSettings.syncDirection" 
                         value="both"
                         (change)="updateSyncSettings()"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                  <span class="ml-2 text-sm text-gray-700">Two-way sync (recommended)</span>
                </label>
                <label class="flex items-center">
                  <input type="radio" 
                         [(ngModel)]="syncSettings.syncDirection" 
                         value="to-google"
                         (change)="updateSyncSettings()"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                  <span class="ml-2 text-sm text-gray-700">To Google Calendar only</span>
                </label>
                <label class="flex items-center">
                  <input type="radio" 
                         [(ngModel)]="syncSettings.syncDirection" 
                         value="from-google"
                         (change)="updateSyncSettings()"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                  <span class="ml-2 text-sm text-gray-700">From Google Calendar only</span>
                </label>
              </div>
            </div>

            <!-- Auto-create Meet Links -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Auto-create Google Meet links</label>
                <p class="text-sm text-gray-500">Automatically add video meeting links to sessions</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" 
                       [(ngModel)]="syncSettings.autoCreateMeetLinks"
                       (change)="updateSyncSettings()"
                       class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Sync Categories -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-3">Sync Categories</label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input type="checkbox" 
                         [(ngModel)]="syncSettings.syncCategories.mentorshipSessions"
                         (change)="updateSyncSettings()"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <span class="ml-2 text-sm text-gray-700">Mentorship Sessions</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" 
                         [(ngModel)]="syncSettings.syncCategories.goals"
                         (change)="updateSyncSettings()"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <span class="ml-2 text-sm text-gray-700">Goals & Milestones</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" 
                         [(ngModel)]="syncSettings.syncCategories.meetings"
                         (change)="updateSyncSettings()"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <span class="ml-2 text-sm text-gray-700">General Meetings</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" 
                         [(ngModel)]="syncSettings.syncCategories.deadlines"
                         (change)="updateSyncSettings()"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <span class="ml-2 text-sm text-gray-700">Deadlines</span>
                </label>
              </div>
            </div>

            <!-- Import Section -->
            <div class="border-t pt-6">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h4 class="text-md font-medium text-gray-900">Import from Google Calendar</h4>
                  <p class="text-sm text-gray-500">Import existing events from your Google Calendar</p>
                </div>
                <button 
                  (click)="importFromGoogle()"
                  [disabled]="isImporting"
                  class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (isImporting) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  } @else {
                    Import Events
                  }
                </button>
              </div>
              
              <!-- Imported Events Display -->
              @if (importedEvents.length > 0) {
                <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 class="text-sm font-medium text-gray-900 mb-3">Recently Imported Events ({{ importedEvents.length }})</h5>
                  <div class="space-y-2 max-h-40 overflow-y-auto">
                    @for (event of importedEvents; track event.id) {
                      <div class="flex items-center justify-between p-2 bg-white rounded border">
                        <div class="flex-1">
                          <p class="text-sm font-medium text-gray-900">{{ event.title || 'Untitled Event' }}</p>
                          <p class="text-xs text-gray-500">
                            {{ formatEventDate(event.start) }} 
                            @if (event.start !== event.end) { 
                              - {{ formatEventTime(event.end) }}
                            }
                          </p>
                        </div>
                        <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          Imported
                        </span>
                      </div>
                    }
                  </div>
                  <button 
                    (click)="clearImportedEvents()"
                    class="mt-2 text-xs text-gray-500 hover:text-gray-700">
                    Clear list
                  </button>
                </div>
              }
            </div>



            <!-- Disconnect Section -->
            <div class="border-t pt-6">
              <button 
                (click)="disconnect()"
                class="text-red-600 hover:text-red-700 text-sm font-medium">
                Disconnect Google Calendar
              </button>
            </div>

          }
        </div>
      }

      <!-- Success/Error Messages -->
      @if (message) {
        <div [class]="messageType === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'"
             class="mt-4 p-4 border rounded-lg">
          <div class="flex">
            <svg [class]="messageType === 'success' ? 'text-green-400' : 'text-red-400'" 
                 class="h-5 w-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              @if (messageType === 'success') {
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              } @else {
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
              }
            </svg>
            <span class="ml-2 text-sm">{{ message }}</span>
          </div>
        </div>
      }
    </div>
  `
})
export class GoogleCalendarSyncComponent implements OnInit {
  private calendarService = inject(CalendarService);
  private googleCalendarService = inject(GoogleCalendarService);
  
  isAuthenticated = false;
  isConnecting = false;
  isImporting = false;
  isManualSyncing = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  importedEvents: any[] = [];
  autoSyncStatus: any = {
    enabled: false,
    lastSync: null,
    nextSync: null
  };
  
  syncSettings: any = {
    syncEnabled: false,
    defaultCalendarId: 'primary',
    syncDirection: 'both',
    autoCreateMeetLinks: true,
    syncCategories: {
      mentorshipSessions: true,
      goals: true,
      meetings: true,
      deadlines: false
    }
  };

  availableCalendars$ = new BehaviorSubject<any[]>([]);

  ngOnInit() {
    this.checkAuthStatus();
    this.loadSyncSettings();
    this.loadAutoSyncStatus();
    
    // Update auto-sync status every 30 seconds
    setInterval(() => {
      this.loadAutoSyncStatus();
    }, 30000);
  }

  private checkAuthStatus(): void {
    this.isAuthenticated = this.calendarService.isGoogleCalendarAuthenticated();
    
    if (this.isAuthenticated) {
      this.loadGoogleCalendars();
    }
  }

  private loadSyncSettings(): void {
    this.calendarService.getGoogleCalendarSettings().subscribe(settings => {
      this.syncSettings = { ...this.syncSettings, ...settings };
    });
  }

  private loadGoogleCalendars(): void {
    this.calendarService.getGoogleCalendars().subscribe({
      next: (calendars) => {
        this.availableCalendars$.next(calendars);
      },
      error: (error) => {
        console.error('Error loading calendars:', error);
        this.showMessage('Failed to load Google calendars', 'error');
      }
    });
  }

  async authenticateGoogle(): Promise<void> {
    this.isConnecting = true;
    this.message = '';

    try {
      const success = await this.calendarService.authenticateGoogleCalendar();
      
      if (success) {
        this.isAuthenticated = true;
        this.loadGoogleCalendars();
        this.showMessage('Successfully connected to Google Calendar!', 'success');
      } else {
        this.showMessage('Failed to connect to Google Calendar', 'error');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showMessage('Authentication failed. Please try again.', 'error');
    } finally {
      this.isConnecting = false;
    }
  }

  updateSyncSettings(): void {
    this.calendarService.updateGoogleCalendarSettings(this.syncSettings);
    this.showMessage('Settings updated successfully', 'success');
  }

  importFromGoogle(): void {
    this.isImporting = true;
    this.message = '';

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3); // Import next 3 months



    this.calendarService.importFromGoogleCalendar(startDate, endDate).subscribe({
      next: (events: any[]) => {

        
        // Store events for display in the sync component
        this.importedEvents = events.map(event => ({
          id: event.id || Math.random().toString(36).substr(2, 9),
          title: event.title || event.summary || 'Untitled Event',
          start: event.start || event.startTime,
          end: event.end || event.endTime,
          description: event.description,
          location: event.location,
          importedAt: new Date()
        }));

        // Add events to the main calendar service for display on calendar
        this.calendarService.addImportedEvents(events);
        
        // Debug: Log what we're sending to the calendar service

        
        // Force calendar refresh by triggering filter update
        this.calendarService.updateFilter({});
        
        this.showMessage(`Successfully imported ${events.length} events from Google Calendar. Switch to Calendar View to see them!`, 'success');
      },
      error: (error: any) => {
        console.error('Import error:', error);
        this.showMessage('Failed to import events from Google Calendar. Check console for details.', 'error');
      },
      complete: () => {
        this.isImporting = false;
      }
    });
  }



  disconnect(): void {
    // Sign out from Google Calendar
    this.calendarService.signOut();
    this.isAuthenticated = false;
    this.syncSettings.syncEnabled = false;
    this.updateSyncSettings();
    this.showMessage('Disconnected from Google Calendar', 'success');
  }

  formatEventDate(date: any): string {
    if (!date) return 'No date';
    
    try {
      const eventDate = typeof date === 'string' ? new Date(date) : date;
      return eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  formatEventTime(date: any): string {
    if (!date) return '';
    
    try {
      const eventDate = typeof date === 'string' ? new Date(date) : date;
      return eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  }

  clearImportedEvents(): void {
    this.importedEvents = [];
    // Also clear from the main calendar service
    this.calendarService.clearImportedEvents();
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    
    // Clear message after 5 seconds
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  private loadAutoSyncStatus() {
    // Update auto-sync status based on calendar service
    const status = this.calendarService.getAutoSyncStatus();
    this.autoSyncStatus = {
      enabled: this.calendarService.getAutoSyncEnabled(),
      lastSync: status.lastSync,
      nextSync: status.nextSync
    };
  }

  triggerManualSync() {
    if (this.isManualSyncing || !this.isAuthenticated) {
      return;
    }

    this.isManualSyncing = true;
    
    try {
      // Trigger manual sync through calendar service
      this.calendarService.performAutoSync();
      
      // Update status after sync
      setTimeout(() => {
        this.isManualSyncing = false;
        this.loadAutoSyncStatus();
      }, 1000);
    } catch (error: any) {
      console.error('Manual sync failed:', error);
      this.isManualSyncing = false;
    }
  }

  formatRelativeTime(date: Date | null): string {
    if (!date) {
      return 'Never';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}