import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FindMentor } from './find-mentor.component';

describe('FindMentor', () => {
  let component: FindMentor;
  let fixture: ComponentFixture<FindMentor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindMentor],
    }).compileComponents();

    fixture = TestBed.createComponent(FindMentor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
