import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CalendarService } from '../../shared/services/calendar.service';
import { AuthService } from '../../core/services/auth.service';
import { MentorProfileService } from '../../shared/services/mentor-profile.service';
import { DatabaseDiagnosticService } from '../../shared/services/database-diagnostic.service';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, switchMap, map, startWith } from 'rxjs/operators';
import { 
  DynamicMentor, 
  TimeSlot, 
  AvailabilityResponse,
  BookingValidation,
  MentorSearchCriteria
} from '../../shared/interfaces/dynamic-booking.interface';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  public router = inject(Router);
  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);
  private mentorProfileService = inject(MentorProfileService);
  private diagnosticService = inject(DatabaseDiagnosticService);

  private destroy$ = new Subject<void>();

  bookingForm!: FormGroup;
  searchForm!: FormGroup;
  
  // Dynamic data
  availableMentors: DynamicMentor[] = [];
  selectedMentor: DynamicMentor | null = null;
  availableTimeSlots: TimeSlot[] = [];
  
  // UI state
  selectedDate = new Date();
  isLoading = false;
  isLoadingSlots = false;
  isValidatingBooking = false;
  
  // Dynamic progress tracking
  currentStep = 1;
  steps = [
    { id: 1, name: 'Search', description: 'Find your mentor' },
    { id: 2, name: 'Book', description: 'Select time & date' },
    { id: 3, name: 'Connect', description: 'Confirm booking' }
  ];
  
  // Observables
  user$ = this.authService.user$;
  mentors$ = this.mentorProfileService.mentors$;
  loading$ = this.mentorProfileService.loading$;
  
  // Validation and suggestions
  bookingValidation: BookingValidation | null = null;
  showAlternatives = false;

  ngOnInit() {
    this.initializeForms();
    this.setupFormWatchers();
    this.loadMentors();
    this.loadDraft(); // Load any saved draft
    this.updateProgress(); // Initialize progress state
    // Remove diagnostic call from ngOnInit to avoid injection context issues
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Search form for filtering mentors
    this.searchForm = this.fb.group({
      expertise: [''],
      minRating: [4.0],
      language: ['']
    });

    // Main booking form
    this.bookingForm = this.fb.group({
      mentorId: ['', Validators.required],
      date: [this.formatDate(this.selectedDate), Validators.required],
      startTime: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      agenda: [''],
      preferredLanguage: ['English']
    });
  }

  private setupFormWatchers(): void {
    // Watch for mentor selection changes
    this.bookingForm.get('mentorId')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(mentorId => {
        if (mentorId) {
          this.onMentorSelected(mentorId);
        }
        this.updateProgress();
      });

    // Watch for date changes
    this.bookingForm.get('date')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(date => {
        if (date && this.selectedMentor) {
          this.loadAvailableTimeSlots();
        }
      });

    // Watch for start time changes and validate booking
    combineLatest([
      this.bookingForm.get('startTime')?.valueChanges || [],
      this.bookingForm.get('date')?.valueChanges || [],
      this.bookingForm.get('mentorId')?.valueChanges || []
    ]).pipe(
      takeUntil(this.destroy$),
      debounceTime(500)
    ).subscribe(() => {
      this.validateCurrentBooking();
      this.updateProgress();
    });

    // Search form watcher
    this.searchForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(400),
        startWith(this.searchForm.value)
      )
      .subscribe(() => {
        this.searchMentors();
      });
  }

  private loadMentors(): void {
    // Initial load with default criteria
    this.searchMentors();
  }

  onSubmit(): void {
    if (this.bookingForm.valid) {
      this.isLoading = true;
      this.currentStep = 3; // Move to final connect step during processing
      
      const formData = this.bookingForm.value;
      const selectedMentor = this.availableMentors.find(m => m.id === formData.mentorId);
      
      const sessionRequest = {
        title: `Mentorship Session with ${this.getMentorFullName(selectedMentor!)}`,
        description: formData.description,
        date: new Date(formData.date),
        startTime: formData.startTime,
        duration: '1 hour', // Default duration
        participantId: formData.mentorId,
        location: 'Virtual Meeting',
        agenda: formData.agenda ? formData.agenda.split('\n').filter((item: string) => item.trim()) : []
      };

      this.calendarService.createSession(sessionRequest).subscribe({
        next: (session) => {
          this.isLoading = false;
          this.currentStep = 4; // Complete step
          // Brief delay to show completion before navigation
          setTimeout(() => {
            this.router.navigate(['/sessions']);
          }, 1500);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Booking failed:', error);
        }
      });
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onDateChange(event: any): void {
    this.selectedDate = new Date(event.target.value);
    // Here you could load mentor availability for the selected date
    this.updateProgress();
  }



  getMinDate(): string {
    return this.formatDate(new Date());
  }

  // Dynamic progress step management
  updateProgress(): void {
    const mentorSelected = !!this.bookingForm.get('mentorId')?.value;
    const timeSelected = !!this.bookingForm.get('startTime')?.value;
    const dateSelected = !!this.bookingForm.get('date')?.value;

    if (!mentorSelected) {
      this.currentStep = 1; // Search step
    } else if (mentorSelected && (!timeSelected || !dateSelected)) {
      this.currentStep = 2; // Book step
    } else if (mentorSelected && timeSelected && dateSelected) {
      this.currentStep = 3; // Connect step
    }
  }

  isStepCompleted(stepId: number): boolean {
    return this.currentStep > stepId;
  }

  isStepActive(stepId: number): boolean {
    return this.currentStep === stepId;
  }

  getStepClass(stepId: number): string {
    if (this.isStepCompleted(stepId)) {
      return 'bg-green-600 text-white';
    } else if (this.isStepActive(stepId)) {
      // Show different color when booking is being processed
      if (this.isLoading && stepId === 3) {
        return 'bg-yellow-500 text-white';
      }
      return 'bg-blue-600 text-white';
    } else {
      return 'bg-gray-200 text-gray-600';
    }
  }

  getStepTextClass(stepId: number): string {
    if (this.isStepCompleted(stepId)) {
      return 'text-green-600 font-medium';
    } else if (this.isStepActive(stepId)) {
      if (this.isLoading && stepId === 3) {
        return 'text-yellow-600 font-medium';
      }
      return 'text-blue-600 font-medium';
    } else {
      return 'text-gray-400';
    }
  }

  getStepDescription(step: any): string {
    if (this.isStepActive(step.id) && this.isLoading && step.id === 3) {
      return 'Processing booking...';
    }
    return step.description;
  }

  getCurrentStepGuidance(): string {
    switch (this.currentStep) {
      case 1:
        return 'Choose a mentor that matches your learning goals and expertise needs.';
      case 2:
        return 'Select a date and time that works for both you and your mentor.';
      case 3:
        if (this.isLoading) {
          return 'Processing your booking request...';
        }
        return 'Review your booking details and confirm to schedule your session.';
      default:
        return 'Follow the steps to book your mentorship session.';
    }
  }

  getProgressPercentage(): number {
    return Math.round((this.currentStep / 3) * 100);
  }

  getConnectorClass(stepId: number): string {
    if (this.isStepCompleted(stepId)) {
      return 'bg-green-300';
    } else if (this.currentStep > stepId) {
      return 'bg-blue-300';
    } else {
      return 'bg-gray-200';
    }
  }

  // Database Diagnostic Methods (call manually when needed)

  async runDatabaseDiagnostic(): Promise<void> {
    console.log('🔍 Running database diagnostic from booking component...');
    
    try {
      // Run quick check first
      const quickResult = await this.diagnosticService.quickMentorCheck();
      
      if (quickResult && quickResult.totalUsers > 0) {
        console.log('📊 Database Quick Summary:');
        console.log(`- Total Users: ${quickResult.totalUsers}`);
        console.log(`- Mentor Count: ${quickResult.mentorCount}`);
        console.log(`- Available Roles: ${Array.from(quickResult.availableRoles).join(', ')}`);
        
        if (quickResult.mentorCount === 0) {
          console.log('⚠️ No mentors found! This explains why the booking form is empty.');
          console.log('💡 Suggestions:');
          console.log('   1. Check if users in database have role="mentor"');
          console.log('   2. Create some mentor accounts in Firestore');
          console.log('   3. Verify the role field name matches your query');
        } else {
          console.log('✅ Mentors found in database, investigating why they\'re not loading...');
        }
      }
      
      // Run full analysis if needed
      if (quickResult && quickResult.totalUsers > 0) {
        console.log('🔬 Running full database analysis...');
        await this.diagnosticService.analyzeDatabaseStructure();
      }
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
    }
  }

  // Dynamic Methods

  private searchMentors(): void {
    const searchCriteria: MentorSearchCriteria = {
      expertise: this.searchForm.get('expertise')?.value ? [this.searchForm.get('expertise')?.value] : undefined,
      minRating: this.searchForm.get('minRating')?.value || undefined,
      languages: this.searchForm.get('language')?.value ? [this.searchForm.get('language')?.value] : undefined
    };

    this.mentorProfileService.searchMentors(searchCriteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mentors) => {
          console.log('🎯 Booking Component received mentors:', mentors.length);
          this.availableMentors = mentors;
          
          if (mentors.length === 0) {
            console.log('⚠️ No mentors available for booking form');
            console.log('💡 To add mentors:');
            console.log('   1. Go to Firebase Console → Firestore');
            console.log('   2. Find a user document');
            console.log('   3. Set role: "mentor"');
            console.log('   4. Refresh this page');
          }
        },
        error: (error) => {
          console.error('Error loading mentors:', error);
        }
      });
  }

  private onMentorSelected(mentorId: string): void {
    this.selectedMentor = this.availableMentors.find(m => m.id === mentorId) || null;
    
    if (this.selectedMentor) {
      // Load available time slots
      this.loadAvailableTimeSlots();
    }
  }

  private loadAvailableTimeSlots(): void {
    const mentorId = this.bookingForm.get('mentorId')?.value;
    const date = this.bookingForm.get('date')?.value;

    if (!mentorId || !date) {
      return;
    }

    this.isLoadingSlots = true;
    
    // Disable startTime control while loading
    this.bookingForm.get('startTime')?.disable();
    
    const request = {
      mentorId,
      date: new Date(date)
    };

    this.mentorProfileService.getMentorAvailability(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AvailabilityResponse) => {
          this.availableTimeSlots = response.availableSlots;
          this.isLoadingSlots = false;
          
          // Enable/disable startTime control based on available slots
          if (this.availableTimeSlots.length > 0) {
            this.bookingForm.get('startTime')?.enable();
          } else {
            this.bookingForm.get('startTime')?.disable();
          }
          
          // Clear selected time if it's no longer available
          const currentTime = this.bookingForm.get('startTime')?.value;
          if (currentTime && !this.availableTimeSlots.find(slot => slot.startTime === currentTime)) {
            this.bookingForm.patchValue({ startTime: '' });
          }
        },
        error: (error) => {
          console.error('Error loading time slots:', error);
          this.isLoadingSlots = false;
          this.availableTimeSlots = [];
          
          // Disable startTime control on error
          this.bookingForm.get('startTime')?.disable();
        }
      });
  }

  private validateCurrentBooking(): void {
    const formValue = this.bookingForm.value;
    
    if (!formValue.mentorId || !formValue.date || !formValue.startTime) {
      return;
    }

    this.isValidatingBooking = true;
    
    const bookingRequest = {
      mentorId: formValue.mentorId,
      date: new Date(formValue.date),
      startTime: formValue.startTime,
      studentId: 'current-user-id', // Would come from auth service
      message: formValue.description || '',
      agenda: formValue.agenda ? formValue.agenda.split('\n').filter((item: string) => item.trim()) : []
    };

    this.mentorProfileService.validateBooking(bookingRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (validation: BookingValidation) => {
          this.bookingValidation = validation;
          this.showAlternatives = !validation.isValid && validation.suggestions.length > 0;
          this.isValidatingBooking = false;
        },
        error: (error) => {
          console.error('Error validating booking:', error);
          this.isValidatingBooking = false;
        }
      });
  }

  // UI Helper Methods
  
  getMentorFullName(mentor: DynamicMentor): string {
    return `${mentor.firstName} ${mentor.lastName}`;
  }

  getMentorExpertiseDisplay(mentor: DynamicMentor): string {
    return mentor.expertise.slice(0, 2).join(', ') + 
           (mentor.expertise.length > 2 ? ` +${mentor.expertise.length - 2} more` : '');
  }

  getMentorInitials(fullName: string): string {
    return fullName.split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getBookingSummary() {
    const formValue = this.bookingForm.value;
    const mentor = this.availableMentors.find(m => m.id === formValue.mentorId);
    
    if (!mentor) {
      return null;
    }

    return {
      mentorName: this.getMentorFullName(mentor),
      dateTime: formValue.date && formValue.startTime ? 
        `${formValue.date} at ${formValue.startTime}` : null,
      duration: '60 minutes' // Default session duration
    };
  }

  saveAsDraft(): void {
    const draftData = {
      ...this.bookingForm.value,
      timestamp: new Date().toISOString(),
      isDraft: true
    };
    
    localStorage.setItem('booking_draft', JSON.stringify(draftData));
    
    // Show success message
    console.log('Booking saved as draft');
    // You could implement a toast notification here
  }

  loadDraft(): void {
    const draftData = localStorage.getItem('booking_draft');
    if (draftData) {
      try {
        const draft = JSON.parse(draftData);
        this.bookingForm.patchValue(draft);
        console.log('Draft loaded successfully');
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }

  clearDraft(): void {
    localStorage.removeItem('booking_draft');
  }

  selectAlternativeSlot(alternative: any): void {
    this.bookingForm.patchValue({
      date: this.formatDate(alternative.date),
      startTime: alternative.timeSlot.startTime
    });
    this.showAlternatives = false;
  }

  toggleAlternatives(): void {
    this.showAlternatives = !this.showAlternatives;
  }
}