import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadProblemsComponent } from './upload-problems.component';

describe('UploadProblemsComponent', () => {
  let component: UploadProblemsComponent;
  let fixture: ComponentFixture<UploadProblemsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UploadProblemsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadProblemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
