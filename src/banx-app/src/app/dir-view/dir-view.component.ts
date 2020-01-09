import { Component, OnInit, Input, EventEmitter, Output, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Stat } from '@isomorphic-git/lightning-fs';
import { takeUntil, filter } from 'rxjs/operators';

import { lsStats, ls, isdir, Repository, GitStatus } from '../repo.service';
import { urlJoin, basename, dirname } from '../../../../lib/common';
import { NotificationService } from '../notification.service';

class DirInfo {
  public readonly path: string;
  public readonly subdirs: string[] = [];
  public readonly files: string[] = [];
  public readonly fileStatuses: {[name: string]: GitStatus};
  public readonly displayNames: {[name: string]: string};
  public readonly isModified: {[name: string]: boolean};
  public readonly isAdded: {[name: string]: boolean};
  public readonly isDeleted: {[name: string]: boolean};

  constructor(
    stats: {[name: string]: Stat},
    fileStatuses: {[name: string]: GitStatus}
  ) {
    for (let name in stats) {
      if (name.startsWith('.')) continue;

      if (stats[name].isDirectory()) {
        this.subdirs.push(name);
      }
      else this.files.push(name);
    }
    this.subdirs.sort();
    this.files.sort();

    this.fileStatuses = Object.freeze(fileStatuses);

    const displayNames = {};
    for (let name in fileStatuses) {
      displayNames[name] = DirInfo.displayName(name, fileStatuses[name]);
    }
    this.displayNames = Object.freeze(displayNames);

    const isModified = {};
    for (let name in fileStatuses) {
      isModified[name] = fileStatuses[name] === GitStatus.modified;
    }
    this.isModified = Object.freeze(isModified);

    const isAdded = {};
    for (let name in fileStatuses) {
      isAdded[name] = fileStatuses[name] === GitStatus.added;
    }
    this.isAdded = Object.freeze(isAdded);

    const isDeleted = {};
    for (let name in fileStatuses) {
      isDeleted[name] = fileStatuses[name] === GitStatus.deleted;
    }
    this.isDeleted = Object.freeze(isDeleted);
  }

  public static fileStatus(status: string): GitStatus {
    switch (status) {
      case 'modified':
      case '*modified':
        return GitStatus.modified;
      case 'added':
      case '*added':
        return GitStatus.added;
      case '*undeleted':
        return GitStatus.deleted;
      default:
        return GitStatus.unchanged;
    }
  }

  public static modifierCharacter(status: GitStatus): string {
    switch (status) {
      case GitStatus.unchanged: return '';
      case GitStatus.modified: return '*';
      case GitStatus.added: return '+';
      case GitStatus.deleted: return '-';
      default: throw new Error(`Unknown FileStatus: ${status}`);
    }
  }

  public static displayName(name: string, status: GitStatus): string {
    return this.modifierCharacter(status) + name;
  }

  public static async from(path: string, repo?: Repository): Promise<DirInfo> {
    const stats = await lsStats(path);
    if (!repo) {
      const fileStatuses = {};
      for (let name in stats) {
        fileStatuses[name] = GitStatus.unchanged;
      }
      return new DirInfo(stats, fileStatuses);
    }

    const promises: {name: string, promise: Promise<string>}[] = [];
    for (let name in stats) {
      if (stats[name].isFile()) {
        promises.push({
          name,
          promise: repo.status(urlJoin(path, name))
        });
      }
    }
    const outputs = await Promise.all(promises.map(x => x.promise));

    const fileStauses: {[name: string]: GitStatus} = {};
    for (let k = 0; k < outputs.length; k += 1) {
      fileStauses[promises[k].name] = this.fileStatus(outputs[k]);
    }

    return new DirInfo(stats, fileStauses);
  }
}

export class PromiseObject {
  private _resolve: () => void;
  private _reject: (err: Error) => void;

  public readonly completed: Promise<void>
    = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

  public resolve(): void {
    this._resolve();
  }

  public reject(err: Error): void {
    this._reject(err);
  }
}

export class DirRenamed extends PromiseObject {
  public readonly newPath: string;
  constructor(
    public readonly oldPath: string,
    public readonly newName: string
  ) {
    super();
    this.newPath = urlJoin(dirname(oldPath), newName);
  }
}

export class DirDeleted extends PromiseObject {
  constructor(public readonly abspath: string) {
    super();
  }
}

@Component({
  selector: 'app-dir-view',
  templateUrl: './dir-view.component.html',
  styleUrls: ['./dir-view.component.css']
})
export class DirViewComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new EventEmitter<void>();
  private readonly _toggle$ = new EventEmitter<void>();
  private readonly _toggled$ = new EventEmitter<boolean>();
  private readonly _fileSelected$ = new EventEmitter<string>();
  private readonly tree$ = new BehaviorSubject<DirInfo>(null);
  private readonly _collapse$ = new EventEmitter<void>();
  private readonly showRenameModal$ = new EventEmitter<void>();
  private readonly hideRenameModal$ = new EventEmitter<void>();
  private readonly _dirRenamed$ = new EventEmitter<DirRenamed>();
  private readonly _dirDeleted$ = new EventEmitter<DirDeleted>();

  private collapsed: boolean = true;
  private newName: string;

  @Input() public dir: string = '/';
  @Input() public collapse$: Observable<string>;
  @Input() public repo: Repository;
  @Input() public allowEdits = true;
  @Output() public readonly fileSelected$: Observable<string>
    = this._fileSelected$;
  @Output() public readonly toggled$: Observable<boolean>
    = this._toggled$;
  @Output() public readonly dirRenamed$: Observable<DirRenamed>
    = this._dirRenamed$;
  @Output() public readonly dirDeleted$: Observable<DirDeleted>
    = this._dirDeleted$;

  constructor(private readonly notification: NotificationService) { }

  public ngOnInit() {
    if (this.repo) {
      this.repo.refresh$.pipe(
        takeUntil(this.destroyed$)
      )
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

    this._toggled$.pipe(takeUntil(this.destroyed$))
    .subscribe(collapsed => this.collapsed = collapsed);

    this.showRenameModal$.pipe(takeUntil(this.destroyed$))
    .subscribe(() => this.newName = basename(this.dir));
  }

  public ngOnDestroy() {
    this.destroyed$.next();
  }

  private async refresh(): Promise<void> {
    if (await isdir(this.dir)) {
      this.tree$.next(await DirInfo.from(this.dir, this.repo));
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
    await this.repo.touch(this.fullPath(filename));
  }

  private async newDir(): Promise<void> {
    const dirname = this.uniqueName(
      'NewDir',
      await ls(this.dir)
    );
    await this.repo.mkdir(this.fullPath(dirname));
  }

  private selectFile(filename: string): void {
    this._fileSelected$.next(this.fullPath(filename));
  }

  private basename(path: string): string {
    return basename(path);
  }

  private async renameDir(): Promise<void> {
    this.hideRenameModal$.next();
    const event = new DirRenamed(this.dir, this.newName);
    this._dirRenamed$.next(event);
    try {
      await event.completed;
    }
    catch (err) {
      return;
    }
    this.dir = event.newPath;
    this.refresh();
  }

  private async deleteDir(): Promise<void> {
    if (!confirm(`Are you sure you want to delete '${this.dir}'?`)) return;
    this._dirDeleted$.next(new DirDeleted(this.dir));
  }

  private async subRenamed(event: DirRenamed): Promise<void> {
    this._dirRenamed$.next(event);
    try {
      await event.completed;
    }
    catch (err) {
      return;
    }
    this.refresh();
  }

  private async subDeleted(event: DirDeleted): Promise<void> {
    this._dirDeleted$.next(event);
    try {
      await event.completed;
    }
    catch (err) {
      return;
    }
    this.refresh();
  }
}
