import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import * as $ from 'jquery';

@Component({
  selector: 'app-collapsible',
  template:
    `<ng-container>
      <li (click)="toggle()">
        <button class="btn btn-link">{{itemName}}</button>
      </li>
      <ul [class.collapse]="collapsed" #list>
        <ng-content></ng-content>
      </ul>
    </ng-container>`  
})
export class CollapsibleComponent {
  private collapsed: boolean = true;
  @ViewChild('list') list;
  @Input() itemName: string;
  @Output() toggled = new EventEmitter<boolean>();

  toggle() {
    this.collapsed = !this.collapsed;
    (<any>$(this.list.nativeElement)).collapse('toggle');
    this.toggled.next(this.collapsed);
  }
}
