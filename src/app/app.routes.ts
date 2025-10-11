import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [GuestGuard],
    loadComponent: () =>
      import('./core/services/login/login.component').then((c) => c.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [GuestGuard],
    loadComponent: () =>
      import('./core/services/register/register.component').then((c) => c.RegisterComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./core/components/email-verification/email-verification.component').then(
        (c) => c.EmailVerificationComponent
      ),
  },
  {
    path: 'calendar',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/calendar/calendar.component').then((c) => c.CalendarComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./shared/components/home/home.component').then((c) => c.HomeComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((c) => c.DashboardComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'mentor',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['mentor'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/mentor/mentor-dashboard/mentor-dashboard.component').then(
            (c) => c.MentorDashboard
          ),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./pages/mentor/requests/requests.component').then((c) => c.Requests),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'mentee',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['mentee'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/mentee/mentee-dashboard/mentee-dashboard.component').then(
            (c) => c.MenteeDashboard
          ),
      },
      {
        path: 'find-mentor',
        loadComponent: () =>
          import('./pages/mentee/find-mentor/find-mentor.component').then((c) => c.FindMentor),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'sessions',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/sessions/sessions.component').then((c) => c.SessionsComponent),
  },
  {
    path: 'goals',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/goals/goals.component').then((c) => c.GoalsComponent),
  },
  {
    path: 'messages',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/messages/messages.component').then((c) => c.MessagesComponent),
  },
  {
    path: 'progress',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/progress/progress.component').then((c) => c.ProgressComponent),
  },
  {
    path: 'resources',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/resources/resources.component').then((c) => c.ResourcesComponent),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/profile/profile.component').then((c) => c.ProfileComponent),
  },
  {
    path: 'settings',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/settings/settings.component').then((c) => c.SettingsComponent),
  },
  { path: '**', redirectTo: '/dashboard' },
];
