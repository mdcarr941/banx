import { Component, OnInit, Input, EventEmitter, Output, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Stat } from '@isomorphic-git/lightning-fs';

import { lsStats, ls, touch, mkdir, isdir } from '../repo.service';
import { urlJoin, basename } from '../../../../lib/common';
import { takeUntil, filter } from 'rxjs/operators';

class DirTree {
  public subdirs: string[] = [];
  public files: string[] = [];

  constructor(stats: {[name: string]: Stat}) {
    for (let name in stats) {
      if (name.startsWith('.')) continue;

      if (stats[name].isDirectory()) {
        this.subdirs.push(name);
      }
      else this.files.push(name);
    }
  }

  public static async from(path: string) {
    return new DirTree(await lsStats(path));
  }
}

@Component({
  selector: 'app-dir-view',
  templateUrl: './dir-view.component.html',
  styleUrls: ['./dir-view.component.css']
})
export class DirViewComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new EventEmitter<void>();
  private readonly _toggled$ = new EventEmitter<boolean>();
  private readonly _fileSelected$ = new EventEmitter<string>();
  private readonly tree$ = new BehaviorSubject<DirTree>(null);
  private readonly _collapse$ = new EventEmitter<void>();

  @Input() public dir: string = '/';
  @Input() public refresh$: Observable<void>;
  @Input() public collapse$: Observable<string>;
  @Output() public readonly fileSelected$: Observable<string>
    = this._fileSelected$;
  @Output() public readonly toggled$: Observable<boolean>
    = this._toggled$;

  constructor() { }

  public ngOnInit() {
    if (this.refresh$) {
      this.refresh$.pipe(takeUntil(this.destroyed$))
        .subscribe(() => this.refresh());
    }

    if (this.collapse$) {
      this.collapse$.pipe(takeUntil(this.destroyed$))
        .subscribe(collapseException => {
          if (this.dir === collapseException) return;
          else this._collapse$.next();
        });
    }

    this._toggled$.pipe(
      takeUntil(this.destroyed$),
      filter(collapsed => !collapsed)
    )
    .subscribe(() => this.refresh());
  }

  public ngOnDestroy() {
    this.destroyed$.next();
  }

  private async refresh(): Promise<void> {
    if (await isdir(this.dir)) {
      this.tree$.next(await DirTree.from(this.dir));
    }
    else {
      console.debug(`DirViewComponent.refresh: '${this.dir}' is not a directory`);
    }
  }

  private fullPath(subpath: string): string {
    return urlJoin(this.dir, subpath);
  }

  private uniqueName(base: string, usedNames: string[]): string {
    let name = base;
    let counter = 1;
    while (usedNames.indexOf(name) >= 0) {
      counter += 1;
      name = base + counter;
    }
    return name;
  }

  private async newFile(): Promise<void> {
    const filename = this.uniqueName(
      'NewFile',
      await ls(this.dir)
    );
    await touch(this.fullPath(filename));

    const tree = this.tree$.value;
    tree.files.push(filename);
    this.tree$.next(tree);
  }

  private async newDir(): Promise<void> {
    const dirname = this.uniqueName(
      'NewDir',
      await ls(this.dir)
    );
    await mkdir(this.fullPath(dirname));

    const tree = this.tree$.value;
    tree.subdirs.push(dirname);
    this.tree$.next(tree);
  }

  private selectFile(filename: string): void {
    this._fileSelected$.next(this.fullPath(filename));
  }

  private basename(path: string): string {
    return basename(path);
  }
}
