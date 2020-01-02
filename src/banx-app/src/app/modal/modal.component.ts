import { Component, ViewChild, Input, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import * as $ from 'jquery';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new EventEmitter<void>();

  @ViewChild('modalDiv') private modalDiv;

  @Input() public title = 'Modal Dialog';
  @Input() public show$: Observable<void>;
  @Input() public hide$: Observable<void>;

  constructor() { }

  public ngOnInit(): void {
    if (this.show$) {
      this.show$.pipe(takeUntil(this.destroyed$))
        .subscribe(() => this.show());
    }

    if (this.hide$) {
      this.hide$.pipe(takeUntil(this.destroyed$))
        .subscribe(() => this.hide());
    }
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
  }

  public show(): void {
    $(this.modalDiv.nativeElement).show();
  }

  public hide(): void {
    $(this.modalDiv.nativeElement).hide();
  }
}
