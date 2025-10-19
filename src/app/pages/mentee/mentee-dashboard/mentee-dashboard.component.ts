import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { 
  DashboardService, 
  DashboardStats, 
  UpcomingSession, 
  DashboardGoal, 
  PersonalizedRecommendation, 
  RecentActivity 
} from '../../../shared/services/dashboard.service';

@Component({
  selector: 'app-mentee-dashboard',
  imports: [CommonModule],
  templateUrl: './mentee-dashboard.component.html',
  styleUrl: './mentee-dashboard.component.css',
})
export class MenteeDashboard implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private dashboardService = inject(DashboardService);
  private destroy$ = new Subject<void>();

  currentUser: any;
  stats: DashboardStats = {
    sessionsCompleted: 0,
    hoursLearned: 0,
    goalsAchieved: 0,
    skillsImproved: 0,
    totalGoals: 0,
    activeGoals: 0,
    completionRate: 0,
    currentStreak: 0,
    longestStreak: 0
  };

  upcomingSessions: UpcomingSession[] = [];
  activeGoals: DashboardGoal[] = [];
  recommendations: PersonalizedRecommendation[] = [];
  recentActivities: RecentActivity[] = [];
  streakInfo: any = null;
  progressInsights: string[] = [];
  isLoading = true;
  hasRealData = false;

  // Dashboard insights
  get progressInsight(): string {
    if (this.stats.completionRate >= 80) return 'excellent';
    if (this.stats.completionRate >= 60) return 'good';
    if (this.stats.completionRate >= 40) return 'moderate';
    return 'needs-attention';
  }

  get streakMessage(): string {
    if (this.stats.currentStreak === 0) return "Let's start a new learning streak!";
    if (this.stats.currentStreak === 1) return "Great start! Keep the momentum going.";
    if (this.stats.currentStreak < 5) return `${this.stats.currentStreak} sessions strong! You're building a great habit.`;
    return `Amazing ${this.stats.currentStreak}-session streak! You're on fire! 🔥`;
  }

  get nextMilestone(): string {
    const nextGoal = this.activeGoals.find(g => g.progress < 100);
    if (nextGoal) {
      const remaining = 100 - nextGoal.progress;
      return `${remaining}% to complete "${nextGoal.title}"`;
    }
    return "Set a new goal to track your progress";
  }

  ngOnInit() {
    // Initialize dashboard with real user data - specifically for Joy Dimaculangan mentee account
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser = user;
      if (user && this.isJoyDimaculanganAccount(user)) {
        this.loadDashboardData();
      } else {
        this.isLoading = false;
        // If not Joy Dimaculangan's account, show no data
        if (user && !this.isJoyDimaculanganAccount(user)) {
          console.log('Dashboard restricted to Joy Dimaculangan mentee account only');
        }
      }
    });
  }

  // Check if the current user is Joy Dimaculangan's mentee account
  public isJoyDimaculanganAccount(user: any): boolean {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const email = (user.email || '').toLowerCase();
    
    // Check for Joy Dimaculangan account by name or email
    return fullName === 'joy dimaculangan' || 
           email.includes('joy') && email.includes('dimaculangan') ||
           user.firstName?.toLowerCase() === 'joy' && user.lastName?.toLowerCase() === 'dimaculangan' ||
           email === 'joy.dimaculangan@example.com' || // Add specific email if known
           user.id === 'joy_dimaculangan_user_id'; // Add specific user ID if known
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData() {
    // Show loading immediately
    this.isLoading = true;

    // Load all dashboard data using the new service
    combineLatest([
      this.dashboardService.stats$,
      this.dashboardService.upcomingSessions$,
      this.dashboardService.activeGoals$,
      this.dashboardService.recommendations$,
      this.dashboardService.recentActivities$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([stats, sessions, goals, recommendations, activities]) => {
        this.stats = stats;
        this.upcomingSessions = sessions.slice(0, 3); // Show max 3 upcoming sessions
        this.activeGoals = goals.slice(0, 3); // Show max 3 active goals
        this.recommendations = recommendations;
        this.recentActivities = activities.slice(0, 5); // Show max 5 recent activities
        
        // Set streak info
        this.streakInfo = {
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak
        };
        
        // Generate progress insights
        this.progressInsights = this.generateProgressInsights(stats, goals);
        
        // Check if we have real data (not just default values)
        this.hasRealData = stats.sessionsCompleted > 0 || stats.totalGoals > 0 || 
                          sessions.length > 0 || goals.length > 0;
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
        // Show error message or fallback data
      }
    });
  }

  joinSession(session: UpcomingSession) {
    if (session.meetingLink) {
      window.open(session.meetingLink, '_blank');
      
      // Add activity for joining session
      this.addActivity({
        type: 'session',
        title: 'Joined mentorship session',
        description: `Started session "${session.title}" with ${session.mentorName}`,
        timestamp: new Date(),
        relatedId: session.id
      });
    } else {
      // Show message that meeting link is not available yet
      alert('Meeting link not available yet. Please check back closer to session time.');
    }
  }

  rescheduleSession(session: UpcomingSession) {
    // Navigate to calendar or booking page with session ID
    this.router.navigate(['/calendar'], { 
      queryParams: { reschedule: session.id } 
    });
  }

  markGoalProgress(goal: DashboardGoal, progress: number) {
    this.dashboardService.updateGoalProgress(goal.id, progress);
  }

  viewRecommendation(recommendation: PersonalizedRecommendation) {
    if (recommendation.link) {
      window.open(recommendation.link, '_blank');
      
      // Add activity for viewing recommendation
      this.addActivity({
        type: 'resource',
        title: 'Viewed recommended resource',
        description: `Accessed "${recommendation.title}"`,
        timestamp: new Date(),
        relatedId: recommendation.id
      });
    }
  }

  private addActivity(activity: Partial<RecentActivity>) {
    this.authService.getCurrentUser().subscribe(user => {
      if (user?.id) {
        this.dashboardService.addActivity(user.id, activity);
      }
    });
  }

  // Navigation methods
  navigateToBooking() {
    this.router.navigate(['/booking']);
  }

  navigateToCalendar() {
    this.router.navigate(['/calendar']);
  }

  navigateToSessions() {
    this.router.navigate(['/sessions']);
  }

  navigateToGoals() {
    this.router.navigate(['/goals']);
  }

  navigateToMessages() {
    this.router.navigate(['/messages']);
  }

  navigateToResources() {
    this.router.navigate(['/resources']);
  }

  onImageError(event: Event, resource: any): void {
    const img = event.target as HTMLImageElement;
    const fallbackImages: Record<string, string> = {
      'book': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop&auto=format&q=80',
      'article': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=200&fit=crop&auto=format&q=80',
      'course': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=200&fit=crop&auto=format&q=80',
      'video': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=300&h=200&fit=crop&auto=format&q=80',
      'tool': 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=300&h=200&fit=crop&auto=format&q=80',
      'template': 'https://images.unsplash.com/photo-1618477247222-acbdb0e159b3?w=300&h=200&fit=crop&auto=format&q=80'
    };
    
    const fallbackImage = fallbackImages[resource.type.toLowerCase()] || fallbackImages['article'];
    if (img.src !== fallbackImage) {
      img.src = fallbackImage;
    } else {
      // If even the fallback fails, use a simple placeholder
      img.src = 'https://via.placeholder.com/64x48/9CA3AF/FFFFFF?text=N/A';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'course': return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
      case 'article': return 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z';
      case 'video': return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
      case 'book': return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
      default: return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'session': return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
      case 'goal': return 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z';
      case 'achievement': return 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z';
      case 'resource': return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
      default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  }

  private generateProgressInsights(stats: DashboardStats, goals: DashboardGoal[]): string[] {
    const insights: string[] = [];
    
    if (stats.currentStreak > 0) {
      insights.push(`🔥 You're on a ${stats.currentStreak}-day learning streak! Keep it up!`);
    }
    
    if (stats.completionRate > 80) {
      insights.push('📈 Excellent progress! You are completing goals at an impressive rate.');
    } else if (stats.completionRate > 60) {
      insights.push('👍 Good momentum on your goals. You are making steady progress!');
    } else if (stats.completionRate < 40 && goals.length > 0) {
      insights.push('💪 Consider breaking down your goals into smaller milestones for better progress.');
    }
    
    if (stats.sessionsCompleted > 10) {
      insights.push('🎯 You have completed multiple mentorship sessions - great commitment to learning!');
    }
    
    if (stats.hoursLearned > 20) {
      insights.push(`⏰ You have invested ${stats.hoursLearned} hours in learning - your dedication is paying off!`);
    }
    
    return insights;
  }


}
