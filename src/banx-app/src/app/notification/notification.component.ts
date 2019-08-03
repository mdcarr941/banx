import { Component, OnInit, ViewChild, OnDestroy, EventEmitter } from '@angular/core';
import * as $ from 'jquery';

import { NotificationService, Notification, NotificationType } from '../notification.service';
import { Subscription, BehaviorSubject, Observable } from 'rxjs';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  private static readonly maxNotifications = 64;
  private static readonly purgeNum = NotificationComponent.maxNotifications / 4;
  private static readonly NotificationTimeout = 3000;

  private readonly notifications$ = new BehaviorSubject<Notification[]>([]);

  constructor(private notificationService: NotificationService) { }

  private makeObservable<T>(arg: T): Observable<T> {
    return new BehaviorSubject(arg);
  }

  @ViewChild('notificationsModal') notificationsModal: ModalComponent;

  private showModal(): void {
    this.notificationsModal.show();
  }

  private hideModal(): void {
    this.notificationsModal.hide();
  }

  @ViewChild('notifications') notifications;

  private sub: Subscription;
  // Even though this code runs in the browser, NodeJS.Timer seems
  // roughly equivalent to the return value of `setTimeout`.
  private currentTimeout: NodeJS.Timer = null;

  private saveNotification(notification: Notification): void {
    const notifications = this.notifications$.value;
    notifications.push(notification);

    if (notifications.length > NotificationComponent.maxNotifications) {
      notifications.splice(0, NotificationComponent.purgeNum);
    }
    this.notifications$.next(notifications);
  }

  private displayedNotification$ = new EventEmitter<Notification>();

  ngOnInit() {
    $('.notification-icon').hide();
    this.sub = this.notificationService.notifications$.subscribe(notification => {
      this.saveNotification(notification);
      this.displayedNotification$.next(notification);

      if (this.currentTimeout) clearTimeout(this.currentTimeout);
      $(this.notifications.nativeElement).show();
      // If the notification type is `Loading` then we should show it indefinitely.
      if (notification.type == NotificationType.Loading) return;
      this.currentTimeout = setTimeout(
        () => $(this.notifications.nativeElement).hide(),
        NotificationComponent.NotificationTimeout
      );
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
