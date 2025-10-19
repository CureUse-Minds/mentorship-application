import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GoalsService, Goal, Milestone } from '../../shared/services/goals.service';

@Component({
  selector: 'app-goals',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.css'
})
export class GoalsComponent implements OnInit, OnDestroy {
  private goalsService = inject(GoalsService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  goals = signal<Goal[]>([]);
  filteredGoals = signal<Goal[]>([]);
  isLoading = signal(false);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  selectedGoal = signal<Goal | null>(null);
  
  // Computed properties for goal counts
  activeGoalsCount = signal(0);
  completedGoalsCount = signal(0);
  pausedGoalsCount = signal(0);
  
  // Form and UI state
  goalForm!: FormGroup;
  activeTab = signal<'all' | 'active' | 'completed' | 'paused'>('all');
  searchTerm = signal('');

  ngOnInit() {
    this.initializeForm();
    this.loadGoals();
    this.setupSearch();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    this.goalForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      priority: ['medium', Validators.required],
      targetDate: ['', Validators.required],
      skills: this.fb.array([]),
      milestones: this.fb.array([])
    });
  }

  private loadGoals() {
    this.isLoading.set(true);
    this.goalsService.getGoals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (goals) => {
          this.goals.set(goals);
          this.updateGoalCounts(goals);
          this.filterGoals();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load goals:', error);
          this.isLoading.set(false);
        }
      });
  }

  private setupSearch() {
    // Search functionality - filter goals based on search term
    this.filterGoals();
  }

  private updateGoalCounts(goals: Goal[]) {
    this.activeGoalsCount.set(goals.filter(g => g.status === 'active').length);
    this.completedGoalsCount.set(goals.filter(g => g.status === 'completed').length);
    this.pausedGoalsCount.set(goals.filter(g => g.status === 'paused').length);
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.filterGoals();
  }

  // Tab and filtering methods
  setActiveTab(tab: 'all' | 'active' | 'completed' | 'paused') {
    this.activeTab.set(tab);
    this.filterGoals();
  }

  filterGoals() {
    const allGoals = this.goals();
    const tab = this.activeTab();
    const search = this.searchTerm().toLowerCase();
    
    let filtered = allGoals;
    
    // Filter by status
    if (tab !== 'all') {
      filtered = filtered.filter(goal => goal.status === tab);
    }
    
    // Filter by search term
    if (search) {
      filtered = filtered.filter(goal => 
        goal.title.toLowerCase().includes(search) ||
        goal.description.toLowerCase().includes(search) ||
        goal.skills.some(skill => skill.toLowerCase().includes(search))
      );
    }
    
    this.filteredGoals.set(filtered);
  }

  // Goal management methods
  openCreateModal() {
    this.goalForm.reset();
    this.clearFormArrays();
    this.selectedGoal.set(null);
    this.showCreateModal.set(true);
  }

  openEditModal(goal: Goal) {
    this.selectedGoal.set(goal);
    this.populateForm(goal);
    this.showEditModal.set(true);
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showDeleteModal.set(false);
    this.selectedGoal.set(null);
  }

  openDeleteModal(goal: Goal) {
    this.selectedGoal.set(goal);
    this.showDeleteModal.set(true);
  }

  private populateForm(goal: Goal) {
    this.goalForm.patchValue({
      title: goal.title,
      description: goal.description,
      priority: goal.priority,
      targetDate: goal.targetDate.toISOString().split('T')[0]
    });

    // Populate skills
    const skillsArray = this.goalForm.get('skills') as FormArray;
    skillsArray.clear();
    goal.skills.forEach(skill => {
      skillsArray.push(this.fb.control(skill));
    });

    // Populate milestones
    const milestonesArray = this.goalForm.get('milestones') as FormArray;
    milestonesArray.clear();
    goal.milestones.forEach(milestone => {
      milestonesArray.push(this.fb.group({
        title: [milestone.title, Validators.required],
        description: [milestone.description || ''],
        targetDate: [milestone.targetDate ? milestone.targetDate.toISOString().split('T')[0] : '']
      }));
    });
  }

  private clearFormArrays() {
    (this.goalForm.get('skills') as FormArray).clear();
    (this.goalForm.get('milestones') as FormArray).clear();
  }

  // Form array methods
  get skills() {
    return this.goalForm.get('skills') as FormArray;
  }

  get milestones() {
    return this.goalForm.get('milestones') as FormArray;
  }

  addSkill() {
    if (this.skills.length < 10) { // Limit to 10 skills max
      this.skills.push(this.fb.control('', [Validators.required, Validators.minLength(2)]));
    }
  }

  removeSkill(index: number) {
    this.skills.removeAt(index);
  }

  addMilestone() {
    this.milestones.push(this.fb.group({
      title: ['', Validators.required],
      description: [''],
      targetDate: ['']
    }));
  }

  removeMilestone(index: number) {
    this.milestones.removeAt(index);
  }

  // Goal actions
  onSubmit() {
    if (this.goalForm.valid) {
      const formData = this.goalForm.value;
      
      const goalData = {
        ...formData,
        userId: 'user_1', // This would come from auth service
        targetDate: new Date(formData.targetDate),
        status: 'active' as const,
        progress: 0,
        skills: formData.skills.filter((skill: string) => skill.trim()),
        milestones: formData.milestones.map((m: any, index: number) => ({
          id: `milestone_${Date.now()}_${index}`,
          title: m.title,
          description: m.description || '',
          completed: false,
          targetDate: m.targetDate ? new Date(m.targetDate) : undefined
        }))
      };

      if (this.showEditModal()) {
        // Update existing goal
        const goalId = this.selectedGoal()?.id;
        if (goalId) {
          this.goalsService.updateGoal(goalId, goalData).subscribe({
            next: () => {
              this.loadGoals();
              this.closeModals();
            },
            error: (error) => {
              console.error('Failed to update goal:', error);
            }
          });
        }
      } else {
        // Create new goal
        this.goalsService.addGoal(goalData).subscribe({
          next: () => {
            this.loadGoals();
            this.closeModals();
          },
          error: (error) => {
            console.error('Failed to create goal:', error);
          }
        });
      }
    }
  }

  deleteGoal() {
    const goal = this.selectedGoal();
    if (!goal) return;

    this.goalsService.deleteGoal(goal.id).subscribe({
      next: () => {
        this.loadGoals();
        this.closeModals();
      },
      error: (error) => {
        console.error('Failed to delete goal:', error);
      }
    });
  }

  updateProgress(goal: Goal, newProgress: number) {
    this.goalsService.updateGoalProgress(goal.id, newProgress).subscribe({
      next: () => {
        this.loadGoals();
      },
      error: (error) => {
        console.error('Failed to update progress:', error);
      }
    });
  }

  toggleMilestone(goal: Goal, milestone: Milestone) {
    this.goalsService.toggleMilestone(goal.id, milestone.id).subscribe({
      next: () => {
        this.loadGoals();
      },
      error: (error) => {
        console.error('Failed to toggle milestone:', error);
      }
    });
  }

  completeMilestone(goal: Goal, milestone: Milestone) {
    this.goalsService.completeMilestone(goal.id, milestone.id).subscribe({
      next: () => {
        this.loadGoals();
      },
      error: (error) => {
        console.error('Failed to complete milestone:', error);
      }
    });
  }

  addMilestoneToGoal(goal: Goal, milestoneData: { title: string; description?: string; targetDate?: Date }) {
    this.goalsService.addMilestone(goal.id, {
      title: milestoneData.title,
      description: milestoneData.description || '',
      completed: false,
      targetDate: milestoneData.targetDate
    }).subscribe({
      next: () => {
        this.loadGoals();
      },
      error: (error) => {
        console.error('Failed to add milestone:', error);
      }
    });
  }

  deleteMilestone(goal: Goal, milestone: Milestone) {
    if (confirm(`Are you sure you want to delete milestone "${milestone.title}"?`)) {
      this.goalsService.deleteMilestone(goal.id, milestone.id).subscribe({
        next: () => {
          this.loadGoals();
        },
        error: (error) => {
          console.error('Failed to delete milestone:', error);
        }
      });
    }
  }

  pauseGoal(goal: Goal) {
    this.goalsService.updateGoal(goal.id, { status: 'paused' }).subscribe({
      next: () => {
        this.loadGoals();
      },
      error: (error) => {
        console.error('Failed to pause goal:', error);
      }
    });
  }

  resumeGoal(goal: Goal) {
    this.goalsService.updateGoal(goal.id, { status: 'active' }).subscribe({
      next: () => {
        this.loadGoals();
      },
      error: (error) => {
        console.error('Failed to resume goal:', error);
      }
    });
  }

  markGoalComplete(goal: Goal) {
    this.goalsService.updateGoal(goal.id, { status: 'completed', progress: 100 }).subscribe({
      next: () => {
        this.loadGoals();
      },
      error: (error) => {
        console.error('Failed to mark goal as complete:', error);
      }
    });
  }

  // Utility methods
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  canSubmitForm(): boolean {
    if (!this.goalForm) return false;
    
    const formValue = this.goalForm.value;
    const isValid = this.goalForm.valid;
    
    // Debug logging
    console.log('Form Value:', formValue);
    console.log('Form Valid:', isValid);
    console.log('Form Errors:', this.getFormErrors());
    
    return isValid;
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.goalForm.controls).forEach(key => {
      const control = this.goalForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
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

  getDaysRemaining(targetDate: Date): number {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Make Math available in template
  Math = Math;
}