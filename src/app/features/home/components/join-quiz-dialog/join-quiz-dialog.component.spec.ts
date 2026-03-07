import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinQuizDialogComponent } from './join-quiz-dialog.component';

describe('JoinQuizDialogComponent', () => {
  let component: JoinQuizDialogComponent;
  let fixture: ComponentFixture<JoinQuizDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinQuizDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinQuizDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
