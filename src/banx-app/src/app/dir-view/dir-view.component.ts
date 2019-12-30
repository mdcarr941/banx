import { Component, OnInit, OnDestroy, Input, EventEmitter, Output } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Stat } from '@isomorphic-git/lightning-fs';

import { lsStats, ls, touch, mkdir } from '../repo.service';
import { urlJoin } from '../../../../lib/common';

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
  private readonly _fileSelected$ = new EventEmitter<string>();
  private readonly tree$ = new BehaviorSubject<DirTree>(null);
  private currentDir: string = null;

  @Input() public dir$: Observable<string>;
  @Output() public fileSelected$: Observable<string> = this._fileSelected$;

  constructor() { }

  public ngOnInit() {
    this.dir$.pipe(takeUntil(this.destroyed$))
      .subscribe(async dir => {
        this.currentDir = dir;
        this.tree$.next(await DirTree.from(dir));
      });
  }

  public ngOnDestroy() {
    this.destroyed$.next();
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
      await ls(this.currentDir)
    );
    await touch(urlJoin(this.currentDir, filename));

    const tree = this.tree$.value;
    tree.files.push(filename);
    this.tree$.next(tree);
  }

  private async newDir(): Promise<void> {
    const dirname = this.uniqueName(
      'NewDir',
      await ls(this.currentDir)
    );
    await mkdir(urlJoin(this.currentDir, dirname));

    const tree = this.tree$.value;
    tree.subdirs.push(dirname);
    this.tree$.next(tree);
  }

  private selectFile(filename: string): void {
    this._fileSelected$.next(urlJoin(this.currentDir, filename));
  }
}
