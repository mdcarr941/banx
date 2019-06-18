import { Injectable } from '@angular/core';

import { Problem } from '../../../lib/schema';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InstanceService {
  public readonly instances$ = new BehaviorSubject<Problem[]>([]);

  public deselect(instance: Problem): boolean {
    const instances = this.instances$.value;
    const index = instances.findIndex(inst => inst === instance);
    if (index < 0) {
      console.error(`InstanceService.deselect: failed to find instance: ${instance._id}`);
      return false;
    }
    instances.splice(index, 1);
    this.instances$.next(instances);
    return true;
  }

  public select(instance: Problem) {
    this.instances$.value.push(instance)
    this.instances$.next(this.instances$.value);
  }

  public toggle(instance: Problem): boolean {
    const instances = this.instances$.value;
    const index = instances.indexOf(instance);
    const toggleOn = index < 0;
    if (toggleOn) {
      instances.push(instance);
    }
    else {
      instances.splice(index, 1);
    }
    this.instances$.next(instances);
    return toggleOn;
  }
}
