import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchAndResultsComponent } from './search-and-results.component';

describe('SearchAndResultsComponent', () => {
  let component: SearchAndResultsComponent;
  let fixture: ComponentFixture<SearchAndResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchAndResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchAndResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
