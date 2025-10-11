export type SessionStatus = 'accepted' | 'rejected' | 'pending';

export interface Session {
  id: string;
  mentorId: string;
  menteeId: string;
  mentorName: string;
  menteeName: string;
  scheduledDate?: Date;
  message: string;
  status: SessionStatus;
  startTime?: string;
  endTime?: string;
  duration?: number; //in minutes
  topic?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
