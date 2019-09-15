import { HttpClient } from '@angular/common/http';

import { AdminComponent } from './admin.component';
import { UsersService } from '../users.service';
import { NotificationService } from '../notification.service';

function setup(): AdminComponent {
  const usersService = new UsersService(null as HttpClient);
  const notificationService = new NotificationService();
  return new AdminComponent(usersService, notificationService);
}

describe('AdminComponent', () => {
  it('should create', () => {
    expect(setup()).toBeTruthy();
  });
});
