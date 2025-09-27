import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class Header {
  private auth = inject(AuthService);
  user = this.auth.getCurrentUser;

  isLoggedIn = computed(() => !this.user());

  logout() {
    this.auth.logout();
  }
}
