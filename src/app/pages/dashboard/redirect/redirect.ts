import { AuthService } from './../../../core/services/auth.service';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-redirect',
  imports: [],
  templateUrl: './redirect.component.html',
})
export class Redirect implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    console.log('REDIRECT: Checking user role...');
    const user = this.auth.getCurrentUser();

    if (user) {
      const role = user.role || 'mentee';
      console.log('REDIRECT: User role is', role);
      this.router.navigate(['/dashboard', role, 'profile']);
    } else {
      console.log('REDIRECT: No user, going to login');
      this.router.navigate(['/home']);
    }
  }
}
