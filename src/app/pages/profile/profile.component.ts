import { AuthService } from './../../core/services/auth.service';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../core/services/profile.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenteeProfile, MentorProfile, UserProfile } from '../../shared/interfaces';
import { switchMap, take, timer } from 'rxjs';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private formBuilder = inject(FormBuilder);

  profile = signal<UserProfile | null>(null);
  profileForm!: FormGroup;
  isLoading = signal(false);
  isSaving = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  isEditMode = signal(false);

  newSkill = signal('');
  newLanguage = signal('');
  newExpertise = signal('');
  newInterest = signal('');

  ngOnInit() {
    this.loadProfile();
  }

  private loadProfile() {
    this.isLoading.set(true);
    this.authService.user$
      .pipe(
        take(1),
        switchMap((user) => {
          if (!user) throw new Error('No user found');
          return this.profileService.getProfile(user.id);
        })
      )
      .subscribe({
        next: (profile) => {
          if (profile) {
            this.profile.set(profile);
            this.initializeForm(profile);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.errorMessage.set('Failed to load profile');
          this.isLoading.set(false);
        },
      });
  }

  private initializeForm(profile: UserProfile) {
    const baseFields = {
      firstName: [profile.firstName, Validators.required],
      lastName: [profile.lastName, Validators.required],
      email: [{ value: profile.email, disabled: true }],
      bio: [profile.bio || ''],
      profilePicture: [profile.profilePicture || ''],
    };

    if (profile.role === 'mentor') {
      const mentorProfile = profile as MentorProfile;
      this.profileForm = this.formBuilder.group({
        ...baseFields,
        expertise: [mentorProfile.expertise],
        yearsOfExperience: mentorProfile.yearsOfExperience || 0,
        // availability: [mentorProfile.availability],
      });
    } else {
      const menteeProfile = profile as MenteeProfile;
      this.profileForm = this.formBuilder.group({
        ...baseFields,
        interests: [menteeProfile.interests],
        goalsAndObjectives: [menteeProfile.goalsAndObjectives],
      });
    }
  }

  toggleEditMode() {
    this.isEditMode.set(!this.isEditMode());
    if (!this.isEditMode()) {
      if (this.profile()) {
        this.initializeForm(this.profile()!);
      }
      this.clearMessages();
    }
  }

  onSubmit() {
    if (this.profileForm.invalid || this.profileForm.pristine || !this.profile()) return;

    this.isSaving.set(true);
    this.clearMessages();

    const updates = {
      ...this.profileForm.getRawValue(),
      updatedAt: new Date(),
    };

    this.profileService.updateProfile(this.profile()!.userId, updates).subscribe({
      next: () => {
        this.successMessage.set('Profile updated successfully');
        this.isSaving.set(false);
        this.isEditMode.set(false);
        this.loadProfile(); // reload to get fresh data

        this.displayMessage(this.successMessage, 'Profile updated successfully');
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.isSaving.set(false);
        this.displayMessage(this.errorMessage, 'Failed to update profile. Please try again.');
      },
    });
  }

  addSkill() {
    const skill = this.newSkill().trim();
    if (!skill || !this.profile()) return;

    this.profileService.addSkill(this.profile()!.userId, skill).subscribe({
      next: () => {
        this.newSkill.set('');
        this.loadProfile();
        this.successMessage.set('Skill added successfully');
        this.displayMessage(this.successMessage, 'Skills added successfully');
      },
      error: (error) => {
        this.displayMessage(this.errorMessage, 'Failed to add skill');
        console.error(error);
      },
    });
  }

  removeSkill(skill: string) {
    if (!this.profile()) return;

    this.profileService.removeSkill(this.profile()!.userId, skill).subscribe({
      next: () => {
        this.loadProfile();
        this.displayMessage(this.successMessage, 'Skill removed successfully');
      },
      error: (error) => {
        this.displayMessage(this.errorMessage, 'Failed to remove skill');
        console.error(error);
      },
    });
  }

  addLanguage() {
    const language = this.newLanguage().trim();
    if (!language || !this.profile()) return;

    const currentLanguages = this.profile()!.preferredLanguages || [];
    const updatedLanguages = [...currentLanguages, language];

    this.profileService
      .updateProfile(this.profile()!.userId, {
        preferredLanguages: updatedLanguages,
      })
      .subscribe({
        next: () => {
          this.newLanguage.set('');
          this.loadProfile();
          this.displayMessage(this.successMessage, 'Language added successfully');
        },
        error: (error) => {
          this.displayMessage(this.errorMessage, 'Failed to add language');
          console.error(error);
        },
      });
  }

  removeLanguage(language: string) {
    if (!this.profile()) return;

    const updatedLanguages = this.profile()!.preferredLanguages.filter((l) => l !== language);

    this.profileService
      .updateProfile(this.profile()!.userId, {
        preferredLanguages: updatedLanguages,
      })
      .subscribe({
        next: () => {
          this.loadProfile();
          this.displayMessage(this.successMessage, 'Language removed successfully');
        },
        error: (error) => {
          this.displayMessage(this.errorMessage, 'Failed to remove language');
          console.error(error);
        },
      });
  }

  // Mentor-specific methods
  addExpertise() {
    const expertise = this.newExpertise().trim();
    if (!expertise || !this.profile() || this.profile()!.role !== 'mentor') return;

    this.profileService.addExpertise(this.profile()!.userId, expertise).subscribe({
      next: () => {
        this.newExpertise.set('');
        this.loadProfile();
        this.displayMessage(this.successMessage, 'Expertise added successfully');
      },
      error: (error) => {
        this.displayMessage(this.errorMessage, 'Failed to add expertise');
        console.error(error);
      },
    });
  }

  removeExpertise(expertise: string) {
    if (!this.profile() || this.profile()!.role !== 'mentor') return;

    this.profileService.removeExpertise(this.profile()!.userId, expertise).subscribe({
      next: () => {
        this.loadProfile();
        this.successMessage.set('Expertise removed successfully!');
        this.displayMessage(this.successMessage, 'Expertise removed successfully');
      },
      error: (error) => {
        this.displayMessage(this.errorMessage, 'Failed to remove expertise');
        console.error(error);
      },
    });
  }

  // Mentee-specific methods
  addInterest() {
    const interest = this.newInterest().trim();
    if (!interest || !this.profile() || this.profile()!.role !== 'mentee') return;

    this.profileService.addInterests(this.profile()!.userId, interest).subscribe({
      next: () => {
        this.newInterest.set('');
        this.loadProfile();
        this.displayMessage(this.successMessage, 'Interest added successfully');
      },
      error: (error) => {
        this.displayMessage(this.errorMessage, 'Failed to add interest');
        console.error(error);
      },
    });
  }

  removeInterest(interest: string) {
    if (!this.profile() || this.profile()!.role !== 'mentee') return;

    this.profileService.removeInterest(this.profile()!.userId, interest).subscribe({
      next: () => {
        this.loadProfile();
        this.displayMessage(this.successMessage, 'Interest removed successfully');
      },
      error: (error) => {
        this.displayMessage(this.errorMessage, 'Failed to remove interest');
        console.error(error);
      },
    });
  }

  // ADDED: reusable helper method for displaying messages
  private clearMessages() {
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  private displayMessage(
    messageSignal: WritableSignal<string>,
    message: string,
    duration: number = 3000
  ) {
    messageSignal.set(message);
    timer(duration)
      .pipe(take(1))
      .subscribe(() => messageSignal.set(''));
  }

  get isMentor(): boolean {
    return this.profile()?.role === 'mentor';
  }

  get isMentee(): boolean {
    return this.profile()?.role === 'mentee';
  }

  get mentorProfile(): MentorProfile | null {
    return this.isMentor ? (this.profile() as MentorProfile) : null;
  }

  get menteeProfile(): MenteeProfile | null {
    return this.isMentee ? (this.profile() as MenteeProfile) : null;
  }

  public toDate(timestamp: any): Date | null {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return timestamp;
  }
}
