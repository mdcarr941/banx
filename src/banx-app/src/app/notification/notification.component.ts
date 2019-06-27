import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import * as $ from 'jquery';

import { NotificationService, NotificationType, Notification } from '../notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  private readonly NotificationTimeout = 3000;
  private readonly prevNotifications: Notification[] = [];

  constructor(private notificationService: NotificationService) { }

  private hideAllIcons(): void {
    $('.notification-icon').hide();
  }

  private showIcon(icon: string): void {
    this.hideAllIcons();
    $('#' + icon).show();
  }

  private getIdAndPrefixMessage(notification: Notification): {iconId: string, message: string} {
    switch(notification.type) {
      case NotificationType.Error: {
        return {iconId: 'error-icon', message: 'Error: ' + notification.message};
      }
      case NotificationType.Warning: {
        return {iconId: 'warning-icon', message: 'Warning: ' + notification.message};
      }
      case NotificationType.Success: {
        return {iconId: 'success-icon', message: 'Success: ' + notification.message};
      }
      case NotificationType.Info: {
        return {iconId: 'info-icon', message: notification.message};
      }
      case NotificationType.Loading: {
        return {iconId: 'load-icon', message: 'Loading: ' + notification.message};
      }
    }
  }

  @ViewChild('messageSpan') messageSpan;

  private showMessage(message: string): void {
    this.messageSpan.nativeElement.innerText = message;    
  }

  @ViewChild('notifications') notifications;

  private sub: Subscription;
  private currentTimeout: NodeJS.Timer = null;

  ngOnInit() {
    $('.notification-icon').hide();
    this.sub = this.notificationService.notifications$.subscribe(notification => {
      this.prevNotifications.push(notification);

      const params = this.getIdAndPrefixMessage(notification);
      this.showIcon(params.iconId);
      this.showMessage(params.message);

      if (this.currentTimeout) clearTimeout(this.currentTimeout);
      $(this.notifications.nativeElement).show();
      this.currentTimeout = setTimeout(
        () => $(this.notifications.nativeElement).hide(),
        this.NotificationTimeout
      );
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
