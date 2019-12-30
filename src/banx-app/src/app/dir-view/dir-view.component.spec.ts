import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DirViewComponent } from './dir-view.component';

describe('DirViewComponent', () => {
  let component: DirViewComponent;
  let fixture: ComponentFixture<DirViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DirViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DirViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
