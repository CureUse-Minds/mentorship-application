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
  addDoc,
  deleteDoc
} from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';

export interface MentorStats {
  totalMentees: number;
  activeSessions: number;
  completedSessions: number;
  pendingRequests: number;
  averageRating: number;
  totalHours: number;
}

export interface MenteeRequest {
  id: string;
  menteeName: string;
  menteeId: string;
  menteeAvatar?: string;
  requestDate: Date;
  message: string;
  skills: string[];
  status: 'pending' | 'accepted' | 'declined';
  menteeEmail?: string;
}

export interface ActiveMentee {
  id: string;
  name: string;
  avatar?: string;
  joinDate: Date;
  progress: number;
  lastSession?: Date;
  nextSession?: Date;
  currentGoals: string[];
  status: 'active' | 'paused' | 'completed';
  email?: string;
}

export interface MentorUpcomingSession {
  id: string;
  menteeName: string;
  menteeAvatar?: string;
  date: Date;
  duration: string;
  topic: string;
  type: 'one-on-one' | 'group' | 'workshop';
  status: 'scheduled' | 'confirmed' | 'pending';
  menteeId: string;
}

export interface MentorActivity {
  id: string;
  type: 'session_completed' | 'new_request' | 'assignment_submitted' | 'goal_achieved' | 'feedback_received';
  title: string;
  description: string;
  timestamp: Date;
  relatedUser?: string;
  avatar?: string;
  menteeId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MentorDashboardService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // State management
  private statsSubject = new BehaviorSubject<MentorStats>({
    totalMentees: 0,
    activeSessions: 0,
    completedSessions: 0,
    pendingRequests: 0,
    averageRating: 0,
    totalHours: 0
  });

  private requestsSubject = new BehaviorSubject<MenteeRequest[]>([]);
  private activeMenteesSubject = new BehaviorSubject<ActiveMentee[]>([]);
  private upcomingSessionsSubject = new BehaviorSubject<MentorUpcomingSession[]>([]);
  private activitiesSubject = new BehaviorSubject<MentorActivity[]>([]);

  // Observable streams
  stats$ = this.statsSubject.asObservable();
  requests$ = this.requestsSubject.asObservable();
  activeMentees$ = this.activeMenteesSubject.asObservable();
  upcomingSessions$ = this.upcomingSessionsSubject.asObservable();
  activities$ = this.activitiesSubject.asObservable();

  constructor() {
    this.initializeMentorDashboard();
  }

  private initializeMentorDashboard() {
    this.authService.user$.subscribe(user => {
      if (user?.id) {
        console.log('Initializing mentor dashboard for:', user.firstName, user.lastName);
        this.loadMentorshipRequests(user.id);
        this.loadActiveMentees(user.id);
        this.loadUpcomingSessions(user.id);
        this.loadMentorActivities(user.id);
        this.calculateStats(user.id);
      } else {
        this.resetDashboard();
      }
    });
  }

  private loadMentorshipRequests(mentorId: string) {
    console.log('Loading real session requests from Firebase for mentor:', mentorId);
    
    // Query Firebase for real session requests (same as the requests page)
    const sessionRequestsQuery = query(
      collection(this.firestore, 'sessions'),
      where('mentorId', '==', mentorId),
      where('status', '==', 'pending')
    );

    onSnapshot(sessionRequestsQuery, (snapshot) => {
      const requests: MenteeRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Found session request:', doc.id, data);
        requests.push({
          id: doc.id,
          menteeName: data['menteeName'] || 'Unknown Mentee',
          menteeId: data['menteeId'] || '',
          menteeAvatar: data['menteeAvatar'] || data['avatar'],
          requestDate: data['createdAt']?.toDate() || data['scheduledDate']?.toDate() || new Date(),
          message: data['message'] || data['topic'] || '',
          skills: data['skills'] || data['topic'] ? [data['topic']] : [],
          status: 'pending',
          menteeEmail: data['menteeEmail'] || ''
        });
      });
      
      console.log('Loaded session requests from Firebase:', requests.length, 'requests');
      this.requestsSubject.next(requests);
    }, (error) => {
      console.error('Error loading session requests:', error);
      this.requestsSubject.next([]);
    });
  }

  private loadActiveMentees(mentorId: string) {
    console.log('Loading real active mentees from Firebase for mentor:', mentorId);
    
    // Query Firebase for accepted mentorship relationships
    const menteesQuery = query(
      collection(this.firestore, 'mentorship-relationships'),
      where('mentorId', '==', mentorId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    onSnapshot(menteesQuery, (snapshot) => {
      const mentees: ActiveMentee[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Found active mentee relationship:', doc.id, data);
        mentees.push({
          id: doc.id,
          name: data['menteeName'] || data['mentee']?.name || 'Unknown Mentee',
          avatar: data['menteeAvatar'] || data['mentee']?.avatar,
          joinDate: data['createdAt']?.toDate() || new Date(),
          progress: data['progress'] || 0,
          lastSession: data['lastSession']?.toDate(),
          nextSession: data['nextSession']?.toDate(),
          currentGoals: data['currentGoals'] || [],
          status: data['status'] || 'active',
          email: data['menteeEmail'] || data['mentee']?.email
        });
      });
      
      console.log('Loaded active mentees from Firebase:', mentees.length, 'mentees');
      this.activeMenteesSubject.next(mentees);
    }, (error) => {
      console.error('Error loading active mentees:', error);
      this.activeMenteesSubject.next([]);
    });
  }

  private loadUpcomingSessions(mentorId: string) {
    console.log('Loading real upcoming sessions from Firebase for mentor:', mentorId);
    
    // Query Firebase for upcoming sessions
    const sessionsQuery = query(
      collection(this.firestore, 'sessions'),
      where('mentorId', '==', mentorId),
      where('status', 'in', ['scheduled', 'confirmed', 'pending']),
      where('date', '>=', Timestamp.now()),
      orderBy('date', 'asc'),
      limit(10)
    );

    onSnapshot(sessionsQuery, (snapshot) => {
      const sessions: MentorUpcomingSession[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Found upcoming session:', doc.id, data);
        sessions.push({
          id: doc.id,
          menteeName: data['menteeName'] || data['mentee']?.name || 'Unknown Mentee',
          menteeAvatar: data['menteeAvatar'] || data['mentee']?.avatar,
          date: data['date']?.toDate() || new Date(),
          duration: data['duration'] || '1 hour',
          topic: data['topic'] || data['title'] || 'Mentorship Session',
          type: data['type'] || 'one-on-one',
          status: data['status'] || 'scheduled',
          menteeId: data['menteeId'] || data['mentee']?.id
        });
      });
      
      console.log('Loaded upcoming sessions from Firebase:', sessions.length, 'sessions');
      this.upcomingSessionsSubject.next(sessions);
    }, (error) => {
      console.error('Error loading upcoming sessions:', error);
      this.upcomingSessionsSubject.next([]);
    });
  }

  private loadMentorActivities(mentorId: string) {
    console.log('Loading real mentor activities from Firebase for:', mentorId);
    
    // Query Firebase for mentor activities/events
    const activitiesQuery = query(
      collection(this.firestore, 'mentor-activities'),
      where('mentorId', '==', mentorId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    onSnapshot(activitiesQuery, (snapshot) => {
      const activities: MentorActivity[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Found mentor activity:', doc.id, data);
        activities.push({
          id: doc.id,
          type: data['type'] || 'new_request',
          title: data['title'] || 'Activity',
          description: data['description'] || '',
          timestamp: data['timestamp']?.toDate() || new Date(),
          relatedUser: data['relatedUser'] || data['mentee']?.name,
          avatar: data['avatar'] || data['mentee']?.avatar,
          menteeId: data['menteeId'] || data['mentee']?.id
        });
      });
      
      console.log('Loaded mentor activities from Firebase:', activities.length, 'activities');
      this.activitiesSubject.next(activities);
    }, (error) => {
      console.error('Error loading mentor activities:', error);
      this.activitiesSubject.next([]);
    });
  }

  private calculateStats(mentorId: string) {
    console.log('Calculating real mentor stats from Firebase for:', mentorId);
    
    // Calculate stats based on real Firebase data
    const currentRequests = this.requestsSubject.value;
    const currentMentees = this.activeMenteesSubject.value;
    const currentSessions = this.upcomingSessionsSubject.value;
    
    // Query for completed sessions count
    const completedSessionsQuery = query(
      collection(this.firestore, 'sessions'),
      where('mentorId', '==', mentorId),
      where('status', '==', 'completed')
    );

    getDocs(completedSessionsQuery).then((completedSnapshot) => {
      const completedCount = completedSnapshot.size;
      
      // Calculate total hours from completed sessions
      let totalHours = 0;
      completedSnapshot.forEach((doc) => {
        const data = doc.data();
        const duration = data['duration'];
        if (duration) {
          // Parse duration (e.g., "1 hour", "30 mins", "1.5 hours")
          const hours = this.parseDurationToHours(duration);
          totalHours += hours;
        }
      });

      // Query for mentor ratings
      const ratingsQuery = query(
        collection(this.firestore, 'mentor-ratings'),
        where('mentorId', '==', mentorId)
      );

      getDocs(ratingsQuery).then((ratingsSnapshot) => {
        let totalRating = 0;
        let ratingCount = 0;
        
        ratingsSnapshot.forEach((doc) => {
          const data = doc.data();
          const rating = data['rating'];
          if (rating && typeof rating === 'number') {
            totalRating += rating;
            ratingCount++;
          }
        });

        const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

        const stats: MentorStats = {
          totalMentees: currentMentees.length,
          activeSessions: currentSessions.length,
          completedSessions: completedCount,
          pendingRequests: currentRequests.filter(r => r.status === 'pending').length,
          averageRating: averageRating,
          totalHours: totalHours
        };

        console.log('Calculated mentor stats from Firebase:', stats);
        this.statsSubject.next(stats);
      }).catch((error) => {
        console.error('Error loading mentor ratings:', error);
        // Use basic stats without ratings
        const stats: MentorStats = {
          totalMentees: currentMentees.length,
          activeSessions: currentSessions.length,
          completedSessions: completedCount,
          pendingRequests: currentRequests.filter(r => r.status === 'pending').length,
          averageRating: 0,
          totalHours: totalHours
        };
        this.statsSubject.next(stats);
      });

    }).catch((error) => {
      console.error('Error loading completed sessions:', error);
      // Use basic stats without completed sessions data
      const stats: MentorStats = {
        totalMentees: currentMentees.length,
        activeSessions: currentSessions.length,
        completedSessions: 0,
        pendingRequests: currentRequests.filter(r => r.status === 'pending').length,
        averageRating: 0,
        totalHours: 0
      };
      this.statsSubject.next(stats);
    });
  }

  private parseDurationToHours(duration: string): number {
    // Parse common duration formats: "1 hour", "30 mins", "1.5 hours", "90 minutes"
    const durationStr = duration.toLowerCase();
    
    if (durationStr.includes('hour')) {
      const match = durationStr.match(/(\d+\.?\d*)\s*hour/);
      return match ? parseFloat(match[1]) : 1;
    }
    
    if (durationStr.includes('min')) {
      const match = durationStr.match(/(\d+)\s*min/);
      return match ? parseFloat(match[1]) / 60 : 0.5;
    }
    
    // Default to 1 hour if can't parse
    return 1;
  }

  private resetDashboard() {
    console.log('Resetting mentor dashboard - no user logged in');
    this.statsSubject.next({
      totalMentees: 0,
      activeSessions: 0,
      completedSessions: 0,
      pendingRequests: 0,
      averageRating: 0,
      totalHours: 0
    });
    this.requestsSubject.next([]);
    this.activeMenteesSubject.next([]);
    this.upcomingSessionsSubject.next([]);
    this.activitiesSubject.next([]);
  }

  // Action methods
  async acceptRequest(requestId: string): Promise<void> {
    console.log('Accepting session request in Firebase:', requestId);
    
    try {
      // Update session status in Firebase (same as SessionService)
      const sessionRef = doc(this.firestore, 'sessions', requestId);
      await updateDoc(sessionRef, {
        status: 'accepted',
        updatedAt: Timestamp.now()
      });

      // Add activity log
      const request = this.requestsSubject.value.find(r => r.id === requestId);
      if (request) {
        await addDoc(collection(this.firestore, 'mentor-activities'), {
          mentorId: request.menteeId, // This should be the current user (mentor)
          type: 'session_accepted',
          title: 'Session request accepted',
          description: `Accepted session request from ${request.menteeName}`,
          timestamp: Timestamp.now(),
          relatedUser: request.menteeName,
          avatar: request.menteeAvatar,
          menteeId: request.menteeId
        });
      }

      // Update stats
      this.authService.getCurrentUser().subscribe(user => {
        if (user?.id) {
          this.calculateStats(user.id);
        }
      });

      console.log('Session request accepted successfully in Firebase');
    } catch (error) {
      console.error('Error accepting session request in Firebase:', error);
      throw error;
    }
  }

  async declineRequest(requestId: string): Promise<void> {
    console.log('Declining session request in Firebase:', requestId);
    
    try {
      // Update session status in Firebase (same as SessionService)
      const sessionRef = doc(this.firestore, 'sessions', requestId);
      await updateDoc(sessionRef, {
        status: 'rejected',
        updatedAt: Timestamp.now()
      });

      // Add activity log
      const request = this.requestsSubject.value.find(r => r.id === requestId);
      if (request) {
        await addDoc(collection(this.firestore, 'mentor-activities'), {
          mentorId: request.menteeId, // This should be the current user (mentor)
          type: 'session_declined',
          title: 'Session request declined',
          description: `Declined session request from ${request.menteeName}`,
          timestamp: Timestamp.now(),
          relatedUser: request.menteeName,
          avatar: request.menteeAvatar,
          menteeId: request.menteeId
        });
      }

      // Update stats
      this.authService.getCurrentUser().subscribe(user => {
        if (user?.id) {
          this.calculateStats(user.id);
        }
      });

      console.log('Session request declined successfully in Firebase');
    } catch (error) {
      console.error('Error declining session request in Firebase:', error);
      throw error;
    }
  }

  // Getter methods
  getCurrentStats(): MentorStats {
    return this.statsSubject.value;
  }

  getCurrentRequests(): MenteeRequest[] {
    return this.requestsSubject.value;
  }

  getPendingRequests(): MenteeRequest[] {
    return this.requestsSubject.value.filter(r => r.status === 'pending');
  }

  getCurrentMentees(): ActiveMentee[] {
    return this.activeMenteesSubject.value;
  }

  getUpcomingSessions(): MentorUpcomingSession[] {
    return this.upcomingSessionsSubject.value;
  }

  getRecentActivities(): MentorActivity[] {
    return this.activitiesSubject.value;
  }
}