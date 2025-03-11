import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinQuizPopUpComponent } from './join-quiz-pop-up.component';

describe('JoinQuizPopUpComponent', () => {
  let component: JoinQuizPopUpComponent;
  let fixture: ComponentFixture<JoinQuizPopUpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinQuizPopUpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinQuizPopUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
