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
    path: 'mentor/:id',
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
        path: 'profile',
        loadComponent: () =>
          import('./pages/mentor/mentor-profile/mentor-profile.component').then(
            (c) => c.MentorProfile
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'mentee/:id',
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
        path: 'profile',
        loadComponent: () =>
          import('./pages/mentee/mentee-profile/mentee-profile.component').then(
            (c) => c.MenteeProfile
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
