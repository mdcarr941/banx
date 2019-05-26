import { Component, Input, Output, EventEmitter } from '@angular/core';

import { Problem } from '../../../lib/schema';

@Component({
  selector: 'app-instance-list',
  template:
    `<div class="row" *ngFor="let instance of selectedInstances">
      <div class="col-md-12">
        <pre>{{instance.content}}</pre>
        <button class="btn btn-danger" (click)="deselect.next(instance)">
          Deselect
        </button>
      </div>
      <hr>
    </div>`
})
export class InstanceListComponent {
  @Input() selectedInstances;
  @Output() deselect = new EventEmitter<Problem>();
}
