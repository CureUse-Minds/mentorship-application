import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  progress: number;
  targetDate: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'paused';
  skills: string[];
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: Date;
  targetDate?: Date;
}

export interface MentorshipStats {
  sessionsCompleted: number;
  hoursLearned: number;
  goalsAchieved: number;
  skillsImproved: number;
  totalGoals: number;
  activeGoals: number;
  completionRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private authService = inject(AuthService);
  
  // In-memory storage (in real app, this would connect to Firebase/backend)
  private goalsSubject = new BehaviorSubject<Goal[]>([]);
  public goals$ = this.goalsSubject.asObservable();

  constructor() {
    this.initializeGoalsData();
  }

  private initializeGoalsData(): void {
    // For now, use a default user ID - in real app, subscribe to auth state
    const userId = 'user_1';

    const sampleGoals: Goal[] = [
      {
        id: 'goal_1',
        userId,
        title: 'Master React Development',
        description: 'Build 3 React projects and understand advanced concepts like hooks, context, and performance optimization',
        progress: 65,
        targetDate: new Date('2025-12-15'),
        priority: 'high',
        status: 'active',
        skills: ['React', 'JavaScript', 'Frontend Development', 'Component Architecture'],
        milestones: [
          {
            id: 'm1',
            title: 'Complete React Fundamentals',
            description: 'Learn components, props, state, and event handling',
            completed: true,
            completedAt: new Date('2025-09-15'),
            targetDate: new Date('2025-09-30')
          },
          {
            id: 'm2',
            title: 'Build First React Project',
            description: 'Create a todo app with CRUD functionality',
            completed: true,
            completedAt: new Date('2025-10-01'),
            targetDate: new Date('2025-10-15')
          },
          {
            id: 'm3',
            title: 'Learn Advanced Hooks',
            description: 'Master useEffect, useContext, useReducer, and custom hooks',
            completed: false,
            targetDate: new Date('2025-11-01')
          },
          {
            id: 'm4',
            title: 'Build E-commerce Project',
            description: 'Create a complete e-commerce app with authentication and payment',
            completed: false,
            targetDate: new Date('2025-11-30')
          }
        ],
        createdAt: new Date('2025-08-01'),
        updatedAt: new Date('2025-10-17')
      },
      {
        id: 'goal_2',
        userId,
        title: 'Improve Communication Skills',
        description: 'Practice presentations, active listening, and technical communication',
        progress: 40,
        targetDate: new Date('2025-11-30'),
        priority: 'medium',
        status: 'active',
        skills: ['Public Speaking', 'Active Listening', 'Technical Writing', 'Presentation'],
        milestones: [
          {
            id: 'm5',
            title: 'Join Toastmasters',
            description: 'Attend weekly meetings and practice speaking',
            completed: true,
            completedAt: new Date('2025-09-01'),
            targetDate: new Date('2025-09-15')
          },
          {
            id: 'm6',
            title: 'Complete 5 Presentations',
            description: 'Practice with different topics and audiences',
            completed: false,
            targetDate: new Date('2025-11-15')
          },
          {
            id: 'm7',
            title: 'Write Technical Blog Posts',
            description: 'Publish 3 technical articles online',
            completed: false,
            targetDate: new Date('2025-11-30')
          }
        ],
        createdAt: new Date('2025-08-15'),
        updatedAt: new Date('2025-10-10')
      },
      {
        id: 'goal_3',
        userId,
        title: 'Build Professional Network',
        description: 'Connect with 10 industry professionals and attend networking events',
        progress: 30,
        targetDate: new Date('2025-11-15'),
        priority: 'low',
        status: 'active',
        skills: ['Networking', 'Professional Communication', 'Industry Knowledge'],
        milestones: [
          {
            id: 'm8',
            title: 'Update LinkedIn Profile',
            description: 'Create compelling profile with recent achievements',
            completed: true,
            completedAt: new Date('2025-08-20'),
            targetDate: new Date('2025-08-31')
          },
          {
            id: 'm9',
            title: 'Attend 3 Networking Events',
            description: 'Participate in tech meetups and conferences',
            completed: false,
            targetDate: new Date('2025-11-01')
          },
          {
            id: 'm10',
            title: 'Connect with 10 Professionals',
            description: 'Build meaningful professional relationships',
            completed: false,
            targetDate: new Date('2025-11-15')
          }
        ],
        createdAt: new Date('2025-08-10'),
        updatedAt: new Date('2025-10-05')
      }
    ];

    this.goalsSubject.next(sampleGoals);
  }

  getGoals(): Observable<Goal[]> {
    return this.goals$;
  }

  getActiveGoals(): Observable<Goal[]> {
    return this.goals$.pipe(
      map(goals => goals.filter(goal => goal.status === 'active'))
    );
  }

  getGoalById(id: string): Observable<Goal | undefined> {
    return this.goals$.pipe(
      map(goals => goals.find(goal => goal.id === id))
    );
  }

  getMentorshipStats(): Observable<MentorshipStats> {
    return this.goals$.pipe(
      map(goals => {
        const totalGoals = goals.length;
        const activeGoals = goals.filter(g => g.status === 'active').length;
        const completedGoals = goals.filter(g => g.status === 'completed').length;
        const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
        
        // Calculate skills from completed milestones
        const skillsImproved = new Set<string>();
        goals.forEach(goal => {
          goal.milestones
            .filter(m => m.completed)
            .forEach(() => {
              goal.skills.forEach(skill => skillsImproved.add(skill));
            });
        });

        return {
          sessionsCompleted: 12, // This would come from CalendarService
          hoursLearned: 24, // This would be calculated from sessions
          goalsAchieved: completedGoals,
          skillsImproved: skillsImproved.size,
          totalGoals,
          activeGoals,
          completionRate
        };
      })
    );
  }

  updateGoalProgress(goalId: string, progress: number): Observable<Goal> {
    const currentGoals = this.goalsSubject.value;
    const goalIndex = currentGoals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    const updatedGoal = { 
      ...currentGoals[goalIndex], 
      progress: Math.max(0, Math.min(100, progress)),
      updatedAt: new Date(),
      status: progress >= 100 ? 'completed' as const : 'active' as const
    };

    const updatedGoals = [...currentGoals];
    updatedGoals[goalIndex] = updatedGoal;
    this.goalsSubject.next(updatedGoals);

    return of(updatedGoal);
  }

  addGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Observable<Goal> {
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentGoals = this.goalsSubject.value;
    this.goalsSubject.next([...currentGoals, newGoal]);

    return of(newGoal);
  }

  completeMilestone(goalId: string, milestoneId: string): Observable<Goal> {
    const currentGoals = this.goalsSubject.value;
    const goalIndex = currentGoals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    const goal = currentGoals[goalIndex];
    const milestoneIndex = goal.milestones.findIndex(m => m.id === milestoneId);
    
    if (milestoneIndex === -1) {
      throw new Error('Milestone not found');
    }

    const updatedMilestones = [...goal.milestones];
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: true,
      completedAt: new Date()
    };

    // Calculate new progress based on completed milestones
    const completedMilestones = updatedMilestones.filter(m => m.completed).length;
    const totalMilestones = updatedMilestones.length;
    const newProgress = Math.round((completedMilestones / totalMilestones) * 100);

    const updatedGoal = {
      ...goal,
      milestones: updatedMilestones,
      progress: newProgress,
      status: newProgress >= 100 ? 'completed' as const : 'active' as const,
      updatedAt: new Date()
    };

    const updatedGoals = [...currentGoals];
    updatedGoals[goalIndex] = updatedGoal;
    this.goalsSubject.next(updatedGoals);

    return of(updatedGoal);
  }

  updateGoal(goalId: string, updates: Partial<Omit<Goal, 'id' | 'userId' | 'createdAt'>>): Observable<Goal> {
    const currentGoals = this.goalsSubject.value;
    const goalIndex = currentGoals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    const updatedGoal = {
      ...currentGoals[goalIndex],
      ...updates,
      updatedAt: new Date()
    };

    const updatedGoals = [...currentGoals];
    updatedGoals[goalIndex] = updatedGoal;
    this.goalsSubject.next(updatedGoals);

    return of(updatedGoal);
  }

  deleteGoal(goalId: string): Observable<boolean> {
    const currentGoals = this.goalsSubject.value;
    const goalIndex = currentGoals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    const updatedGoals = currentGoals.filter(g => g.id !== goalId);
    this.goalsSubject.next(updatedGoals);

    return of(true);
  }

  toggleMilestone(goalId: string, milestoneId: string): Observable<Goal> {
    const currentGoals = this.goalsSubject.value;
    const goalIndex = currentGoals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    const goal = currentGoals[goalIndex];
    const milestoneIndex = goal.milestones.findIndex(m => m.id === milestoneId);
    
    if (milestoneIndex === -1) {
      throw new Error('Milestone not found');
    }

    const updatedMilestones = [...goal.milestones];
    const milestone = updatedMilestones[milestoneIndex];
    updatedMilestones[milestoneIndex] = {
      ...milestone,
      completed: !milestone.completed,
      completedAt: !milestone.completed ? new Date() : undefined
    };

    // Recalculate progress
    const completedMilestones = updatedMilestones.filter(m => m.completed).length;
    const totalMilestones = updatedMilestones.length;
    const newProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const updatedGoal = {
      ...goal,
      milestones: updatedMilestones,
      progress: newProgress,
      status: newProgress >= 100 ? 'completed' as const : newProgress > 0 ? 'active' as const : goal.status,
      updatedAt: new Date()
    };

    const updatedGoals = [...currentGoals];
    updatedGoals[goalIndex] = updatedGoal;
    this.goalsSubject.next(updatedGoals);

    return of(updatedGoal);
  }

  addMilestone(goalId: string, milestone: Omit<Milestone, 'id'>): Observable<Goal> {
    const currentGoals = this.goalsSubject.value;
    const goalIndex = currentGoals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    const goal = currentGoals[goalIndex];
    const newMilestone: Milestone = {
      ...milestone,
      id: `milestone_${Date.now()}`
    };

    const updatedMilestones = [...goal.milestones, newMilestone];
    
    // Recalculate progress
    const completedMilestones = updatedMilestones.filter(m => m.completed).length;
    const totalMilestones = updatedMilestones.length;
    const newProgress = Math.round((completedMilestones / totalMilestones) * 100);

    const updatedGoal = {
      ...goal,
      milestones: updatedMilestones,
      progress: newProgress,
      updatedAt: new Date()
    };

    const updatedGoals = [...currentGoals];
    updatedGoals[goalIndex] = updatedGoal;
    this.goalsSubject.next(updatedGoals);

    return of(updatedGoal);
  }

  deleteMilestone(goalId: string, milestoneId: string): Observable<Goal> {
    const currentGoals = this.goalsSubject.value;
    const goalIndex = currentGoals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    const goal = currentGoals[goalIndex];
    const updatedMilestones = goal.milestones.filter(m => m.id !== milestoneId);
    
    // Recalculate progress
    const completedMilestones = updatedMilestones.filter(m => m.completed).length;
    const totalMilestones = updatedMilestones.length;
    const newProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const updatedGoal = {
      ...goal,
      milestones: updatedMilestones,
      progress: newProgress,
      updatedAt: new Date()
    };

    const updatedGoals = [...currentGoals];
    updatedGoals[goalIndex] = updatedGoal;
    this.goalsSubject.next(updatedGoals);

    return of(updatedGoal);
  }
}