import { Injectable } from '@angular/core';

import { Problem } from '../../../lib/schema';

@Injectable({
  providedIn: 'root'
})
export class InstanceService {
  public readonly instances: Problem[] = [];

  public deselect(instance: Problem): boolean {
    const index = this.instances.findIndex(inst => inst === instance);
    if (index < 0) {
      console.error(`InstanceService.deselect: failed to find instance: ${instance._id}`);
      return false;
    }
    this.instances.splice(index, 1);
    return true;
  }

  public select(instance: Problem) {
    this.instances.push(instance);
  }
}
