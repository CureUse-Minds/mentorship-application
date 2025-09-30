import { Routes } from '@angular/router';
import { Redirect } from './redirect/redirect';
import { Dashboard } from './dashboard.component';

// ADD: routes for components specific to each user, eventually (i.e. mentee: goals/timeline, my mentors, session stats, mentor: mentee progress and request manager);
export const dashboardRoutes: Routes = [
  {
    path: '',
    component: Redirect,
  },
  {
    path: 'redirect',
    loadComponent: () => import('./redirect/redirect').then((c) => c.Redirect),
  },
  {
    path: 'mentee',
    component: Dashboard,
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./components/profile/profile').then((c) => c.Profile),
      },
      {
        path: 'calendar',
        loadComponent: () => import('./components/calendar/calendar').then((c) => c.Calendar),
      },
      {
        path: 'messages',
        loadComponent: () => import('./components/messages/messages').then((c) => c.Messages),
      },
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'mentor',
    component: Dashboard,
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./components/profile/profile').then((c) => c.Profile),
      },
      {
        path: 'calendar',
        loadComponent: () => import('./components/calendar/calendar').then((c) => c.Calendar),
      },
      {
        path: 'messages',
        loadComponent: () => import('./components/messages/messages').then((c) => c.Messages),
      },
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full',
      },
    ],
  },
];
