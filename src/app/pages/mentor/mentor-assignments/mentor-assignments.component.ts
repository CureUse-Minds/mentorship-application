import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AssignmentsService } from '../../../shared/services/assignments.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Assignment, CreateAssignmentDto } from '../../../shared/interfaces/assignment.interface';
import { User } from '../../../shared/interfaces/user.interface';

@Component({
  selector: 'app-mentor-assignments',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Assignment Management</h1>
              <p class="text-gray-600 mt-1">Create and manage assignments for your mentees</p>
            </div>
            <button (click)="showCreateForm = !showCreateForm"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              New Assignment
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Create Assignment Form -->
        @if (showCreateForm) {
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Create New Assignment</h2>
            
            <form [formGroup]="assignmentForm" (ngSubmit)="createAssignment()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Title -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input type="text" formControlName="title"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Assignment title">
                  @if (assignmentForm.get('title')?.invalid && assignmentForm.get('title')?.touched) {
                    <p class="mt-1 text-xs text-red-600">Title is required</p>
                  }
                </div>

                <!-- Description -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea formControlName="description" rows="3"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Describe the assignment..."></textarea>
                  @if (assignmentForm.get('description')?.invalid && assignmentForm.get('description')?.touched) {
                    <p class="mt-1 text-xs text-red-600">Description is required</p>
                  }
                </div>

                <!-- Mentee Selection -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Assign to Mentee *</label>
                  <select formControlName="menteeId"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Select a mentee...</option>
                    @for (mentee of mentees(); track mentee.id) {
                      <option [value]="mentee.id">{{ mentee.firstName }} {{ mentee.lastName }}</option>
                    }
                  </select>
                  @if (assignmentForm.get('menteeId')?.invalid && assignmentForm.get('menteeId')?.touched) {
                    <p class="mt-1 text-xs text-red-600">Please select a mentee</p>
                  }
                </div>

                <!-- Type -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select formControlName="type"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="task">Task</option>
                    <option value="reading">Reading</option>
                    <option value="project">Project</option>
                    <option value="exercise">Exercise</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <!-- Priority -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                  <select formControlName="priority"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <!-- Due Date -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                  <input type="date" formControlName="dueDate"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  @if (assignmentForm.get('dueDate')?.invalid && assignmentForm.get('dueDate')?.touched) {
                    <p class="mt-1 text-xs text-red-600">Due date is required</p>
                  }
                </div>

                <!-- Instructions -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                  <textarea formControlName="instructions" rows="4"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Detailed instructions for the assignment..."></textarea>
                </div>

                <!-- Estimated Time -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Estimated Time (minutes)</label>
                  <input type="number" formControlName="estimatedTime" min="1"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                         placeholder="120">
                </div>

                <!-- Tags -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input type="text" #tagInput (keyup.enter)="addTag(tagInput.value); tagInput.value = ''"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Add tags (press Enter to add)">
                  <div class="flex flex-wrap gap-2 mt-2">
                    @for (tag of selectedTags(); track tag) {
                      <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {{ tag }}
                        <button type="button" (click)="removeTag(tag)" class="ml-1 text-blue-500 hover:text-blue-700">
                          ×
                        </button>
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- Form Actions -->
              <div class="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button type="button" (click)="cancelForm()"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" 
                        [disabled]="assignmentForm.invalid || isCreating()"
                        [class.opacity-50]="assignmentForm.invalid || isCreating()"
                        [class.cursor-not-allowed]="assignmentForm.invalid || isCreating()"
                        class="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors disabled:hover:bg-blue-600">
                  @if (isCreating()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  } @else {
                    Create Assignment
                  }
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Assignments List -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">My Assignments</h3>
          </div>
          
          @if (isLoading()) {
            <div class="flex justify-center items-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span class="ml-3 text-gray-600">Loading assignments...</span>
            </div>
          } @else if (assignments().length === 0) {
            <div class="text-center py-12">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
              <p class="mt-1 text-sm text-gray-500">Get started by creating a new assignment for your mentees.</p>
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (assignment of assignments(); track assignment.id) {
                <div class="p-6 hover:bg-gray-50 transition-colors">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center mb-2">
                        <h4 class="text-lg font-medium text-gray-900">{{ assignment.title }}</h4>
                        <span class="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              [ngClass]="getStatusColor(assignment.status)">
                          {{ assignment.status | titlecase }}
                        </span>
                      </div>
                      <p class="text-sm text-gray-600 mb-2">{{ assignment.description }}</p>
                      <div class="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Assigned to: <span class="font-medium">{{ getMenteeName(assignment.menteeId) }}</span></span>
                        <span>•</span>
                        <span>Due: {{ formatDate(assignment.dueDate) }}</span>
                        <span>•</span>
                        <span>Progress: {{ assignment.progress }}%</span>
                      </div>
                    </div>
                    <div class="flex space-x-2 ml-4">
                      <button class="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200"
                              title="View Details">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                      <button (click)="deleteAssignment(assignment.id)"
                              class="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                              title="Delete Assignment">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class MentorAssignmentsComponent implements OnInit, OnDestroy {
  private assignmentsService: AssignmentsService = inject(AssignmentsService);
  private authService: AuthService = inject(AuthService);
  private userService: UserService = inject(UserService);
  private fb: FormBuilder = inject(FormBuilder);
  private router: Router = inject(Router);
  private destroy$ = new Subject<void>();

  assignments = signal<Assignment[]>([]);
  mentees = signal<User[]>([]);
  selectedTags = signal<string[]>([]);
  
  isLoading = signal(false);
  isCreating = signal(false);
  showCreateForm = false;
  
  assignmentForm!: FormGroup;

  ngOnInit() {
    this.initializeForm();
    this.loadMentees();
    this.loadAssignments();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    this.assignmentForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      menteeId: ['', [Validators.required]],
      type: ['task', [Validators.required]],
      priority: ['medium', [Validators.required]],
      dueDate: ['', [Validators.required]],
      instructions: [''],
      estimatedTime: [60, [Validators.min(1)]]
    });
  }

  private loadMentees() {
    // This would typically load mentees associated with this mentor
    // For now, we'll use a placeholder implementation
    this.userService.getUsersByRole('mentee')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: User[]) => {
          this.mentees.set(users);
        },
        error: (error: any) => {
          console.error('Failed to load mentees:', error);
        }
      });
  }

  private loadAssignments() {
    this.isLoading.set(true);
    this.assignmentsService.getAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assignments: Assignment[]) => {
          this.assignments.set(assignments);
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Failed to load assignments:', error);
          this.isLoading.set(false);
        }
      });
  }

  createAssignment() {
    if (this.assignmentForm.valid) {
      this.isCreating.set(true);
      
      const formData = this.assignmentForm.value;
      const assignmentData: CreateAssignmentDto = {
        ...formData,
        dueDate: new Date(formData.dueDate),
        tags: this.selectedTags()
      };

      this.assignmentsService.createAssignment(assignmentData).subscribe({
        next: (assignment: Assignment) => {
          console.log('Assignment created successfully:', assignment);
          this.cancelForm();
          this.isCreating.set(false);
        },
        error: (error: any) => {
          console.error('Failed to create assignment:', error);
          this.isCreating.set(false);
        }
      });
    }
  }

  cancelForm() {
    this.showCreateForm = false;
    this.assignmentForm.reset();
    this.assignmentForm.patchValue({
      type: 'task',
      priority: 'medium',
      estimatedTime: 60
    });
    this.selectedTags.set([]);
  }

  addTag(tag: string) {
    if (tag.trim() && !this.selectedTags().includes(tag.trim())) {
      this.selectedTags.update(tags => [...tags, tag.trim()]);
    }
  }

  removeTag(tagToRemove: string) {
    this.selectedTags.update(tags => tags.filter(tag => tag !== tagToRemove));
  }

  deleteAssignment(assignmentId: string) {
    if (confirm('Are you sure you want to delete this assignment?')) {
      this.assignmentsService.deleteAssignment(assignmentId).subscribe({
        next: () => {
          console.log('Assignment deleted successfully');
        },
        error: (error: any) => {
          console.error('Failed to delete assignment:', error);
        }
      });
    }
  }

  getMenteeName(menteeId: string): string {
    const mentee = this.mentees().find(m => m.id === menteeId);
    return mentee ? `${mentee.firstName} ${mentee.lastName}` : 'Unknown';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}