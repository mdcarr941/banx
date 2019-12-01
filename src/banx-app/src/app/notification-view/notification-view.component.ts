import { Component, ViewChild, Input, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { NotificationType, Notification } from '../notification.service';

@Component({
  selector: 'app-notification-view',
  templateUrl: './notification-view.component.html',
  styleUrls: ['./notification-view.component.css']
})
export class NotificationViewComponent implements OnInit, OnDestroy {
  @Input() notification$: Observable<Notification>;

  constructor() { }

  @ViewChild('errorIcon', { static: true }) errorIcon;
  @ViewChild('warningIcon', { static: true }) warningIcon;
  @ViewChild('successIcon', { static: true }) successIcon;
  @ViewChild('infoIcon', { static: true }) infoIcon;
  @ViewChild('loadingIcon', { static: true }) loadingIcon;

  private getIdAndPrefixMessage(notification: Notification): {icon: any, message: string} {
    switch(notification.type) {
      case NotificationType.Error: {
        return {icon: this.errorIcon, message: 'Error: ' + notification.message};
      }
      case NotificationType.Warning: {
        return {icon: this.warningIcon, message: 'Warning: ' + notification.message};
      }
      case NotificationType.Success: {
        return {icon: this.successIcon, message: 'Success: ' + notification.message};
      }
      case NotificationType.Info: {
        return {icon: this.infoIcon, message: notification.message};
      }
      case NotificationType.Loading: {
        return {icon: this.loadingIcon, message: 'Loading: ' + notification.message};
      }
    }
  }

  private hideIcon(icon: any): void {
    if (!icon) return;
    $(icon.nativeElement).hide();
  }

  private hideAllIcons(): void {
    this.icons.forEach(this.hideIcon);
  }

  private showIcon(icon: any): void {
    this.hideAllIcons();
    $(icon.nativeElement).show();
  }

  @ViewChild('messageSpan', { static: true }) messageSpan;

  private showMessage(message: string): void {
    this.messageSpan.nativeElement.innerText = message;    
  }

  private sub: Subscription;
  private icons: Array<any>;

  ngOnInit() {
    this.icons = [this.errorIcon, this.warningIcon, this.successIcon, this.infoIcon, this.loadingIcon];
    this.sub = this.notification$.subscribe(notification => {
      const params = this.getIdAndPrefixMessage(notification);
      this.showIcon(params.icon);
      this.showMessage(params.message);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
