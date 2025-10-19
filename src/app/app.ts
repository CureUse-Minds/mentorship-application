import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { AuthService } from './core/services/auth.service';
import { filter, map, combineLatest, startWith } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  showSidebar = false;

  // Routes that should show the sidebar (authenticated routes)
  private readonly protectedRoutes = [
    '/dashboard',
    '/calendar',
    '/booking',
    '/sessions',
    '/goals',
    '/messages',
    '/progress',
    '/resources',
    '/profile',
    '/settings',
    '/mentor',
    '/mentee',
  ];

  ngOnInit() {
    // Single subscription combining authentication status and current route
    combineLatest([
      this.authService.isAuthenticated$,
      this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => (event as NavigationEnd).url),
        // Start with current URL
        startWith(this.router.url)
      ),
    ]).subscribe(([isAuthenticated, currentUrl]) => {
      this.showSidebar = isAuthenticated && this.shouldShowSidebar(currentUrl);
    });
  }

  private shouldShowSidebar(url: string): boolean {
    return this.protectedRoutes.some((route) => url.startsWith(route));
  }
}
