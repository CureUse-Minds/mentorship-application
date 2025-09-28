import { AuthService } from './../../../core/services/auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export class Redirect {
  private router = inject(Router);
  private auth = inject(AuthService);

  constructor() {
    const role = this.auth.getCurrentUser()?.role ?? 'mentee';
    this.router.navigateByUrl(`/dashboard/${role}/profile`);
  }
}
