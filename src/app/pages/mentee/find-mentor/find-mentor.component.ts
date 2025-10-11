import { Component, inject, signal } from '@angular/core';
import { ProfileService } from '../../../core/services/profile.service';
import { SessionService } from '../../../core/services/session.service';
import { MentorProfile } from '../../../shared/interfaces';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-find-mentor',
  imports: [FormsModule, CommonModule],
  templateUrl: './find-mentor.component.html',
  styleUrl: './find-mentor.component.css',
})
export class FindMentor {
  private profileService = inject(ProfileService);
  private sessionService = inject(SessionService);

  mentors = signal<MentorProfile[]>([]);
  feedbackMessage = signal('');
  feedbackType = signal<'success' | 'error' | ''>('');

  constructor() {
    // Fetches all mentor profiles from Firestore via the ProfileService
    this.profileService.getAllMentors().subscribe((mentors) => {
      this.mentors.set(mentors);
    });
  }

  sendRequest(mentorId: string, message: string) {
    if (!message.trim()) {
      this.feedbackMessage.set('Please enter a message to the mentor.');
      this.feedbackType.set('error');
      return;
    }
    // Creates a new request document in Firestore via the SessionService
    this.sessionService.sendRequest(mentorId, message).subscribe({
      next: () => {
        this.feedbackMessage.set('Mentorship request sent successfully!');
        this.feedbackType.set('success');
      },
      error: (error) => {
        this.feedbackMessage.set(error.message || 'Failed to send request!');
        this.feedbackType.set('error');
      },
    });
  }
}
