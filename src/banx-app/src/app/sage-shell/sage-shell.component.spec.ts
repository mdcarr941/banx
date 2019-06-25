import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SageShellComponent } from './sage-shell.component';

describe('SageShellComponent', () => {
  let component: SageShellComponent;
  let fixture: ComponentFixture<SageShellComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SageShellComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SageShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
