export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'mentor' | 'mentee' | 'admin';
  profilePicture?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}