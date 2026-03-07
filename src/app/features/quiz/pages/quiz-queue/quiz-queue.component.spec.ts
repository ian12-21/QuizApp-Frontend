import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizQueueComponent } from './quiz-queue.component';

describe('QuizQueueComponent', () => {
  let component: QuizQueueComponent;
  let fixture: ComponentFixture<QuizQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizQueueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
