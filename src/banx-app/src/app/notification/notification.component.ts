import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import * as $ from 'jquery';

import { NotificationService, NotificationType } from '../notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  private readonly NotificationTimeout = 3000;

  constructor(private notificationService: NotificationService) { }

  private hideAllIcons(): void {
    $('.notification-icon').hide();
  }

  private showIcon(icon: string): void {
    this.hideAllIcons();
    $('#' + icon).show();
  }

  private showIconForType(type: NotificationType) {
    switch(type) {
      case NotificationType.Error: {
        this.showIcon('error-icon');
        break;
      }
      case NotificationType.Warning: {
        this.showIcon('warning-icon');
        break;
      }
      case NotificationType.Success: {
        this.showIcon('success-icon');
        break;
      }
      case NotificationType.Info: {
        this.showIcon('info-icon');
        break;
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
    this.sub = this.notificationService.notifications$.subscribe(notification => {
      if (this.currentTimeout) clearTimeout(this.currentTimeout);
      this.showIconForType(notification.type);
      this.showMessage(notification.message);
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
