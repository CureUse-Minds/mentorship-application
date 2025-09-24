export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: 'mentor' | 'mentee';
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'mentor' | 'mentee' | 'admin';
  };
}