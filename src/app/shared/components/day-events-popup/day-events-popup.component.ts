import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarService } from '../../services/calendar.service';
import { CalendarEvent, MentorshipSession } from '../../interfaces/calendar.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-day-events-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="popup-overlay" (click)="onOverlayClick($event)" *ngIf="isVisible">
      <div class="popup-content" (click)="$event.stopPropagation()">
        <div class="popup-header">
          <h3 class="popup-title">{{ formatDate(selectedDate) }}</h3>
          <button class="close-button" (click)="close()" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="popup-body">
          <!-- No events message -->
          <div *ngIf="events.length === 0 && sessions.length === 0" class="no-events">
            <svg class="no-events-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <p>No events scheduled for this day</p>
          </div>

          <!-- Events list -->
          <div *ngIf="events.length > 0 || sessions.length > 0" class="events-list">
            
            <!-- Mentorship Sessions -->
            <div *ngFor="let session of sessions" class="event-item session-item">
              <div class="event-time">{{ session.startTime }} - {{ session.endTime }}</div>
              <div class="event-details">
                <h4 class="event-title">{{ session.title }}</h4>
                <p class="event-description" *ngIf="session.description">{{ session.description }}</p>
                <div class="session-participants">
                  <span class="mentor">👨‍🏫 {{ session.mentorName }}</span>
                  <span class="mentee">👩‍🎓 {{ session.menteeName }}</span>
                </div>
                <div class="event-meta">
                  <span class="status-badge" [class]="'status-' + session.status">
                    {{ session.status | titlecase }}
                  </span>
                  <span class="duration">{{ session.duration }}</span>
                  <span *ngIf="session.location" class="location">📍 {{ session.location }}</span>
                </div>
                <div *ngIf="session.meetingLink" class="meeting-link">
                  <a [href]="session.meetingLink" target="_blank" class="link-button">
                    🔗 Join Meeting
                  </a>
                </div>
              </div>
            </div>

            <!-- Regular Events -->
            <div *ngFor="let event of events" class="event-item" [class]="'event-type-' + event.type">
              <div class="event-time">
                {{ event.startTime || 'All day' }}
                <span *ngIf="event.endTime && event.startTime !== event.endTime"> - {{ event.endTime }}</span>
              </div>
              <div class="event-details">
                <h4 class="event-title">
                  {{ event.title }}
                  <span *ngIf="event.isImported" class="imported-badge">📅 Google Calendar</span>
                </h4>
                <p class="event-description" *ngIf="event.description">{{ event.description }}</p>
                <div class="event-meta">
                  <span class="type-badge" [class]="'type-' + event.type">
                    {{ getEventTypeLabel(event.type) }}
                  </span>
                  <span *ngIf="event.duration" class="duration">{{ event.duration }}</span>
                  <span *ngIf="event.location" class="location">📍 {{ event.location }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="popup-footer">
          <button class="add-event-button" (click)="addEvent()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Event
          </button>
          <button class="close-button-secondary" (click)="close()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .popup-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-width: 600px;
      width: 100%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }

    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 0 24px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .popup-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      color: #6b7280;
      transition: all 0.2s;
    }

    .close-button:hover {
      background-color: #f3f4f6;
      color: #374151;
    }

    .popup-body {
      flex: 1;
      overflow-y: auto;
      padding: 0 24px;
    }

    .no-events {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
    }

    .no-events-icon {
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .event-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .event-item:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-color: #d1d5db;
    }

    .session-item {
      border-left: 4px solid #3b82f6;
      background-color: #f8fafc;
    }

    .event-type-goal {
      border-left: 4px solid #10b981;
    }

    .event-type-meeting {
      border-left: 4px solid #8b5cf6;
    }

    .event-type-deadline {
      border-left: 4px solid #ef4444;
    }

    .event-type-reminder {
      border-left: 4px solid #f59e0b;
    }

    .event-type-imported {
      border-left: 4px solid #06b6d4;
    }

    .event-time {
      font-weight: 600;
      color: #374151;
      min-width: 120px;
      font-size: 0.875rem;
    }

    .event-details {
      flex: 1;
    }

    .event-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .event-description {
      color: #6b7280;
      margin: 0 0 12px 0;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .session-participants {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      font-size: 0.875rem;
    }

    .mentor, .mentee {
      color: #374151;
    }

    .event-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .status-badge, .type-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-confirmed {
      background-color: #d1fae5;
      color: #065f46;
    }

    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }

    .status-cancelled {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .type-goal {
      background-color: #d1fae5;
      color: #065f46;
    }

    .type-meeting {
      background-color: #e0e7ff;
      color: #3730a3;
    }

    .type-deadline {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .type-reminder {
      background-color: #fef3c7;
      color: #92400e;
    }

    .type-imported {
      background-color: #cffafe;
      color: #155e63;
    }

    .duration, .location {
      color: #6b7280;
      font-size: 0.75rem;
    }

    .imported-badge {
      background-color: #cffafe;
      color: #155e63;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
    }

    .meeting-link {
      margin-top: 8px;
    }

    .link-button {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    .link-button:hover {
      background-color: #2563eb;
    }

    .popup-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px 24px 24px;
      border-top: 1px solid #e5e7eb;
      margin-top: 20px;
    }

    .add-event-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background-color: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .add-event-button:hover {
      background-color: #2563eb;
    }

    .close-button-secondary {
      padding: 8px 16px;
      background: none;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
    }

    .close-button-secondary:hover {
      background-color: #f3f4f6;
    }

    @media (max-width: 640px) {
      .popup-content {
        margin: 0;
        height: 100vh;
        border-radius: 0;
        max-height: none;
      }
      
      .event-item {
        flex-direction: column;
        gap: 8px;
      }
      
      .event-time {
        min-width: auto;
      }
      
      .session-participants {
        flex-direction: column;
        gap: 4px;
      }
    }
  `]
})
export class DayEventsPopupComponent implements OnInit, OnDestroy, OnChanges {
  @Input() selectedDate: Date = new Date();
  @Input() isVisible: boolean = false;
  @Output() closePopup = new EventEmitter<void>();
  @Output() addEventRequested = new EventEmitter<Date>();

  private calendarService = inject(CalendarService);
  private subscription?: Subscription;

  events: CalendarEvent[] = [];
  sessions: MentorshipSession[] = [];

  ngOnInit() {
    this.loadEventsForDay();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private loadEventsForDay() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.subscription = this.calendarService.getEventsForDay(this.selectedDate).subscribe({
      next: ({ events, sessions }) => {
        this.events = events;
        this.sessions = sessions;
      },
      error: (error) => {
        console.error('Error loading events for day:', error);
      }
    });
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getEventTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'goal': 'Goal',
      'meeting': 'Meeting',
      'deadline': 'Deadline',
      'reminder': 'Reminder',
      'session': 'Session',
      'imported': 'Google Calendar'
    };
    return labels[type] || type;
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close() {
    this.closePopup.emit();
  }

  addEvent() {
    this.addEventRequested.emit(this.selectedDate);
  }

  // Update when selectedDate changes
  ngOnChanges() {
    if (this.isVisible) {
      this.loadEventsForDay();
    }
  }
}