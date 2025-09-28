export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'mentor' | 'mentee' | 'admin';
  profilePicture?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
  location?: string;
  skills?: string[];
  goals?: string[];
  interest?: string[];
  expertise?: string[];
  availablility?: string[];
  preferredLanguage?: string;
}

export const MOCKUSER: User[] = [
  {
    id: 'SDwi122',
    email: 'mentor@demo.com',
    firstName: 'Olivia',
    lastName: 'Dean',
    role: 'mentee',
    profilePicture:
      'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fi.pinimg.com%2Foriginals%2F95%2F2b%2Ff3%2F952bf3c913b6cc16e23b41f2cbbd72ba.jpg&f=1&nofb=1&ipt=d8ec482f60a800c8b0e89f8b64ba46a638b80f5c8e880ff47d57a1f2679ba263',
    bio: 'Expert in keeping you calm',
    location: 'Gmina Wręczyca Wielka',
    skills: ['HTML', 'CSS', 'JavaScript', 'Git', 'Angular', 'TailwindCSS'],
    goals: ['to become comfortable with coding'],
    interest: ['Gaming', 'Reading Sci-Fi', 'Open Source'],
    availablility: ['Weekends & Monday evening'],
    preferredLanguage: 'English',
  },
];
