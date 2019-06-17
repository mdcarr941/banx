import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TagQueryComponent } from './tag-query.component';

describe('TagQueryComponent', () => {
  let component: TagQueryComponent;
  let fixture: ComponentFixture<TagQueryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TagQueryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TagQueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
