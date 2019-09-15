import { Injectable } from '@angular/core';

import { BanxUser, IBanxUser } from '../../../lib/schema';

declare const remoteUser: IBanxUser;

@Injectable({
  providedIn: 'root'
})
export class RemoteUserService {
  public readonly remoteUser
    = typeof remoteUser === 'object'
    ? new BanxUser(remoteUser)
    : new BanxUser({glid: 'nobody', roles: []});

  constructor() { }
}
