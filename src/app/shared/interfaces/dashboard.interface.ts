export interface MentorDashboardStats {
  totalMentees: number;
  activeMentees: number;
  upcompingSessions: number;
  completedSessions: number;
  averageRating: number;
}

export interface MenteeDashboardStats {
  currentMentor?: string;
  upcomingSessions: number;
  completedSessions: number;
  learningHours: number;
  goalsCompleted: number;
  goalsInProgress: number;
}
