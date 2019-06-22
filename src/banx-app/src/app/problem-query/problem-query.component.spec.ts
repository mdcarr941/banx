import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProblemQueryComponent } from './problem-query.component';

describe('ProblemQueryComponent', () => {
  let component: ProblemQueryComponent;
  let fixture: ComponentFixture<ProblemQueryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProblemQueryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProblemQueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
