import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-collapsible',
  template:
    `<li>
      <button class="btn btn-link" (click)="toggle()">
        {{itemName}}
      </button>
      <ng-content select="[afterItemName]"></ng-content>
      <ul [class.collapse]="collapsed">
        <ng-content></ng-content>
      </ul>
    </li>`  
})
export class CollapsibleComponent implements OnInit, OnDestroy {
  private collapsed: boolean = true;
  private readonly _toggled = new EventEmitter<boolean>();
  private readonly destroyed$ = new EventEmitter<void>();

  @Input() itemName: string;
  @Input() collapse$: Observable<void>;
  @Output() toggled: Observable<boolean> = this._toggled;

  public ngOnInit() {
    if (this.collapse$) {
      this.collapse$.pipe(takeUntil(this.destroyed$))
        .subscribe(() => this.collapse());
    }
  }

  public ngOnDestroy() {
    this.destroyed$.next();
  }

  public toggle() {
    this.collapsed = !this.collapsed;
    this._toggled.next(this.collapsed);
  }

  public collapse() {
    this.collapsed = true;
    this._toggled.next(this.collapsed);
  }
}
