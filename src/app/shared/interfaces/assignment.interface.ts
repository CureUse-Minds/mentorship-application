export interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'task' | 'reading' | 'project' | 'exercise' | 'quiz';
  priority: 'low' | 'medium' | 'high';
  status: 'assigned' | 'in-progress' | 'submitted' | 'completed' | 'overdue';
  dueDate: Date;
  assignedDate: Date;
  completedDate?: Date;
  submittedDate?: Date;
  mentorId: string;
  mentorName: string;
  menteeId: string;
  
  // Database metadata
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  
  // Assignment details
  instructions?: string;
  resources?: AssignmentResource[];
  estimatedTime?: number; // in minutes
  
  // Submission details
  submission?: AssignmentSubmission;
  feedback?: AssignmentFeedback;
  
  // Progress tracking
  progress: number; // 0-100
  tags?: string[];
}

export interface AssignmentResource {
  id: string;
  type: 'link' | 'file' | 'video' | 'document';
  title: string;
  url: string;
  description?: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  menteeId: string;
  content: string;
  attachments?: AssignmentAttachment[];
  submittedAt: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AssignmentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface AssignmentFeedback {
  id: string;
  assignmentId: string;
  mentorId: string;
  menteeId: string;
  rating?: number; // 1-5 stars
  comments: string;
  feedbackDate: Date;
  suggestions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AssignmentStats {
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  overdueAssignments: number;
  averageCompletionTime: number;
  completionRate: number;
}

// DTOs for creating/updating assignments
export interface CreateAssignmentDto {
  title: string;
  description: string;
  type: 'task' | 'reading' | 'project' | 'exercise' | 'quiz';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  menteeId: string;
  instructions?: string;
  resources?: Omit<AssignmentResource, 'id'>[];
  estimatedTime?: number;
  tags?: string[];
}

export interface UpdateAssignmentDto extends Partial<CreateAssignmentDto> {
  id: string;
  status?: 'assigned' | 'in-progress' | 'submitted' | 'completed' | 'overdue';
  progress?: number;
}

export interface CreateSubmissionDto {
  assignmentId: string;
  content: string;
  notes?: string;
  attachments?: Omit<AssignmentAttachment, 'id'>[];
}

export interface CreateFeedbackDto {
  assignmentId: string;
  menteeId: string;
  rating?: number;
  comments: string;
  suggestions?: string[];
}