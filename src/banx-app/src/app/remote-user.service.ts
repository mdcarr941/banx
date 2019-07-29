import { Injectable } from '@angular/core';

import { BanxUser, IBanxUser } from '../../../lib/schema';

declare const remoteUser: IBanxUser;

@Injectable({
  providedIn: 'root'
})
export class RemoteUserService {
  public readonly remoteUser = new BanxUser(remoteUser);

  constructor() { }
}
