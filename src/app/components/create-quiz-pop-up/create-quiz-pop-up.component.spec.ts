import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateQuizPopUpComponent } from './create-quiz-pop-up.component';

describe('CreateQuizPopUpComponent', () => {
  let component: CreateQuizPopUpComponent;
  let fixture: ComponentFixture<CreateQuizPopUpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateQuizPopUpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateQuizPopUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
