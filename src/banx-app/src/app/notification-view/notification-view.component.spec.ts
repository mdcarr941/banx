import { EventEmitter } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationViewComponent } from './notification-view.component';
import { Notification } from '../notification.service';

describe('NotificationViewComponent', () => {
  let component: NotificationViewComponent;
  let fixture: ComponentFixture<NotificationViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NotificationViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationViewComponent);
    component = fixture.componentInstance;
    component.notification$ = new EventEmitter<Notification>();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
