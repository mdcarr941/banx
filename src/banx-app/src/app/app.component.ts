import { Component } from '@angular/core';

import { BanxUser, IBanxUser } from '../../../lib/schema';

declare const remoteUser: IBanxUser;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private remoteUser = new BanxUser(remoteUser);
}
