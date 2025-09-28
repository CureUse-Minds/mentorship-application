import { Routes } from '@angular/router';
import { Redirect } from './redirect/redirect';
import { Dashboard } from './dashboard.component';
import { Profile } from './components/profile/profile';
import { Calendar } from './components/calendar/calendar';
import { Messages } from './components/messages/messages';

// ADD: routes for components specific to each user, eventually (i.e. mentee: goals/timeline, my mentors, session stats, mentor: mentee progress and request manager);
export const dashboardRoutes: Routes = [
  {
    path: '',
    component: Redirect,
  },
  {
    path: 'mentee',
    component: Dashboard,
    children: [
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        component: Profile,
      },
      {
        path: 'calendar',
        component: Calendar,
      },
      {
        path: 'messages',
        component: Messages,
      },
    ],
  },
  {
    path: 'mentor',
    component: Dashboard,
    children: [
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        component: Profile,
      },
      {
        path: 'calendar',
        component: Calendar,
      },
      {
        path: 'messages',
        component: Messages,
      },
    ],
  },
];
