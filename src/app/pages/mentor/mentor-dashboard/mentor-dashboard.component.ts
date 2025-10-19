import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { MentorDashboardService, MentorStats, MenteeRequest, ActiveMentee, MentorUpcomingSession, MentorActivity } from '../../../shared/services/mentor-dashboard.service';
import { User, MentorProfile } from '../../../shared/interfaces';

@Component({
  selector: 'app-mentor-dashboard',
  imports: [CommonModule],
  templateUrl: './mentor-dashboard.component.html',
  styleUrl: './mentor-dashboard.component.css',
})
export class MentorDashboard implements OnInit {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private mentorDashboardService = inject(MentorDashboardService);
  private router = inject(Router);

  // Signals for reactive data
  currentUser = signal<User | null>(null);
  mentorProfile = signal<MentorProfile | null>(null);
  isLoading = signal(true);
  
  // Dashboard data from service
  stats = signal<MentorStats>({
    totalMentees: 0,
    activeSessions: 0,
    completedSessions: 0,
    pendingRequests: 0,
    averageRating: 0,
    totalHours: 0
  });

  menteeRequests = signal<MenteeRequest[]>([]);
  activeMentees = signal<ActiveMentee[]>([]);
  upcomingSessions = signal<MentorUpcomingSession[]>([]);
  recentActivities = signal<MentorActivity[]>([]);

  // Computed values
  upcomingSessionsToday = computed(() => {
    const today = new Date();
    return this.upcomingSessions().filter(session => 
      session.date.toDateString() === today.toDateString()
    );
  });

  pendingRequests = computed(() => {
    return this.menteeRequests().filter(r => r.status === 'pending');
  });

  ngOnInit() {
    this.loadMentorData();
    this.subscribeToMentorDashboardData();
  }

  private loadMentorData() {
    this.authService.user$.subscribe(user => {
      this.currentUser.set(user);
      if (user) {
        this.profileService.getMentorProfile(user.id).subscribe(profile => {
          this.mentorProfile.set(profile);
          this.isLoading.set(false);
        });
      }
    });
  }

  private subscribeToMentorDashboardData() {
    // Subscribe to mentor dashboard service data
    this.mentorDashboardService.stats$.subscribe(stats => {
      this.stats.set(stats);
      console.log('Mentor stats updated:', stats);
    });

    this.mentorDashboardService.requests$.subscribe(requests => {
      this.menteeRequests.set(requests);
      console.log('Mentor requests updated:', requests);
    });

    this.mentorDashboardService.activeMentees$.subscribe(mentees => {
      this.activeMentees.set(mentees);
      console.log('Active mentees updated:', mentees);
    });

    this.mentorDashboardService.upcomingSessions$.subscribe(sessions => {
      this.upcomingSessions.set(sessions);
      console.log('Upcoming sessions updated:', sessions);
    });

    this.mentorDashboardService.activities$.subscribe(activities => {
      this.recentActivities.set(activities);
      console.log('Recent activities updated:', activities);
    });
  }

  // Navigation methods
  navigateToRequests() {
    this.router.navigate(['/mentor/requests']);
  }

  navigateToSessions() {
    this.router.navigate(['/calendar']);
  }

  navigateToMentees() {
    this.router.navigate(['/mentor/mentees']);
  }

  navigateToAssignments() {
    this.router.navigate(['/mentor/assignments']);
  }

  navigateToProfile() {
    this.router.navigate(['/mentor/profile']);
  }

  // Action methods
  async acceptRequest(requestId: string) {
    try {
      await this.mentorDashboardService.acceptRequest(requestId);
      console.log('Request accepted successfully:', requestId);
    } catch (error) {
      console.error('Error accepting request:', error);
      // In a real app, show user-friendly error message
    }
  }

  async declineRequest(requestId: string) {
    try {
      await this.mentorDashboardService.declineRequest(requestId);
      console.log('Request declined successfully:', requestId);
    } catch (error) {
      console.error('Error declining request:', error);
      // In a real app, show user-friendly error message
    }
  }

  viewMenteeProgress(menteeId: string) {
    this.router.navigate(['/mentor/mentee', menteeId]);
  }

  startSession(sessionId: string) {
    this.router.navigate(['/session', sessionId]);
  }

  rescheduleSession(sessionId: string) {
    // In real app, open reschedule dialog
    console.log('Rescheduling session:', sessionId);
  }

  // Utility methods
  getProgressColor(progress: number): string {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'session_completed': return 'M5 13l4 4L19 7';
      case 'new_request': return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
      case 'assignment_submitted': return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'goal_achieved': return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'feedback_received': return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
      default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}
