import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Calendar</h1>
        <p class="text-gray-600">Schedule and manage your mentorship sessions</p>
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
            
            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Schedule Session
            </button>
          </div>
        </div>

        <!-- Calendar Grid -->
        <div class="p-4">
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
                   [class.border-blue-200]="day.isToday">
                
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

                <!-- Events for this day -->
                @if (day.events && day.events.length > 0) {
                  <div class="mt-1 space-y-1">
                    @for (event of day.events.slice(0, 2); track event.id) {
                      <div class="text-xs p-1 rounded text-white truncate"
                           [class.bg-blue-500]="event.type === 'session'"
                           [class.bg-green-500]="event.type === 'goal'"
                           [class.bg-purple-500]="event.type === 'meeting'">
                        {{ event.title }}
                      </div>
                    }
                    @if (day.events.length > 2) {
                      <div class="text-xs text-gray-500">
                        +{{ day.events.length - 2 }} more
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
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
                      {{ session.date }} at {{ session.time }} - {{ session.duration }}
                    </p>
                    <p class="text-sm text-gray-500">with {{ session.participant }}</p>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    Reschedule
                  </button>
                  <button class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                <button class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Schedule Your First Session
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: []
})
export class CalendarComponent {
  currentDate = new Date();
  currentMonth = this.getMonthName(this.currentDate.getMonth());
  currentYear = this.currentDate.getFullYear();
  calendarDays: CalendarDay[] = [];

  // Sample data - in real app, this would come from a service
  upcomingSessions = [
    {
      id: 1,
      title: 'Career Planning Session',
      date: 'Oct 15, 2025',
      time: '2:00 PM',
      duration: '1 hour',
      participant: 'John Smith'
    },
    {
      id: 2,
      title: 'Code Review & Mentoring',
      date: 'Oct 18, 2025',
      time: '10:00 AM',
      duration: '45 minutes',
      participant: 'Sarah Johnson'
    }
  ];

  constructor() {
    this.generateCalendar();
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
    this.generateCalendar();
  }

  private generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    this.calendarDays = [];

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const day: CalendarDay = {
        date: date.toISOString(),
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: this.isSameDay(date, today),
        hasEvents: Math.random() > 0.8, // Random events for demo
        events: this.getEventsForDate(date)
      };

      this.calendarDays.push(day);
    }
  }

  private getEventsForDate(date: Date): CalendarEvent[] {
    // Sample events - in real app, this would come from a service
    const events: CalendarEvent[] = [];
    
    if (Math.random() > 0.9) {
      events.push({
        id: Math.random(),
        title: 'Mentoring Session',
        type: 'session'
      });
    }
    
    if (Math.random() > 0.95) {
      events.push({
        id: Math.random(),
        title: 'Goal Review',
        type: 'goal'
      });
    }

    return events;
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
}

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  events: CalendarEvent[];
}

interface CalendarEvent {
  id: number;
  title: string;
  type: 'session' | 'goal' | 'meeting';
}