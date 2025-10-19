import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, from, switchMap, throwError, of, take } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch
} from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';
import { 
  Assignment, 
  AssignmentStats, 
  AssignmentSubmission, 
  AssignmentFeedback,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  CreateSubmissionDto,
  CreateFeedbackDto
} from '../interfaces/assignment.interface';

@Injectable({
  providedIn: 'root'
})
export class AssignmentsService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
  // Collections
  private assignmentsCollection = collection(this.firestore, 'assignments');
  private submissionsCollection = collection(this.firestore, 'submissions');
  private feedbackCollection = collection(this.firestore, 'feedback');
  
  // Real-time data streams
  private assignmentsSubject = new BehaviorSubject<Assignment[]>([]);
  public assignments$ = this.assignmentsSubject.asObservable();

  constructor() {
    // Initialize real-time listeners when user is authenticated
    this.authService.user$.subscribe(user => {
      if (user) {
        this.initializeRealTimeListeners(user.id, user.role);
      } else {
        this.assignmentsSubject.next([]);
      }
    });
  }

  /**
   * Initialize real-time listeners for assignments based on user role
   */
  private initializeRealTimeListeners(userId: string, userRole: string): void {
    let assignmentsQuery;
    
    if (userRole === 'mentee') {
      // Mentees see assignments assigned to them
      assignmentsQuery = query(
        this.assignmentsCollection,
        where('menteeId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'mentor') {
      // Mentors see assignments they created
      assignmentsQuery = query(
        this.assignmentsCollection,
        where('mentorId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Default fallback
      assignmentsQuery = query(
        this.assignmentsCollection,
        orderBy('createdAt', 'desc'),
        limit(0)
      );
    }

    // Listen to real-time updates
    onSnapshot(assignmentsQuery, (snapshot) => {
      const assignments: Assignment[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const assignment: Assignment = {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamps to Dates
          dueDate: data['dueDate']?.toDate() || new Date(),
          assignedDate: data['assignedDate']?.toDate() || new Date(),
          completedDate: data['completedDate']?.toDate(),
          submittedDate: data['submittedDate']?.toDate(),
          createdAt: data['createdAt']?.toDate(),
          updatedAt: data['updatedAt']?.toDate()
        } as Assignment;
        
        assignments.push(assignment);
      });
      
      // Load submissions and feedback for each assignment
      this.loadAssignmentDetails(assignments).then(enrichedAssignments => {
        this.assignmentsSubject.next(enrichedAssignments);
      });
    });
  }

  /**
   * Load submissions and feedback for assignments
   */
  private async loadAssignmentDetails(assignments: Assignment[]): Promise<Assignment[]> {
    const enrichedAssignments: Assignment[] = [];
    
    for (const assignment of assignments) {
      // Load submission if exists
      const submissionQuery = query(
        this.submissionsCollection,
        where('assignmentId', '==', assignment.id),
        limit(1)
      );
      
      const submissionSnapshot = await getDocs(submissionQuery);
      let submission: AssignmentSubmission | undefined;
      
      if (!submissionSnapshot.empty) {
        const submissionDoc = submissionSnapshot.docs[0];
        const submissionData = submissionDoc.data();
        submission = {
          id: submissionDoc.id,
          ...submissionData,
          submittedAt: submissionData['submittedAt']?.toDate() || new Date(),
          createdAt: submissionData['createdAt']?.toDate(),
          updatedAt: submissionData['updatedAt']?.toDate()
        } as AssignmentSubmission;
      }
      
      // Load feedback if exists
      const feedbackQuery = query(
        this.feedbackCollection,
        where('assignmentId', '==', assignment.id),
        limit(1)
      );
      
      const feedbackSnapshot = await getDocs(feedbackQuery);
      let feedback: AssignmentFeedback | undefined;
      
      if (!feedbackSnapshot.empty) {
        const feedbackDoc = feedbackSnapshot.docs[0];
        const feedbackData = feedbackDoc.data();
        feedback = {
          id: feedbackDoc.id,
          ...feedbackData,
          feedbackDate: feedbackData['feedbackDate']?.toDate() || new Date(),
          createdAt: feedbackData['createdAt']?.toDate(),
          updatedAt: feedbackData['updatedAt']?.toDate()
        } as AssignmentFeedback;
      }
      
      enrichedAssignments.push({
        ...assignment,
        submission,
        feedback
      });
    }
    
    return enrichedAssignments;
  }

  /**
   * Get all assignments for the current user
   */
  getAssignments(): Observable<Assignment[]> {
    return this.assignments$;
  }

  /**
   * Get assignments filtered by status
   */
  getAssignmentsByStatus(status: Assignment['status']): Observable<Assignment[]> {
    return this.assignments$.pipe(
      map(assignments => assignments.filter(assignment => assignment.status === status))
    );
  }

  /**
   * Get assignment by ID
   */
  getAssignmentById(id: string): Observable<Assignment | undefined> {
    return this.assignments$.pipe(
      map(assignments => assignments.find(assignment => assignment.id === id))
    );
  }

  /**
   * Get assignment statistics
   */
  getAssignmentStats(): Observable<AssignmentStats> {
    return this.assignments$.pipe(
      map(assignments => {
        const totalAssignments = assignments.length;
        const completedAssignments = assignments.filter(a => a.status === 'completed').length;
        const pendingAssignments = assignments.filter(a => a.status === 'assigned' || a.status === 'in-progress').length;
        const overdueAssignments = assignments.filter(a => a.status === 'overdue' || 
          (a.status !== 'completed' && new Date() > a.dueDate)).length;
        
        const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
        
        // Calculate average completion time (placeholder calculation)
        const averageCompletionTime = completedAssignments > 0 ? 
          assignments
            .filter(a => a.status === 'completed' && a.completedDate)
            .reduce((acc, a) => {
              const timeDiff = a.completedDate!.getTime() - a.assignedDate.getTime();
              return acc + timeDiff;
            }, 0) / completedAssignments / (1000 * 60 * 60 * 24) : 0; // in days
        
        return {
          totalAssignments,
          completedAssignments,
          pendingAssignments,
          overdueAssignments,
          averageCompletionTime,
          completionRate
        };
      })
    );
  }

  /**
   * Create a new assignment (mentor only)
   */
  createAssignment(assignmentData: CreateAssignmentDto): Observable<Assignment> {
    return this.authService.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user || user.role !== 'mentor') {
          return throwError(() => new Error('Only mentors can create assignments'));
        }

        const newAssignment = {
          ...assignmentData,
          mentorId: user.id,
          mentorName: `${user.firstName} ${user.lastName}`,
          status: 'assigned' as const,
          progress: 0,
          assignedDate: Timestamp.now(),
          dueDate: Timestamp.fromDate(assignmentData.dueDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.id
        };

        return from(addDoc(this.assignmentsCollection, newAssignment)).pipe(
          switchMap(docRef => this.getAssignmentById(docRef.id)),
          map(assignment => {
            if (!assignment) {
              throw new Error('Failed to retrieve created assignment');
            }
            return assignment;
          })
        );
      })
    );
  }

  /**
   * Update assignment progress
   */
  updateAssignmentProgress(assignmentId: string, progress: number): Observable<Assignment> {
    const assignmentRef = doc(this.firestore, 'assignments', assignmentId);
    
    const updateData: any = {
      progress: Math.min(100, Math.max(0, progress)),
      updatedAt: serverTimestamp()
    };

    // Update status based on progress
    if (progress === 100) {
      updateData.status = 'completed';
      updateData.completedDate = serverTimestamp();
    } else if (progress > 0) {
      updateData.status = 'in-progress';
    }

    return from(updateDoc(assignmentRef, updateData)).pipe(
      switchMap(() => this.getAssignmentById(assignmentId)),
      map(assignment => {
        if (!assignment) {
          throw new Error('Assignment not found after update');
        }
        return assignment;
      })
    );
  }

  /**
   * Update assignment status
   */
  updateAssignmentStatus(assignmentId: string, status: Assignment['status']): Observable<Assignment> {
    const assignmentRef = doc(this.firestore, 'assignments', assignmentId);
    
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (status === 'completed') {
      updateData.completedDate = serverTimestamp();
      updateData.progress = 100;
    } else if (status === 'submitted') {
      updateData.submittedDate = serverTimestamp();
    }

    return from(updateDoc(assignmentRef, updateData)).pipe(
      switchMap(() => this.getAssignmentById(assignmentId)),
      map(assignment => {
        if (!assignment) {
          throw new Error('Assignment not found after update');
        }
        return assignment;
      })
    );
  }

  /**
   * Submit assignment (mentee only)
   */
  submitAssignment(submissionData: CreateSubmissionDto): Observable<AssignmentSubmission> {
    return this.authService.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user || user.role !== 'mentee') {
          return throwError(() => new Error('Only mentees can submit assignments'));
        }

        const newSubmission = {
          ...submissionData,
          menteeId: user.id,
          submittedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        return from(addDoc(this.submissionsCollection, newSubmission)).pipe(
          switchMap(docRef => {
            // Update assignment status to submitted
            const assignmentRef = doc(this.firestore, 'assignments', submissionData.assignmentId);
            return from(updateDoc(assignmentRef, {
              status: 'submitted',
              submittedDate: serverTimestamp(),
              updatedAt: serverTimestamp()
            })).pipe(
              map(() => ({
                id: docRef.id,
                ...submissionData,
                menteeId: user.id,
                submittedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              } as AssignmentSubmission))
            );
          })
        );
      })
    );
  }

  /**
   * Provide feedback on assignment (mentor only)
   */
  provideFeedback(feedbackData: CreateFeedbackDto): Observable<AssignmentFeedback> {
    return this.authService.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user || user.role !== 'mentor') {
          return throwError(() => new Error('Only mentors can provide feedback'));
        }

        const newFeedback = {
          ...feedbackData,
          mentorId: user.id,
          feedbackDate: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        return from(addDoc(this.feedbackCollection, newFeedback)).pipe(
          switchMap(docRef => {
            // Update assignment status to completed if feedback is provided
            const assignmentRef = doc(this.firestore, 'assignments', feedbackData.assignmentId);
            return from(updateDoc(assignmentRef, {
              status: 'completed',
              completedDate: serverTimestamp(),
              updatedAt: serverTimestamp()
            })).pipe(
              map(() => ({
                id: docRef.id,
                ...feedbackData,
                mentorId: user.id,
                feedbackDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              } as AssignmentFeedback))
            );
          })
        );
      })
    );
  }

  /**
   * Delete assignment (mentor only)
   */
  deleteAssignment(assignmentId: string): Observable<void> {
    return this.authService.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user || user.role !== 'mentor') {
          return throwError(() => new Error('Only mentors can delete assignments'));
        }

        const batch = writeBatch(this.firestore);
        
        // Delete assignment
        const assignmentRef = doc(this.firestore, 'assignments', assignmentId);
        batch.delete(assignmentRef);
        
        // Delete related submissions and feedback
        return from(Promise.all([
          getDocs(query(this.submissionsCollection, where('assignmentId', '==', assignmentId))),
          getDocs(query(this.feedbackCollection, where('assignmentId', '==', assignmentId)))
        ])).pipe(
          switchMap(([submissionsSnapshot, feedbackSnapshot]) => {
            submissionsSnapshot.forEach(doc => batch.delete(doc.ref));
            feedbackSnapshot.forEach(doc => batch.delete(doc.ref));
            
            return from(batch.commit());
          })
        );
      })
    );
  }

  /**
   * Mark assignment as complete
   */
  markAssignmentComplete(assignmentId: string): Observable<Assignment> {
    return this.updateAssignmentStatus(assignmentId, 'completed');
  }

  /**
   * Check for overdue assignments and update their status
   */
  updateOverdueAssignments(): Observable<void> {
    const now = new Date();
    
    return this.assignments$.pipe(
      switchMap(assignments => {
        const overdueAssignments = assignments.filter(assignment => 
          assignment.status !== 'completed' && 
          assignment.status !== 'overdue' && 
          assignment.dueDate < now
        );

        if (overdueAssignments.length === 0) {
          return of(void 0);
        }

        const batch = writeBatch(this.firestore);
        
        overdueAssignments.forEach(assignment => {
          const assignmentRef = doc(this.firestore, 'assignments', assignment.id);
          batch.update(assignmentRef, {
            status: 'overdue',
            updatedAt: serverTimestamp()
          });
        });

        return from(batch.commit());
      })
    );
  }

  /**
   * Search assignments by title or description
   */
  searchAssignments(searchTerm: string): Observable<Assignment[]> {
    return this.assignments$.pipe(
      map(assignments => {
        if (!searchTerm.trim()) {
          return assignments;
        }
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return assignments.filter(assignment => 
          assignment.title.toLowerCase().includes(lowerSearchTerm) ||
          assignment.description.toLowerCase().includes(lowerSearchTerm) ||
          assignment.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
        );
      })
    );
  }
}