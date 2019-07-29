import { Component } from '@angular/core';

import { RemoteUserService } from './remote-user.service';
import { BanxUser } from '../../../lib/schema';

export const enterKeyCode = 13; // The key code of the enter key.

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private remoteUser: BanxUser;

  constructor(private remoteUserService: RemoteUserService) {
    this.remoteUser = remoteUserService.remoteUser;
  }
}
