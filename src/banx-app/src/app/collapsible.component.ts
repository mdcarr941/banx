import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-collapsible',
  template:
    `<li>
      <ng-content select="[itemContent]"></ng-content>
      <ul [class.collapse]="collapsed">
        <ng-content select="[subList]"></ng-content>
      </ul>
    </li>`  
})
export class CollapsibleComponent implements OnInit, OnDestroy {
  private collapsed: boolean = true;
  private readonly _toggled = new EventEmitter<boolean>();
  private readonly destroyed$ = new EventEmitter<void>();

  @Input() toggle$: Observable<void>;
  @Input() collapse$: Observable<void>;
  @Input() expand$: Observable<void>;
  @Output() toggled: Observable<boolean> = this._toggled;

  public ngOnInit() {
    if (this.toggle$) {
      this.toggle$.pipe(takeUntil(this.destroyed$))
        .subscribe(() => this.toggle());
    }

    if (this.collapse$) {
      this.collapse$.pipe(takeUntil(this.destroyed$))
        .subscribe(() => this.collapse());
    }

    if (this.expand$) {
      this.expand$.pipe(takeUntil(this.destroyed$))
        .subscribe(() => this.expand());
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

  public expand() {
    this.collapsed = false;
    this._toggled.next(this.collapsed);
  }
}
