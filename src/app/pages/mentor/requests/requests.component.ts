import { Component, inject, signal } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../shared/services';
import { Session } from '../../../shared/interfaces';
import { filter, switchMap, take } from 'rxjs';

@Component({
  selector: 'app-requests',
  imports: [],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css',
})
export class Requests {
  private sessionService = inject(SessionService);
  private authService = inject(AuthService);

  requests = signal<Session[]>([]);
  feedbackMessage = signal('');
  feedbackType = signal<'success' | 'error' | ''>('');

  constructor() {
    this.authService
      .getCurrentUser()
      .pipe(
        filter((user): user is NonNullable<typeof user> => !!user),
        // Fetches pending requests for the logged-in mentor from Firestore
        switchMap((user) => this.sessionService.getRequestForMentor(user.id))
      )
      .subscribe((requests) => {
        this.requests.set(requests);
      });
  }

  accept(requestId: string) {
    // Updates a request document's status to 'accepted' in Firestore
    this.sessionService.acceptRequest(requestId).subscribe({
      next: () => {
        this.requests.update((reqs) => reqs.filter((r) => r.id !== requestId));
        this.feedbackMessage.set('Request accepted successfully!');
        this.feedbackType.set('success');
      },
      error: (error) => {
        this.feedbackMessage.set(error || 'Failed to accept request.');
        this.feedbackType.set('error');
      },
    });
  }

  reject(requestId: string) {
    // Updates a request document's status to 'rejected' in Firestore
    this.sessionService.rejectRequest(requestId).subscribe({
      next: () => {
        this.requests.update((reqs) => reqs.filter((r) => r.id !== requestId));
        this.feedbackMessage.set('Request rejected.');
        this.feedbackType.set('success');
      },
      error: (error) => {
        this.feedbackMessage.set(error || 'Failed to reject request.');
        this.feedbackType.set('error');
      },
    });
  }
}
