import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, map, switchMap, of } from 'rxjs';
import { 
  Firestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  addDoc
} from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';
import { GoalsService } from './goals.service';
import { ResourcesService, Resource } from './resources.service';

export interface DashboardStats {
  sessionsCompleted: number;
  hoursLearned: number;
  goalsAchieved: number;
  skillsImproved: number;
  totalGoals: number;
  activeGoals: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  nextSessionDate?: Date;
  lastSessionDate?: Date;
}

export interface UpcomingSession {
  id: string;
  mentorName: string;
  mentorAvatar: string;
  mentorId: string;
  title: string;
  date: Date;
  time: string;
  duration: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  meetingLink?: string;
  agenda?: string[];
  type: 'mentoring' | 'group' | 'workshop';
  location?: string;
}

export interface DashboardGoal {
  id: string;
  title: string;
  description: string;
  progress: number;
  targetDate: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'paused';
  skills: string[];
  completedMilestones: number;
  totalMilestones: number;
  lastUpdated: Date;
}

export interface PersonalizedRecommendation {
  id: string;
  type: 'course' | 'mentor' | 'article' | 'video' | 'book' | 'event';
  title: string;
  description: string;
  relevanceScore: number;
  category: string;
  link?: string;
  imageUrl?: string;
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  reason: string; // Why this is recommended
}

export interface RecentActivity {
  id: string;
  type: 'session' | 'goal' | 'achievement' | 'resource' | 'connection' | 'milestone';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  relatedId?: string;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private goalsService = inject(GoalsService);
  private resourcesService = inject(ResourcesService);

  private statsSubject = new BehaviorSubject<DashboardStats>({
    sessionsCompleted: 0,
    hoursLearned: 0,
    goalsAchieved: 0,
    skillsImproved: 0,
    totalGoals: 0,
    activeGoals: 0,
    completionRate: 0,
    currentStreak: 0,
    longestStreak: 0
  });

  private upcomingSessionsSubject = new BehaviorSubject<UpcomingSession[]>([]);
  private activeGoalsSubject = new BehaviorSubject<DashboardGoal[]>([]);
  private recommendationsSubject = new BehaviorSubject<PersonalizedRecommendation[]>([]);
  private activitiesSubject = new BehaviorSubject<RecentActivity[]>([]);

  public stats$ = this.statsSubject.asObservable();
  public upcomingSessions$ = this.upcomingSessionsSubject.asObservable();
  public activeGoals$ = this.activeGoalsSubject.asObservable();
  public recommendations$ = this.recommendationsSubject.asObservable();
  public recentActivities$ = this.activitiesSubject.asObservable();

  constructor() {
    // Initialize real-time listeners when user authenticates
    this.authService.user$.subscribe(user => {
      if (user && this.isJoyDimaculanganAccount(user)) {
        console.log('Initializing dashboard for Joy Dimaculangan mentee account');
        this.initializeRealtimeListeners(user.id);
      } else {
        // Reset to empty state when logged out or not Joy's account
        console.log('Resetting dashboard - not Joy Dimaculangan account or logged out');
        this.resetDashboard();
      }
    });
  }

  // Check if the current user is Joy Dimaculangan's mentee account
  private isJoyDimaculanganAccount(user: any): boolean {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const email = (user.email || '').toLowerCase();
    
    // Check for Joy Dimaculangan account by name or email
    return fullName === 'joy dimaculangan' || 
           email.includes('joy') && email.includes('dimaculangan') ||
           user.firstName?.toLowerCase() === 'joy' && user.lastName?.toLowerCase() === 'dimaculangan' ||
           email === 'joy.dimaculangan@example.com' || // Add specific email if known
           user.id === 'joy_dimaculangan_user_id'; // Add specific user ID if known
  }

  private initializeRealtimeListeners(userId: string): void {
    this.loadDashboardStats(userId);
    this.loadUpcomingSessions(userId);
    this.loadActiveGoals(userId);
    this.loadRecommendations(userId);
    this.loadRecentActivities(userId);
  }

  private async loadDashboardStats(userId: string): Promise<void> {
    await this.calculateRealStats(userId);
  }

  private async getUserSessions(userId: string): Promise<any[]> {
    const sessionsRef = collection(this.firestore, 'sessions');
    const q = query(
      sessionsRef,
      where('menteeId', '==', userId),
      where('status', '==', 'completed'),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async getUserGoals(userId: string): Promise<any[]> {
    const goalsRef = collection(this.firestore, 'goals');
    const q = query(
      goalsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async getUserAchievements(userId: string): Promise<any[]> {
    const achievementsRef = collection(this.firestore, 'achievements');
    const q = query(
      achievementsRef,
      where('userId', '==', userId),
      orderBy('earnedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private calculateStats(sessions: any[], goals: any[], achievements: any[]): DashboardStats {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalHours = completedSessions.reduce((sum, session) => {
      const duration = this.parseDuration(session.duration || '1 hour');
      return sum + duration;
    }, 0);

    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const completionRate = goals.length > 0 ? (completedGoals.length / goals.length) * 100 : 0;

    // Calculate skills from completed milestones and sessions
    const skillsSet = new Set<string>();
    completedGoals.forEach(goal => {
      goal.skills?.forEach((skill: string) => skillsSet.add(skill));
    });
    completedSessions.forEach(session => {
      session.skills?.forEach((skill: string) => skillsSet.add(skill));
    });

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(completedSessions);

    // Find next and last session dates
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.date.toDate ? a.date.toDate() : a.date).getTime() - 
      new Date(b.date.toDate ? b.date.toDate() : b.date).getTime()
    );
    
    const lastSession = sortedSessions.filter(s => s.status === 'completed').pop();
    const nextSession = sortedSessions.find(s => 
      s.status === 'confirmed' && 
      new Date(s.date.toDate ? s.date.toDate() : s.date) > new Date()
    );

    return {
      sessionsCompleted: completedSessions.length,
      hoursLearned: Math.round(totalHours * 10) / 10,
      goalsAchieved: completedGoals.length,
      skillsImproved: skillsSet.size,
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      completionRate: Math.round(completionRate),
      currentStreak,
      longestStreak,
      lastSessionDate: lastSession ? new Date(lastSession.date.toDate ? lastSession.date.toDate() : lastSession.date) : undefined,
      nextSessionDate: nextSession ? new Date(nextSession.date.toDate ? nextSession.date.toDate() : nextSession.date) : undefined
    };
  }

  private parseDuration(duration: string): number {
    // Parse duration strings like "1 hour", "30 minutes", "1.5 hours"
    const hourMatch = duration.match(/(\d+(?:\.\d+)?)\s*hour/i);
    const minuteMatch = duration.match(/(\d+)\s*minute/i);
    
    if (hourMatch) return parseFloat(hourMatch[1]);
    if (minuteMatch) return parseFloat(minuteMatch[1]) / 60;
    return 1; // Default to 1 hour
  }



  private async loadUpcomingSessions(userId: string): Promise<void> {
    try {
      console.log('Loading upcoming sessions for Joy Dimaculangan:', userId);
      
      const sessionsRef = collection(this.firestore, 'sessions');
      const now = Timestamp.now();
      
      // Query for upcoming sessions
      const q = query(
        sessionsRef,
        where('menteeId', '==', userId),
        where('date', '>=', now),
        where('status', 'in', ['pending', 'confirmed', 'scheduled']),
        orderBy('date', 'asc'),
        limit(10)
      );

      // Set up real-time listener
      onSnapshot(q, (snapshot) => {
        console.log('Joy Dimaculangan sessions snapshot received:', snapshot.size, 'documents');
        
        const sessions: UpcomingSession[] = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Joy session data:', data);
          
          return {
            id: doc.id,
            mentorName: data['mentorName'] || data['mentor']?.name || 'Unknown Mentor',
            mentorAvatar: data['mentorAvatar'] || data['mentor']?.avatar || this.getDefaultAvatar(data['mentorName'] || 'M'),
            mentorId: data['mentorId'] || data['mentor']?.id,
            title: data['title'] || data['subject'] || 'Mentorship Session',
            date: data['date']?.toDate ? data['date'].toDate() : new Date(data['date']),
            time: data['startTime'] || data['time'] || '00:00',
            duration: data['duration'] || '1 hour',
            status: data['status'] || 'pending',
            meetingLink: data['meetingLink'] || data['link'],
            agenda: data['agenda'] || data['topics'] || [],
            type: data['type'] || 'mentoring',
            location: data['location'] || 'Online'
          };
        });

        console.log('Processed Joy Dimaculangan upcoming sessions:', sessions);
        this.upcomingSessionsSubject.next(sessions);
      }, (error) => {
        console.error('Error in Joy Dimaculangan sessions real-time listener:', error);
        // Set empty array on error instead of sample data
        this.upcomingSessionsSubject.next([]);
      });
      
    } catch (error) {
      console.error('Error setting up Joy Dimaculangan sessions listener:', error);
      // Set empty array on error instead of sample data
      this.upcomingSessionsSubject.next([]);
    }
  }

  private async loadActiveGoals(userId: string): Promise<void> {
    try {
      console.log('Loading active goals for user:', userId);
      
      // Query goals collection directly for more control
      const goalsRef = collection(this.firestore, 'goals');
      const q = query(
        goalsRef,
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      // Set up real-time listener
      onSnapshot(q, (snapshot) => {
        console.log('Goals snapshot received:', snapshot.size, 'documents');
        
        const goals: DashboardGoal[] = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Goal data:', data);
          
          const milestones = data['milestones'] || [];
          const completedMilestones = milestones.filter((m: any) => m.completed).length;

          return {
            id: doc.id,
            title: data['title'] || 'Untitled Goal',
            description: data['description'] || '',
            progress: data['progress'] || 0,
            targetDate: data['targetDate']?.toDate ? data['targetDate'].toDate() : new Date(data['targetDate']),
            priority: data['priority'] || 'medium',
            status: data['status'] || 'active',
            skills: data['skills'] || [],
            completedMilestones,
            totalMilestones: milestones.length,
            lastUpdated: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['createdAt']?.toDate ? data['createdAt'].toDate() : Date.now())
          };
        });

        console.log('Processed active goals:', goals);
        this.activeGoalsSubject.next(goals);
      }, (error) => {
        console.error('Error in goals real-time listener:', error);
        // Set empty array on error instead of sample data
        this.activeGoalsSubject.next([]);
      });
      
    } catch (error) {
      console.error('Error setting up goals listener:', error);
      // Set empty array on error instead of sample data
      this.activeGoalsSubject.next([]);
    }
  }

  private async loadRecommendations(userId: string): Promise<void> {
    try {
      console.log('Loading recommendations for user:', userId);
      
      // Get user's skills and interests from goals and completed sessions
      const [goals, sessions] = await Promise.all([
        this.getUserGoals(userId),
        this.getUserSessions(userId)
      ]);

      console.log('User goals for recommendations:', goals.length);
      console.log('User sessions for recommendations:', sessions.length);

      const userSkills = new Set<string>();
      const userInterests = new Set<string>();

      // Extract skills and interests from user data
      goals.forEach(goal => {
        const goalData = goal.data ? goal.data() : goal;
        goalData.skills?.forEach((skill: string) => userSkills.add(skill.toLowerCase()));
        goalData.category && userInterests.add(goalData.category.toLowerCase());
      });

      sessions.forEach(session => {
        const sessionData = session.data ? session.data() : session;
        sessionData.skills?.forEach((skill: string) => userSkills.add(skill.toLowerCase()));
        sessionData.topics?.forEach((topic: string) => userInterests.add(topic.toLowerCase()));
      });

      console.log('Extracted skills:', Array.from(userSkills));
      console.log('Extracted interests:', Array.from(userInterests));

      // Generate personalized recommendations
      const recommendations = this.generatePersonalizedRecommendations(
        Array.from(userSkills), 
        Array.from(userInterests),
        goals,
        sessions
      );

      console.log('Generated recommendations:', recommendations.length);
      this.recommendationsSubject.next(recommendations);
      
    } catch (error) {
      console.error('Error loading recommendations:', error);
      // Set empty array on error instead of sample data
      this.recommendationsSubject.next([]);
    }
  }

  private generatePersonalizedRecommendations(
    skills: string[], 
    interests: string[], 
    goals: any[], 
    sessions: any[]
  ): PersonalizedRecommendation[] {
    // Get all resources from ResourcesService
    let allResources: Resource[] = [];
    this.resourcesService.getResources().subscribe(resources => {
      allResources = resources;
    }).unsubscribe();

    // Convert resources to recommendations with intelligent scoring
    const recommendations: PersonalizedRecommendation[] = allResources.map(resource => {
      return {
        id: resource.id,
        type: this.mapResourceTypeToRecommendationType(resource.category),
        title: resource.title,
        description: resource.description,
        relevanceScore: this.calculateRelevanceScore(resource, skills, interests, goals, sessions),
        category: resource.category || 'Learning',
        link: resource.url || '#',
        imageUrl: this.getDefaultImageForType(resource.category),
        estimatedTime: resource.duration || this.estimateTimeByType(resource.category),
        difficulty: resource.difficulty as 'beginner' | 'intermediate' | 'advanced',
        tags: resource.tags || [],
        reason: this.generateRecommendationReason(resource, skills, interests, goals, sessions)
      };
    });

    // Sort by relevance and return top 4
    return recommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 4);
  }

  private mapResourceTypeToRecommendationType(resourceType: string): 'article' | 'course' | 'video' | 'book' | 'event' {
    const typeMap: Record<string, 'article' | 'course' | 'video' | 'book' | 'event'> = {
      'book': 'book',
      'article': 'article',
      'course': 'course',
      'video': 'video',
      'tool': 'article',
      'template': 'article'
    };
    return typeMap[resourceType.toLowerCase()] || 'article';
  }

  private getDefaultImageForType(type: string): string {
    const imageMap: Record<string, string> = {
      'book': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop&auto=format&q=80',
      'article': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=200&fit=crop&auto=format&q=80',
      'course': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=200&fit=crop&auto=format&q=80',
      'video': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=300&h=200&fit=crop&auto=format&q=80',
      'tool': 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=300&h=200&fit=crop&auto=format&q=80',
      'template': 'https://images.unsplash.com/photo-1618477247222-acbdb0e159b3?w=300&h=200&fit=crop&auto=format&q=80',
      'tutorial': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop&auto=format&q=80',
      'guide': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&h=200&fit=crop&auto=format&q=80',
      'documentation': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop&auto=format&q=80'
    };
    return imageMap[type.toLowerCase()] || imageMap['article'];
  }

  private estimateTimeByType(type: string): string {
    const timeMap: Record<string, string> = {
      'book': '6-8 hours',
      'article': '15-20 min',
      'course': '3-5 hours',
      'video': '45-60 min',
      'tool': '30 min',
      'template': '15 min'
    };
    return timeMap[type.toLowerCase()] || '30 min';
  }

  private calculateRelevanceScore(
    resource: Resource, 
    skills: string[], 
    interests: string[], 
    goals: any[], 
    sessions: any[]
  ): number {
    let score = 50; // Base score

    // Check if resource matches user's skills
    const resourceTags = resource.tags?.map(t => t.toLowerCase()) || [];
    const userSkills = skills.map(s => s.toLowerCase());
    const skillMatches = resourceTags.filter(tag => 
      userSkills.some(skill => skill.includes(tag) || tag.includes(skill))
    ).length;
    score += (skillMatches * 15);

    // Check if resource matches user's interests
    const userInterests = interests.map(i => i.toLowerCase());
    const interestMatches = resourceTags.filter(tag => 
      userInterests.some(interest => interest.includes(tag) || tag.includes(interest))
    ).length;
    score += (interestMatches * 10);

    // Check if resource matches active goals
    const activeGoals = goals.filter(g => g.status === 'active');
    const goalKeywords = activeGoals.flatMap(goal => 
      goal.title?.toLowerCase().split(' ') || []
    );
    const goalMatches = resourceTags.filter(tag => 
      goalKeywords.some(keyword => keyword.includes(tag) || tag.includes(keyword))
    ).length;
    score += (goalMatches * 12);

    // Boost score based on resource rating
    if (resource.rating) {
      score += ((resource.rating - 3) * 5);
    }

    // Check recent session topics
    if (sessions.length > 0) {
      const recentTopics = sessions.slice(0, 3).flatMap(s => s.topics || []).map(t => t.toLowerCase());
      const topicMatches = resourceTags.filter(tag => 
        recentTopics.some(topic => topic.includes(tag) || tag.includes(topic))
      ).length;
      score += (topicMatches * 8);
    }

    // Cap the score between 0 and 100
    return Math.min(Math.max(score, 0), 100);
  }

  private generateRecommendationReason(
    resource: Resource, 
    skills: string[], 
    interests: string[], 
    goals: any[], 
    sessions: any[]
  ): string {
    const reasons = [];

    // Check for skill matches
    const resourceTags = resource.tags?.map(t => t.toLowerCase()) || [];
    const userSkills = skills.map(s => s.toLowerCase());
    const matchingSkills = resourceTags.filter(tag => 
      userSkills.some(skill => skill.includes(tag) || tag.includes(skill))
    );
    if (matchingSkills.length > 0) {
      reasons.push(`Matches your ${matchingSkills[0]} skills`);
    }

    // Check for goal alignment
    const activeGoals = goals.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
      reasons.push(`Aligns with your learning goals`);
    }

    // Check rating
    if (resource.rating && resource.rating >= 4.5) {
      reasons.push(`Highly rated (${resource.rating}/5)`);
    }

    // Check recent session topics
    if (sessions.length > 0) {
      const recentTopics = sessions.slice(0, 3).flatMap(s => s.topics || []).map(t => t.toLowerCase());
      const topicMatches = resourceTags.filter(tag => 
        recentTopics.some(topic => topic.includes(tag) || tag.includes(topic))
      );
      if (topicMatches.length > 0) {
        reasons.push('Based on your recent sessions');
      }
    }

    // Check interests
    const userInterests = interests.map(i => i.toLowerCase());
    const interestMatches = resourceTags.filter(tag => 
      userInterests.some(interest => interest.includes(tag) || tag.includes(interest))
    );
    if (interestMatches.length > 0) {
      reasons.push(`Matches your interests in ${interestMatches[0]}`);
    }

    return reasons.length > 0 ? reasons[0] : 'Recommended for you';
  }

  private async loadRecentActivities(userId: string): Promise<void> {
    try {
      console.log('Loading recent activities for user:', userId);
      
      // Try both 'user_activities' and 'activities' collections
      const activitiesRef = collection(this.firestore, 'activities');
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(15)
      );

      onSnapshot(q, (snapshot) => {
        console.log('Activities snapshot received:', snapshot.size, 'documents');
        
        const activities: RecentActivity[] = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Activity data:', data);
          
          return {
            id: doc.id,
            type: data['type'] || 'general',
            title: data['title'] || 'Activity',
            description: data['description'] || '',
            timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : new Date(data['createdAt']?.toDate ? data['createdAt'].toDate() : Date.now()),
            icon: data['icon'] || this.getActivityIcon(data['type'] || 'general'),
            relatedId: data['relatedId'],
            metadata: data['metadata']
          };
        });

        console.log('Processed recent activities:', activities);
        this.activitiesSubject.next(activities);
      }, (error) => {
        console.error('Error in activities real-time listener:', error);
        // Set empty array on error instead of sample data
        this.activitiesSubject.next([]);
      });
    } catch (error) {
      console.error('Error loading recent activities:', error);
      this.loadSampleActivities();
    }
  }

  // Add a new activity to the user's timeline
  async addActivity(userId: string, activity: Partial<RecentActivity>): Promise<void> {
    try {
      const activitiesRef = collection(this.firestore, 'user_activities');
      await addDoc(activitiesRef, {
        userId,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        timestamp: Timestamp.fromDate(activity.timestamp || new Date()),
        icon: activity.icon || this.getActivityIcon(activity.type || 'session'),
        relatedId: activity.relatedId,
        metadata: activity.metadata || {}
      });
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  }

  // Update goal progress and add activity
  async updateGoalProgress(goalId: string, progress: number): Promise<void> {
    try {
      const goalRef = doc(this.firestore, 'goals', goalId);
      await updateDoc(goalRef, {
        progress: Math.max(0, Math.min(100, progress)),
        updatedAt: Timestamp.now(),
        status: progress >= 100 ? 'completed' : 'active'
      });

      // Add activity
      this.authService.getCurrentUser().subscribe(user => {
        if (user?.id) {
          this.addActivity(user.id, {
            type: 'goal',
            title: 'Goal progress updated',
            description: `Updated progress to ${progress}%`,
            timestamp: new Date(),
            relatedId: goalId
          });
        }
      });
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  }

  // Fallback methods for when Firebase is not available
  private async calculateRealStats(userId: string): Promise<void> {
    try {
      console.log('Calculating real stats for user:', userId);
      
      // Get completed sessions
      const sessionsQuery = query(
        collection(this.firestore, 'sessions'),
        where('menteeId', '==', userId),
        where('status', '==', 'completed')
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const completedSessions = sessionsSnapshot.docs;
      console.log('Found completed sessions:', completedSessions.length);
      
      // Calculate hours learned from sessions
      let totalHours = 0;
      completedSessions.forEach(doc => {
        const data = doc.data();
        const duration = data['duration'] || '1 hour';
        // Parse duration (assuming format like "1 hour", "90 minutes", "1h", "60m", etc.)
        const hourMatch = duration.match(/(\d+(?:\.\d+)?)\s*h/i);
        const minuteMatch = duration.match(/(\d+)\s*m/i);
        const hourWordMatch = duration.match(/(\d+(?:\.\d+)?)\s*hour/i);
        const minuteWordMatch = duration.match(/(\d+)\s*minute/i);
        
        if (hourMatch) {
          totalHours += parseFloat(hourMatch[1]);
        } else if (hourWordMatch) {
          totalHours += parseFloat(hourWordMatch[1]);
        } else if (minuteMatch) {
          totalHours += parseFloat(minuteMatch[1]) / 60;
        } else if (minuteWordMatch) {
          totalHours += parseFloat(minuteWordMatch[1]) / 60;
        } else {
          totalHours += 1; // Default to 1 hour if can't parse
        }
      });

      // Get goals data
      const goalsQuery = query(
        collection(this.firestore, 'goals'),
        where('userId', '==', userId)
      );
      const goalsSnapshot = await getDocs(goalsQuery);
      const allGoals = goalsSnapshot.docs;
      const completedGoals = allGoals.filter(doc => doc.data()['status'] === 'completed');
      const activeGoals = allGoals.filter(doc => doc.data()['status'] === 'active');
      console.log('Found goals - Total:', allGoals.length, 'Completed:', completedGoals.length, 'Active:', activeGoals.length);
      
      // Calculate completion rate
      const completionRate = allGoals.length > 0 ? 
        Math.round((completedGoals.length / allGoals.length) * 100) : 0;

      // Calculate learning streak (simplified - based on activity dates)
      const activityQuery = query(
        collection(this.firestore, 'activities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(30) // Get last 30 activities to calculate streak
      );
      const activitySnapshot = await getDocs(activityQuery);
      const { currentStreak, longestStreak } = this.calculateStreaks(activitySnapshot.docs);

      // Get last and next session dates
      const upcomingQuery = query(
        collection(this.firestore, 'sessions'),
        where('menteeId', '==', userId),
        where('status', '==', 'scheduled'),
        orderBy('date', 'asc'),
        limit(1)
      );
      const upcomingSnapshot = await getDocs(upcomingQuery);
      const nextSession = upcomingSnapshot.docs[0];
      
      const lastSessionQuery = query(
        collection(this.firestore, 'sessions'),
        where('menteeId', '==', userId),
        where('status', '==', 'completed'),
        orderBy('date', 'desc'),
        limit(1)
      );
      const lastSessionSnapshot = await getDocs(lastSessionQuery);
      const lastSession = lastSessionSnapshot.docs[0];

      // Calculate skills improved (unique skills from completed goals and sessions)
      const skills = new Set<string>();
      completedSessions.forEach(doc => {
        const sessionSkills = doc.data()['skills'] || [];
        sessionSkills.forEach((skill: string) => skills.add(skill));
      });
      completedGoals.forEach(doc => {
        const goalSkills = doc.data()['skills'] || [];
        goalSkills.forEach((skill: string) => skills.add(skill));
      });

      this.statsSubject.next({
        sessionsCompleted: completedSessions.length,
        hoursLearned: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
        goalsAchieved: completedGoals.length,
        skillsImproved: skills.size,
        totalGoals: allGoals.length,
        activeGoals: activeGoals.length,
        completionRate,
        currentStreak,
        longestStreak,
        nextSessionDate: nextSession ? nextSession.data()['date'].toDate() : undefined,
        lastSessionDate: lastSession ? lastSession.data()['date'].toDate() : undefined
      });

    } catch (error) {
      console.error('Error calculating real stats:', error);
      // Set empty stats on error instead of sample data
      this.statsSubject.next({
        sessionsCompleted: 0,
        hoursLearned: 0,
        goalsAchieved: 0,
        skillsImproved: 0,
        totalGoals: 0,
        activeGoals: 0,
        completionRate: 0,
        currentStreak: 0,
        longestStreak: 0
      });
    }
  }

  private calculateStreaks(activityDocs: any[]): { currentStreak: number; longestStreak: number } {
    if (activityDocs.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    // Group activities by date
    const activityByDate = new Map<string, boolean>();
    activityDocs.forEach(doc => {
      const date = doc.data()['timestamp'].toDate();
      const dateStr = date.toISOString().split('T')[0];
      activityByDate.set(dateStr, true);
    });
    
    const sortedDates = Array.from(activityByDate.keys()).sort().reverse();
    
    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (activityByDate.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;
    
    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr);
      if (lastDate && (lastDate.getTime() - currentDate.getTime()) === 24 * 60 * 60 * 1000) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = currentDate;
    }
    
    return { currentStreak, longestStreak };
  }

  private loadSampleStats(): void {
    this.statsSubject.next({
      sessionsCompleted: 0,
      hoursLearned: 0,
      goalsAchieved: 0,
      skillsImproved: 0,
      totalGoals: 0,
      activeGoals: 0,
      completionRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      nextSessionDate: undefined,
      lastSessionDate: undefined
    });
  }

  private loadSampleSessions(): void {
    this.upcomingSessionsSubject.next([
      {
        id: 'session_1',
        mentorName: 'Joy Dimaculangan',
        mentorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
        mentorId: 'mentor_1',
        title: 'React Performance Optimization',
        date: new Date('2025-10-20T08:00:00'),
        time: '08:00',
        duration: '1 hour',
        status: 'confirmed',
        meetingLink: 'https://meet.google.com/abc-def-ghi',
        type: 'mentoring'
      }
    ]);
  }

  private loadSampleGoals(): void {
    this.activeGoalsSubject.next([
      {
        id: 'goal_1',
        title: 'Master React Development',
        description: 'Build 3 React projects and understand advanced concepts',
        progress: 65,
        targetDate: new Date('2025-12-15'),
        priority: 'high',
        status: 'active',
        skills: ['React', 'JavaScript'],
        completedMilestones: 2,
        totalMilestones: 4,
        lastUpdated: new Date()
      }
    ]);
  }

  private loadSampleRecommendations(): void {
    // Use real resources as fallback instead of hardcoded data
    this.resourcesService.getResources().subscribe(resources => {
      const sampleRecommendations: PersonalizedRecommendation[] = resources.slice(0, 4).map(resource => ({
        id: resource.id,
        type: this.mapResourceTypeToRecommendationType(resource.category),
        title: resource.title,
        description: resource.description,
        relevanceScore: 80, // Default relevance score
        category: resource.category || 'Learning',
        link: resource.url || '#',
        imageUrl: this.getDefaultImageForType(resource.category),
        estimatedTime: resource.duration || this.estimateTimeByType(resource.category),
        difficulty: resource.difficulty as 'beginner' | 'intermediate' | 'advanced',
        tags: resource.tags || [],
        reason: 'Recommended for you'
      }));

      this.recommendationsSubject.next(sampleRecommendations);
    });
  }

  private loadSampleActivities(): void {
    this.activitiesSubject.next([
      {
        id: 'activity_1',
        type: 'session',
        title: 'Completed mentorship session',
        description: 'React Performance Optimization with John Doe',
        timestamp: new Date(),
        icon: '📹'
      }
    ]);
  }

  private resetDashboard(): void {
    this.statsSubject.next({
      sessionsCompleted: 0,
      hoursLearned: 0,
      goalsAchieved: 0,
      skillsImproved: 0,
      totalGoals: 0,
      activeGoals: 0,
      completionRate: 0,
      currentStreak: 0,
      longestStreak: 0
    });
    this.upcomingSessionsSubject.next([]);
    this.activeGoalsSubject.next([]);
    this.recommendationsSubject.next([]);
    this.activitiesSubject.next([]);
  }

  private getDefaultAvatar(name: string): string {
    const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'M';
    return `https://ui-avatars.com/api/?name=${initials}&background=3B82F6&color=FFFFFF&size=100`;
  }

  private getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      session: '📹',
      goal: '🎯',
      achievement: '🏆',
      resource: '📚',
      connection: '🤝',
      milestone: '✅'
    };
    return icons[type] || '📌';
  }


}