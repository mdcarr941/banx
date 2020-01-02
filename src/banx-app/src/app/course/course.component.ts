import { Component, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { RepoService, Repository, cat, echo, mv, rm } from '../repo.service';
import { NotificationService } from '../notification.service';
import { dirname, basename } from '../../../../lib/common';
import { DirRenamed } from '../dir-view/dir-view.component';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.css']
})
export class CourseComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new EventEmitter<void>();
  private readonly repos$ = new EventEmitter<Repository[]>();
  private readonly selectedRepo$ = new BehaviorSubject<Repository>(null);
  private readonly selectedFile$ = new BehaviorSubject<string>(null);
  private readonly editorOptions = Object.freeze({
    theme: 'vs-dark',
    language: 'latex'
  });
  private readonly collapseAllExcept$ = new EventEmitter<string>();
  private readonly showRenameModal$ = new EventEmitter<void>();
  private readonly hideRenameModal$ = new EventEmitter<void>();

  private editorText: string;
  private newName: string;

  constructor(
    private readonly repoService: RepoService,
    private readonly notification: NotificationService
  ) {}

  public ngOnInit() {
    this.repoService.list().subscribe(repos => this.repos$.next(repos));

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
  }

  public ngOnDestroy() {
    this.destroyed$.next();
  }

  private async toggleRepo(repo: Repository, collapsed: boolean): Promise<void> {
    if (collapsed) {
      if (repo === this.selectedRepo$.value) {
        // If the selectedRepo has been collapsed then it should be
        // deselected.
        this.selectedRepo$.next(null);
      }
      return;
    };

    this.selectedRepo$.next(repo);
    // Collapse each DirViewComponent except the one
    // for repo.dir.
    this.collapseAllExcept$.next(repo.dir);

    this.notification.showLoading(`Updating ${repo.name} from the server...`);
    try {
      await this.repoService.updateFromServer(repo);
    }
    catch (err) {
      this.notification.showError(`Failed to update ${repo.name}!`);
      console.error(err);
      return;
    }
    this.notification.showSuccess(`Finished updating ${repo.name}`);
  }

  private async saveEdits(): Promise<void> {
    const filepath = this.selectedFile$.value;
    if (!filepath) {
      // The way the template is structured this should never happen.
      // This is here just in case.
      this.notification.showError('Can\'t save, no file has been selected.');
    }
    else {
      this.notification.showLoading('Saving changes...');
      await echo(filepath, this.editorText, true);
      this.notification.showSuccess('Saved changes.');
    }
  }

  private showRenameModal(): void {
    this.newName = basename(this.selectedFile$.value);
    this.showRenameModal$.next();
  }

  private async rename(): Promise<void> {
    this.hideRenameModal$.next();
    const oldPath = this.selectedFile$.value
    const newPath = dirname(oldPath) + '/' + this.newName;
    try {
      await mv(oldPath, newPath);
      await this.selectedRepo$.value.remove(oldPath);
    }
    catch (err) {
      this.notification.showError(`failed to rename '${oldPath}'.`);
      console.error(err);
      return;
    }
    this.selectedFile$.next(newPath);
    this.selectedRepo$.value.refreshed$.next();
  }

  private async saveToServer(): Promise<void> {
    this.notification.showLoading(`Saving ${this.selectedRepo$.value.name} to the server...`);
    try {
      await this.repoService.commit(this.selectedRepo$.value);
    }
    catch (err) {
      this.notification.showError(`Failed to save ${this.selectedRepo$.value.name}!`);
      console.error(err);
      return;
    }
    this.notification.showSuccess(`Finished saving ${this.selectedRepo$.value.name}.`);
  }

  private async deleteSelectedFile(): Promise<void> {
    const filepath = this.selectedFile$.value;
    if (!confirm(`Are you sure you want to delete '${filepath}'?`)) return;

    this.notification.showLoading(`Deleting '${filepath}'...`);
    try {
      await rm(filepath);
      await this.selectedRepo$.value.remove(filepath);
    }
    catch (err) {
      this.notification.showError(`Failed to delete '${filepath}'!`);
      console.error(err);
      return;
    }
    this.notification.showSuccess(`Finished deleting '${filepath}'.`);

    this.selectedRepo$.value.refreshed$.next();
  }

  private async dirRenamed(repo: Repository, event: DirRenamed): Promise<void> {
    try {
      await repo.remove(event.oldPath);
      await repo.add(event.newPath);
    }
    catch (err) {
      this.notification.showError(`Failed to rename '${event.oldPath}'!`);
      console.error(err);
      await mv(event.newPath, event.oldPath);
      repo.refreshed$.next();
      return;
    }
    
    this.notification.showSuccess(`Renamed '${event.oldPath}' to '${event.newPath}'.`);
  }
}
