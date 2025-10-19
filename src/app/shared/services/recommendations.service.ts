import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, combineLatest } from 'rxjs';
import { GoalsService } from './goals.service';
import { CalendarService } from './calendar.service';

export interface Recommendation {
  id: string;
  type: 'skill' | 'resource' | 'mentor' | 'event' | 'course';
  title: string;
  description: string;
  relevanceScore: number; // 0-100
  category: string;
  link?: string;
  imageUrl?: string;
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  createdAt: Date;
}

export interface RecentActivity {
  id: string;
  type: 'session' | 'goal' | 'achievement' | 'resource' | 'connection';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  relatedId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationsService {
  private goalsService = inject(GoalsService);
  private calendarService = inject(CalendarService);
  
  private recommendationsSubject = new BehaviorSubject<Recommendation[]>([]);
  public recommendations$ = this.recommendationsSubject.asObservable();
  
  private activitiesSubject = new BehaviorSubject<RecentActivity[]>([]);
  public recentActivities$ = this.activitiesSubject.asObservable();

  constructor() {
    this.initializeRecommendations();
    this.initializeActivities();
    this.generatePersonalizedRecommendations();
  }

  private initializeRecommendations(): void {
    const sampleRecommendations: Recommendation[] = [
      {
        id: 'rec_1',
        type: 'course',
        title: 'Advanced React Patterns',
        description: 'Learn compound components, render props, and hooks patterns to write more maintainable React code.',
        relevanceScore: 95,
        category: 'Frontend Development',
        link: 'https://example.com/react-course',
        imageUrl: 'https://via.placeholder.com/300x200/3B82F6/ffffff?text=React+Course',
        estimatedTime: '8 hours',
        difficulty: 'intermediate',
        tags: ['React', 'JavaScript', 'Frontend', 'Components'],
        createdAt: new Date('2025-01-15')
      },
      {
        id: 'rec_2',
        type: 'mentor',
        title: 'Sarah Chen - Senior Frontend Engineer',
        description: 'Experienced React developer with 6+ years at top tech companies. Specializes in performance optimization and scalable architecture.',
        relevanceScore: 88,
        category: 'Mentorship',
        link: '/mentors/sarah-chen',
        imageUrl: 'https://via.placeholder.com/150x150/10B981/ffffff?text=SC',
        estimatedTime: '1 hour sessions',
        difficulty: 'intermediate',
        tags: ['React', 'Performance', 'Architecture', 'Frontend'],
        createdAt: new Date('2025-01-14')
      },
      {
        id: 'rec_3',
        type: 'resource',
        title: 'Public Speaking Essentials',
        description: 'A comprehensive guide to overcoming anxiety and delivering impactful presentations in tech environments.',
        relevanceScore: 82,
        category: 'Soft Skills',
        link: 'https://example.com/speaking-guide',
        imageUrl: 'https://via.placeholder.com/300x200/8B5CF6/ffffff?text=Speaking+Guide',
        estimatedTime: '3 hours read',
        difficulty: 'beginner',
        tags: ['Communication', 'Presentations', 'Leadership', 'Career'],
        createdAt: new Date('2025-01-13')
      },
      {
        id: 'rec_4',
        type: 'event',
        title: 'Tech Networking Mixer',
        description: 'Monthly networking event for developers and tech professionals. Great for building industry connections.',
        relevanceScore: 75,
        category: 'Networking',
        link: '/events/tech-mixer-jan',
        imageUrl: 'https://via.placeholder.com/300x200/F59E0B/ffffff?text=Networking',
        estimatedTime: '3 hours',
        difficulty: 'beginner',
        tags: ['Networking', 'Career', 'Professional Development'],
        createdAt: new Date('2025-01-12')
      },
      {
        id: 'rec_5',
        type: 'skill',
        title: 'TypeScript Fundamentals',
        description: 'Master type safety and advanced TypeScript features to improve your JavaScript development workflow.',
        relevanceScore: 90,
        category: 'Programming Languages',
        link: 'https://example.com/typescript-course',
        imageUrl: 'https://via.placeholder.com/300x200/2563EB/ffffff?text=TypeScript',
        estimatedTime: '12 hours',
        difficulty: 'intermediate',
        tags: ['TypeScript', 'JavaScript', 'Type Safety', 'Development'],
        createdAt: new Date('2025-01-11')
      }
    ];

    this.recommendationsSubject.next(sampleRecommendations);
  }

  private initializeActivities(): void {
    const sampleActivities: RecentActivity[] = [
      {
        id: 'activity_1',
        type: 'session',
        title: 'Completed mentoring session with Alex Johnson',
        description: 'Discussed React performance optimization and component lifecycle',
        timestamp: new Date('2025-01-17T14:30:00'),
        icon: '👥',
        relatedId: 'session_1'
      },
      {
        id: 'activity_2',
        type: 'achievement',
        title: 'Milestone completed: Learn Advanced Hooks',
        description: 'Successfully completed the hooks learning milestone in React Development goal',
        timestamp: new Date('2025-01-16T09:15:00'),
        icon: '🎯',
        relatedId: 'goal_1'
      },
      {
        id: 'activity_3',
        title: 'Goal progress updated',
        type: 'goal',
        description: 'React Development goal is now 65% complete',
        timestamp: new Date('2025-01-15T16:45:00'),
        icon: '📈',
        relatedId: 'goal_1'
      },
      {
        id: 'activity_4',
        type: 'resource',
        title: 'Bookmarked: Advanced React Patterns course',
        description: 'Added recommended course to your learning resources',
        timestamp: new Date('2025-01-14T11:20:00'),
        icon: '📚',
        relatedId: 'rec_1'
      },
      {
        id: 'activity_5',
        type: 'connection',
        title: 'Connected with Sarah Chen',
        description: 'New mentorship connection established',
        timestamp: new Date('2025-01-13T13:00:00'),
        icon: '🤝',
        relatedId: 'mentor_sarah'
      },
      {
        id: 'activity_6',
        type: 'session',
        title: 'Upcoming session scheduled',
        description: 'Next mentoring session with Alex Johnson scheduled for tomorrow',
        timestamp: new Date('2025-01-12T10:30:00'),
        icon: '📅',
        relatedId: 'session_2'
      }
    ];

    this.activitiesSubject.next(sampleActivities);
  }

  private generatePersonalizedRecommendations(): void {
    // This would analyze user's goals, session history, and progress to generate personalized recommendations
    combineLatest([
      this.goalsService.getActiveGoals(),
      this.calendarService.getUpcomingSessions()
    ]).subscribe(([goals, sessions]) => {
      // In a real app, this would use ML/AI to generate personalized recommendations
      // For now, we'll just use the sample data
      console.log('Generating recommendations based on:', { goals: goals.length, sessions: sessions.length });
    });
  }

  getRecommendations(limit?: number): Observable<Recommendation[]> {
    return this.recommendations$.pipe(
      map(recommendations => {
        const sortedRecommendations = recommendations
          .sort((a, b) => b.relevanceScore - a.relevanceScore);
        return limit ? sortedRecommendations.slice(0, limit) : sortedRecommendations;
      })
    );
  }

  getRecommendationsByType(type: Recommendation['type']): Observable<Recommendation[]> {
    return this.recommendations$.pipe(
      map(recommendations => 
        recommendations.filter(rec => rec.type === type)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
      )
    );
  }

  getRecentActivities(limit?: number): Observable<RecentActivity[]> {
    return this.recentActivities$.pipe(
      map(activities => {
        const sortedActivities = activities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return limit ? sortedActivities.slice(0, limit) : sortedActivities;
      })
    );
  }

  addActivity(activity: Omit<RecentActivity, 'id'>): void {
    const newActivity: RecentActivity = {
      ...activity,
      id: `activity_${Date.now()}`
    };

    const currentActivities = this.activitiesSubject.value;
    this.activitiesSubject.next([newActivity, ...currentActivities]);
  }

  markRecommendationAsViewed(recommendationId: string): void {
    // In a real app, this would track user interactions for better recommendations
    console.log('Recommendation viewed:', recommendationId);
  }

  dismissRecommendation(recommendationId: string): Observable<void> {
    const currentRecommendations = this.recommendationsSubject.value;
    const filteredRecommendations = currentRecommendations.filter(rec => rec.id !== recommendationId);
    this.recommendationsSubject.next(filteredRecommendations);
    
    return new Observable(observer => {
      observer.next();
      observer.complete();
    });
  }
}