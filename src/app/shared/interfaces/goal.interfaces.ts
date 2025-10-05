export type GoalStatus = 'not-started' | 'in-progress' | 'completed';

export interface Goal {
  id: string;
  menteeId: string;
  title: string;
  description: string;
  status: GoalStatus;
  targetDate?: Date;
  progress: number; // 0-100 scale of measurement
  createdAt: Date;
  updatedAt: Date;
}
