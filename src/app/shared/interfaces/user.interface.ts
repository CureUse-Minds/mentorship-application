export type UserRole = 'mentor' | 'mentee';
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profilePicture?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
  emailVerified?: boolean;
}
