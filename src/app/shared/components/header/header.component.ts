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
  // FIX: this. or maybe we need to add logout component then direct it ther when clicked.
  logout() {
    this.auth.logout();
  }
}
