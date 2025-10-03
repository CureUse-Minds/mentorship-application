import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';

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
  { path: '**', redirectTo: '' },
];
