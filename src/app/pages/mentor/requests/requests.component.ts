import { Component, inject, signal } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../shared/services';
import { Session } from '../../../shared/interfaces';
import { catchError, EMPTY, filter, Subscription, switchMap, tap } from 'rxjs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-requests',
  imports: [DatePipe],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css',
})
export class Requests {
  private sessionService = inject(SessionService);
  private authService = inject(AuthService);
  private subscription?: Subscription;

  requests = signal<Session[]>([]);
  feedbackMessage = signal('');
  feedbackType = signal<'success' | 'error' | ''>('');
  isLoading = signal(true);

  constructor() {
    this.loadRequests();
  }

  private loadRequests(): void {
    this.subscription = this.authService.user$
      .pipe(
        filter((user): user is NonNullable<typeof user> => !!user),
        tap(() => {
          console.log('Loading requests for mentor...');
          this.isLoading.set(true);
        }),
        switchMap((user) => {
          console.log('Fetching requests for mentor ID:', user.id);
          return this.sessionService.getRequestForMentor(user.id);
        }),
        catchError((error) => {
          console.error('Error loading requests:', error);
          this.feedbackMessage.set('Failed to load requests. Please refresh the page.');
          this.feedbackType.set('error');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe({
        next: (requests) => {
          console.log('Requests received:', requests);
          this.requests.set(requests);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Subscription error:', error);
          this.isLoading.set(false);
        },
      });
  }

  accept(requestId: string): void {
    this.sessionService.acceptRequest(requestId).subscribe({
      next: () => {
        this.feedbackMessage.set('Request accepted successfully!');
        this.feedbackType.set('success');
        this.clearFeedbackAfterDelay();
      },
      error: (error) => {
        console.error('Error accepting request:', error);
        const errorMessage = typeof error === 'string' ? error : 'Failed to accept request.';
        this.feedbackMessage.set(errorMessage);
        this.feedbackType.set('error');
        this.clearFeedbackAfterDelay();
      },
    });
  }

  reject(requestId: string): void {
    this.sessionService.rejectRequest(requestId).subscribe({
      next: () => {
        this.feedbackMessage.set('Request rejected.');
        this.feedbackType.set('success');
        this.clearFeedbackAfterDelay();
      },
      error: (error) => {
        console.error('Error rejecting request:', error);
        const errorMessage = typeof error === 'string' ? error : 'Failed to reject request.';
        this.feedbackMessage.set(errorMessage);
        this.feedbackType.set('error');
        this.clearFeedbackAfterDelay();
      },
    });
  }

  private clearFeedbackAfterDelay(): void {
    // Using setTimeout here is acceptable for UI feedback messages
    // This is not for data fetching, but for UX enhancement
    setTimeout(() => {
      this.feedbackMessage.set('');
      this.feedbackType.set('');
    }, 3000);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
