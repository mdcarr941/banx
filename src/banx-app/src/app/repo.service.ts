import { Injectable } from '@angular/core';

import { BaseService } from './base.service';
import { IRepository } from '../../../lib/schema';


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
