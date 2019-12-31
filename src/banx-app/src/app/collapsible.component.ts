import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';

declare const $: any;

@Component({
  selector: 'app-collapsible',
  template:
    `<li>
      <button class="btn btn-link" (click)="toggle()">
        {{itemName}}
      </button>
      <ul [class.collapse]="collapsed" #list>
        <ng-content></ng-content>
      </ul>
    </li>`  
})
export class CollapsibleComponent {
  private collapsed: boolean = true;
  @ViewChild('list') list;
  @Input() itemName: string;
  @Output() toggled = new EventEmitter<boolean>();

  toggle() {
    this.collapsed = !this.collapsed;
    if (typeof $ === 'function') {
      $(this.list.nativeElement).collapse('toggle');
    }
    this.toggled.next(this.collapsed);
  }
}
