import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AssignmentsService } from '../../shared/services';
import { Assignment, AssignmentStats } from '../../shared/interfaces/assignment.interface';

@Component({
  selector: 'app-sessions',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.css'
})
export class SessionsComponent implements OnInit, OnDestroy {
  private assignmentsService: AssignmentsService = inject(AssignmentsService);
  private fb: FormBuilder = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  assignments = signal<Assignment[]>([]);
  filteredAssignments = signal<Assignment[]>([]);
  stats = signal<AssignmentStats>({
    totalAssignments: 0,
    completedAssignments: 0,
    pendingAssignments: 0,
    overdueAssignments: 0,
    averageCompletionTime: 0,
    completionRate: 0
  });
  
  isLoading = signal(false);
  selectedAssignment = signal<Assignment | null>(null);
  showSubmissionModal = signal(false);
  showDetailModal = signal(false);
  
  // Form and UI state
  submissionForm!: FormGroup;
  activeTab = signal<'all' | 'pending' | 'submitted' | 'completed' | 'overdue'>('all');
  searchTerm = signal('');

  ngOnInit() {
    this.initializeForm();
    this.initializeRealTimeData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    this.submissionForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(10)]],
      notes: ['']
    });
  }

  private initializeRealTimeData() {
    this.isLoading.set(true);
    
    // Subscribe to assignments stream
    this.assignmentsService.getAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assignments: Assignment[]) => {
          // Sort by due date and priority
          const sortedAssignments = assignments.sort((a: Assignment, b: Assignment) => {
            // First sort by status (overdue, pending, in-progress, submitted, completed)
            const statusOrder: Record<Assignment['status'], number> = { 
              'overdue': 0, 
              'assigned': 1, 
              'in-progress': 2, 
              'submitted': 3, 
              'completed': 4 
            };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
              return statusOrder[a.status] - statusOrder[b.status];
            }
            // Then by due date
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          });
          
          this.assignments.set(sortedAssignments);
          this.filterAssignments();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Failed to load assignments:', error);
          this.isLoading.set(false);
        }
      });

    // Subscribe to stats stream
    this.assignmentsService.getAssignmentStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats: AssignmentStats) => {
          this.stats.set(stats);
        },
        error: (error: any) => {
          console.error('Failed to load stats:', error);
        }
      });
  }

  // Tab and filtering methods
  setActiveTab(tab: 'all' | 'pending' | 'submitted' | 'completed' | 'overdue') {
    this.activeTab.set(tab);
    this.filterAssignments();
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.filterAssignments();
  }

  filterAssignments() {
    const allAssignments = this.assignments();
    const tab = this.activeTab();
    const search = this.searchTerm().toLowerCase();
    
    let filtered = allAssignments;
    
    // Filter by status
    switch (tab) {
      case 'pending':
        filtered = filtered.filter(a => a.status === 'assigned' || a.status === 'in-progress');
        break;
      case 'submitted':
        filtered = filtered.filter(a => a.status === 'submitted');
        break;
      case 'completed':
        filtered = filtered.filter(a => a.status === 'completed');
        break;
      case 'overdue':
        filtered = filtered.filter(a => a.status === 'overdue');
        break;
      default:
        // 'all' - no filtering
        break;
    }
    
    // Filter by search term
    if (search) {
      filtered = filtered.filter(assignment => 
        assignment.title.toLowerCase().includes(search) ||
        assignment.description.toLowerCase().includes(search) ||
        assignment.mentorName.toLowerCase().includes(search) ||
        assignment.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    this.filteredAssignments.set(filtered);
  }

  // Assignment actions
  openDetailModal(assignment: Assignment) {
    this.selectedAssignment.set(assignment);
    this.showDetailModal.set(true);
  }

  openSubmissionModal(assignment: Assignment) {
    this.selectedAssignment.set(assignment);
    this.submissionForm.reset();
    this.showSubmissionModal.set(true);
  }

  closeModals() {
    this.showDetailModal.set(false);
    this.showSubmissionModal.set(false);
    this.selectedAssignment.set(null);
  }

  submitAssignment() {
    if (this.submissionForm.valid && this.selectedAssignment()) {
      const formData = this.submissionForm.value;
      const assignmentId = this.selectedAssignment()!.id;
      
      this.isLoading.set(true);
      this.assignmentsService.submitAssignment({
        assignmentId: assignmentId,
        content: formData.content,
        notes: formData.notes || ''
      }).subscribe({
        next: () => {
          this.closeModals();
          this.isLoading.set(false);
          // The real-time listener will automatically update the assignments
        },
        error: (error: any) => {
          console.error('Failed to submit assignment:', error);
          this.isLoading.set(false);
          // TODO: Add proper error handling/notification
        }
      });
    }
  }

  updateProgress(assignment: Assignment, progress: number) {
    this.assignmentsService.updateAssignmentProgress(assignment.id, progress).subscribe({
      next: () => {
        // The real-time listener will automatically update the assignments
      },
      error: (error: any) => {
        console.error('Failed to update progress:', error);
        // TODO: Add proper error handling/notification
      }
    });
  }

  markComplete(assignment: Assignment) {
    this.assignmentsService.markAssignmentComplete(assignment.id).subscribe({
      next: () => {
        // The real-time listener will automatically update the assignments
      },
      error: (error: any) => {
        console.error('Failed to mark assignment complete:', error);
        // TODO: Add proper error handling/notification
      }
    });
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'submitted': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'project': return 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';
      case 'reading': return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
      case 'exercise': return 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z';
      case 'task': return 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4';
      case 'quiz': return 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default: return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysRemaining(dueDate: Date): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatEstimatedTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }

  // Make Math available in template
  Math = Math;
}