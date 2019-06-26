import { Injectable, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

export enum NotificationType {
  Error,
  Warning,
  Success,
  Info
}

export interface Notification {
  type: NotificationType;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly _notifications$
    = new EventEmitter<Notification>();

  public readonly notifications$: Observable<Notification>
    = this._notifications$;

  constructor() {}

  public showNotification(type: NotificationType, message: string): void {
    this._notifications$.next({type: type, message: message});
  }

  public showError(message: string): void {
    this.showNotification(NotificationType.Error, message);
  }

  public showWarning(message: string): void {
    this.showNotification(NotificationType.Warning, message);
  }

  public showSuccess(message: string): void {
    this.showNotification(NotificationType.Success, message);
  }

  public showInfo(message: string): void {
    this.showNotification(NotificationType.Info, message);
  }
}
