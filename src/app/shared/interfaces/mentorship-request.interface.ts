export type RequestStatus = 'pending' | 'accepted' | 'rejectd';

export interface MentorshipRequest {
  id: string;
  menteeId: string;
  mentorId: string;
  menteeName: string;
  mentorName: string;
  message: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}
