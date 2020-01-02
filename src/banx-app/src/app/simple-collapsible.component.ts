import { Component, Input } from '@angular/core';

import { CollapsibleComponent } from './collapsible.component';

@Component({
    selector: 'app-simple-collapsible',
    template:
    `<app-collapsible [collapse$]="collapse$"
      (toggled)="_toggled.next($event)">
      <button class="btn btn-link" (click)="toggle()" itemContent>
        {{itemName}}
      </button>
      <ng-content subList></ng-content>
    </app-collapsible>`
})
export class SimpleCollapsibleComponent extends CollapsibleComponent {
    @Input() public itemName: string;
}