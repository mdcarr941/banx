import { Component, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { RepoService, Repository, cat, lsStats, GitStatus, mv, CommitConflict } from '../repo.service';
import { NotificationService } from '../notification.service';
import { dirname, basename } from '../../../../lib/common';
import { DirRenamed, DirDeleted } from '../dir-view/dir-view.component';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.css']
})
export class CourseComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new EventEmitter<void>();
  public readonly repos$ = new BehaviorSubject<Repository[]>(null);
  public readonly selectedRepo$ = new BehaviorSubject<Repository>(null);
  private readonly repoSelected$ = new EventEmitter<void>();
  public readonly selectedFile$ = new BehaviorSubject<string>(null);
  private readonly editorOptions = Object.freeze({
    theme: 'vs-dark',
    language: 'latex'
  });
  private readonly collapseAllExcept$ = new EventEmitter<string>();
  public readonly showRenameModal$ = new EventEmitter<void>();
  public readonly hideRenameModal$ = new EventEmitter<void>();
  private readonly serverRepos$ = new BehaviorSubject<Repository[]>(null);
  public readonly showNewCourseModal$ = new EventEmitter<void>();
  public readonly hideNewCourseModal$ = new EventEmitter<void>();

  private editorText: string;
  public newName: string;
  public newCourseName: string;

  constructor(
    private readonly repoService: RepoService,
    private readonly notification: NotificationService
  ) {}

  public ngOnInit() {
    this.serverRepos$.pipe(
      takeUntil(this.destroyed$),
      filter(repos => !!repos)
    )
    .subscribe(async repos => {
      this.repos$.next(await Repository.addLocalRepos(repos));
    });

    this.selectedFile$
    .pipe(
      takeUntil(this.destroyed$),
      filter(filepath => !!filepath)
    )
    .subscribe(async filepath => {
      this.editorText = await cat(filepath);
    });

    // Whenever a new repository is selected the selected file
    // should be cleared.
    this.selectedRepo$.pipe(takeUntil(this.destroyed$))
    .subscribe(() => this.selectedFile$.next(null));

    // We require an event emitter to fire every time a new repo
    // is selected so the previous repository refresh handler can
    // be properly unsubscribed (see repo.refresh$ in the subscription below).
    this.selectedRepo$.pipe(
      takeUntil(this.destroyed$),
      filter(repo => !!repo)
    )
    .subscribe(() => this.repoSelected$.next());

    this.selectedRepo$.pipe(
      takeUntil(this.destroyed$),
      filter(repo => !!repo)
    )
    .subscribe(async repo => {
      this.notification.showLoading(`Fetching updates for ${repo.name}...`);
      try {
        await this.repoService.fetch(repo);
      }
      catch (err) {
        this.notification.showError(`Failed to get updates for ${repo.name}!`);
        console.error(err);
        return;
      }
      this.notification.showSuccess(`Finished fetching updates for ${repo.name}.`);

      repo.refresh$.pipe(takeUntil(this.repoSelected$))
      .subscribe(async () => {
        const selectedFile = this.selectedFile$.value;
        if (selectedFile) {
          this.editorText = await cat(selectedFile);
        }
      });
    });

    this.refreshRepos();
  }

  public ngOnDestroy() {
    this.destroyed$.next();
  }

  private refreshRepos(): void {
    this.repoService.list().subscribe(this.serverRepos$);
  }

  private toggleRepo(repo: Repository, collapsed: boolean): void {
    if (collapsed) {
      if (repo === this.selectedRepo$.value) {
        // If the selectedRepo has been collapsed then it should be
        // deselected.
        this.selectedRepo$.next(null);
      }
    }
    else {
      this.selectedRepo$.next(repo);
      // Collapse each DirViewComponent except the one
      // for repo.dir.
      this.collapseAllExcept$.next(repo.dir);
    }
  }

  private async checkout(): Promise<void> {
    const repo = this.selectedRepo$.value;
    this.notification.showLoading(`Checking out the latest version of ${repo.name}...`);
    try {
      await this.repoService.checkout(repo);
    }
    catch (err) {
      this.notification.showError(`Failed to checkout ${repo.name}!`);
      console.error(err);
      return;
    }
    this.notification.showSuccess(`Finished checking out ${repo.name}.`);
  }

  private async commit(): Promise<void> {
    this.notification.showLoading(`Saving ${this.selectedRepo$.value.name} to the server...`);
    try {
      await this.repoService.commit(this.selectedRepo$.value);
    }
    catch (err) {
      if (err.name === CommitConflict.name) {
        this.notification.showError(err.message);
        return;
      }
      else {
        this.notification.showError(`Failed to save ${this.selectedRepo$.value.name}!`);
        console.error(err);
        return;
      }
    }
    this.notification.showSuccess(`Finished saving ${this.selectedRepo$.value.name}.`);
  }

  private async saveEdits(): Promise<void> {
    const filepath = this.selectedFile$.value;
    if (filepath) {
      this.notification.showLoading('Saving changes...');
      await this.selectedRepo$.value.echoTo(filepath, this.editorText, true);
      this.notification.showSuccess('Saved changes.');
    }
    else {
      // The way the template is structured this should never happen.
      // But, I would like to be alerted in the case that it does.
      this.notification.showError('Can\'t save, no file has been selected.');
    }
  }

  private showRenameModal(): void {
    this.newName = basename(this.selectedFile$.value);
    this.showRenameModal$.next();
  }

  public async renameFile(): Promise<void> {
    this.hideRenameModal$.next();
    const oldPath = this.selectedFile$.value
    const newPath = dirname(oldPath) + '/' + this.newName;
    try {
      await this.selectedRepo$.value.mvFile(oldPath, newPath);
    }
    catch (err) {
      this.notification.showError(`failed to rename '${oldPath}'.`);
      console.error(err);
      return;
    }
    this.selectedFile$.next(newPath);
  }

  private async deleteSelectedFile(): Promise<void> {
    const filepath = this.selectedFile$.value;
    if (!confirm(`Are you sure you want to delete '${filepath}'?`)) return;

    this.notification.showLoading(`Deleting '${filepath}'...`);
    try {
      await this.selectedRepo$.value.remove(filepath);
    }
    catch (err) {
      this.notification.showError(`Failed to delete '${filepath}'!`);
      console.error(err);
      return;
    }
    this.notification.showSuccess(`Finished deleting '${filepath}'.`);
  }

  private async dirRenamed(repo: Repository, event: DirRenamed): Promise<void> {
    if (repo.dir === event.oldPath) {
      const oldName = basename(event.oldPath);
      const newName = basename(event.newPath);
      this.notification.showLoading(`Renaming '${oldName}' to '${newName}'...`);
      repo.name = newName;
      this.repoService.upsert(repo).subscribe(
        async () => {
          this.notification.showSuccess(`Finished renaming '${oldName}' to '${newName}'.`);
          await mv(event.oldPath, event.newPath);
          event.resolve();
        },
        err => {
          event.reject(err);
          this.notification.showError(`Failed to rename '${oldName}'!`);
          console.error(err);
        }
      );
    }
    else {
      try {
        await repo.mvDir(event.oldPath, event.newPath, false);
        event.resolve();
      }
      catch (err) {
        event.reject(err);
        this.notification.showError(`Failed to rename '${event.oldPath}' to '${event.newPath}'.`);
        console.error(err);
      }
    }
  }

  private async dirDeleted(repo: Repository, event: DirDeleted): Promise<void> {
    if (repo.dir === event.abspath) {
      this.notification.showLoading(`Deleting ${repo.name}...`);
      try {
        await this.repoService.delete(this.selectedRepo$.value);
        this.repos$.next(this.repos$.value
          .filter(r => r._id !== this.selectedRepo$.value._id)
        );
        this.selectedRepo$.next(null);
        event.resolve();
      }
      catch (err) {
        event.reject(err);
        this.notification.showError(`Failed to delete ${repo.name}!`);
        console.error(err);
        return;
      }
      this.notification.showSuccess(`Finished deleting ${repo.name}.`);
    }
    else {
      try {
        await repo.rmAll(event.abspath);
        event.resolve();
      }
      catch (err) {
        event.reject(err);
        this.notification.showError(`Failed to delete '${event.abspath}'!`);
        console.error(err);
      }
    }
  }

  public newCourse(): void {
    this.hideNewCourseModal$.next();
    const name = this.newCourseName;
    this.newCourseName = null;
    this.notification.showLoading(`Creating a new course named ${name}...`);
    this.repoService.upsert(new Repository({name})).subscribe(
      repo => {
        this.repos$.value.push(repo);
        this.repos$.next(this.repos$.value);
        this.notification.showSuccess(`Finished creating ${name}.`);
      },
      err => {
        this.notification.showError(`Failed to create ${name}!`);
        console.error(err);
      }
    );
  }

  private displayName(repo: Repository): string {
    switch (repo.gitStatus) {
      case GitStatus.added: return '+' + repo.name;
      case GitStatus.deleted: return '-' + repo.name;
      case GitStatus.modified: return '*' + repo.name;
      default: return repo.name;
    }
  }
}
