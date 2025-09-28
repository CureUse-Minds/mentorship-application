import { Routes } from '@angular/router';
import { LoginComponent } from './core/services/login/login.component';
import { RegisterComponent } from './core/services/register/register.component';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [GuestGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [GuestGuard],
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/homepage/homepage.component').then((c) => c.Homepage),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./core/components/email-verification/email-verification.component').then(
        (c) => c.EmailVerificationComponent
      ),
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.routes').then((c) => c.dashboardRoutes),
    canActivate: [AuthGuard],
  },
  { path: '**', redirectTo: '' },
];
