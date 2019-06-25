import { Component } from '@angular/core';

import { BanxUser, IBanxUser } from '../../../lib/schema';

export const enterKeyCode = 13; // The key code of the enter key.

declare const remoteUser: IBanxUser;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private remoteUser = new BanxUser(remoteUser);
}
