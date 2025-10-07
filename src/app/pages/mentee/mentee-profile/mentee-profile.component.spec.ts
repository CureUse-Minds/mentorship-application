import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenteeProfile } from './mentee-profile.component';

describe('MenteeProfile', () => {
  let component: MenteeProfile;
  let fixture: ComponentFixture<MenteeProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenteeProfile],
    }).compileComponents();

    fixture = TestBed.createComponent(MenteeProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
