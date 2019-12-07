import { Injectable } from '@angular/core';

import { BaseService } from './base.service';
import { IRepository } from '../../../lib/schema';
import { forEach } from '../../../lib/common';

function copyIfExists(from: any, to: any): void {
  forEach(from, (key, val) => {
    if (undefined !== to[key]) to[key] = val;
  });
}

export class Repository implements IRepository {
  idStr: string = null;
  name: string = null;
  userIds: string[] = null;

  constructor(obj: IRepository) {
    if (!obj) return;
    copyIfExists(obj, this);
    this.userIds = this.userIds || [];
  }
}

@Injectable({
  providedIn: 'root'
})
export class RepoService extends BaseService {
  protected get endpoint(): string {
    return 'git'
  }

  constructor() {
    super();
  }

  
}
