import { Session } from './session.interface';
import { Availability } from './availability.interface';

export interface BaseProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  skills: string[];
  preferredLanguages: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorProfile extends BaseProfile {
  role: 'mentor';
  expertise: string[];
  availability: Availability[];
  rating?: number;
  totalMentees?: number;
  activeMentees?: number;
  menteeLimit?: number;
  yearsOfExperience?: number;
}

export interface MenteeProfile extends BaseProfile {
  role: 'mentee';
  interests: string[];
  currentMentor?: string; //mentor userId
  goalsAndObjectives?: string;
  completedSessions?: number;
  mentorshipRequests?: Session[];
}

export type UserProfile = MentorProfile | MenteeProfile;
