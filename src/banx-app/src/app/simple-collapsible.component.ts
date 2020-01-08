import { Component, Input, EventEmitter } from '@angular/core';

import { CollapsibleComponent } from './collapsible.component';

@Component({
    selector: 'app-simple-collapsible',
    template:
    `<app-collapsible
      [toggle$]="_toggle$"
      [collapse$]="collapse$"
      (toggled)="_toggled.next($event)">
      <button class="btn btn-link" (click)="_toggle$.next()" itemContent>
        {{itemName}}
      </button>
      <ng-content subList></ng-content>
    </app-collapsible>`
})
export class SimpleCollapsibleComponent extends CollapsibleComponent {
    protected readonly _toggle$ = new EventEmitter<void>();
    @Input() public itemName: string;
}