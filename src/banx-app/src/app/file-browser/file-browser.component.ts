import { Component, Input, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-file-browser',
  templateUrl: './file-browser.component.html',
  styleUrls: ['./file-browser.component.css']
})
export class FileBrowserComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new EventEmitter<void>();
  private readonly _fileSelected$ = new EventEmitter<string>();
  private readonly _hide$ = new EventEmitter<void>();

  private selectedFile: string;

  @Input() public readonly show$: Observable<void>;
  @Input() public readonly hide$: Observable<void>;
  @Output() public readonly fileSelected$: Observable<string>
    = this._fileSelected$;

  public ngOnInit() {
    if (this.hide$) {
      this.hide$.pipe(takeUntil(this.destroyed$))
        .subscribe(this._hide$);
    }
  }

  public ngOnDestroy() {
    this.destroyed$.next();
  }

  private selectFile(path: string): void {
    this.selectedFile = path;
  }

  private select(): void {
    this._hide$.next();
    this._fileSelected$.next(this.selectedFile);
  }
}
