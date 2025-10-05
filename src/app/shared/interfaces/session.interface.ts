export type SessionStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface MentorshipSession {
  id: string;
  mentorID: string;
  menteeID: string;
  mentorName: string;
  menteeName: string;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  duration: number; //in minutes
  status: SessionStatus;
  topic?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}
