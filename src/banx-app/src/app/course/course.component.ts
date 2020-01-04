import { Component, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { RepoService, Repository, cat } from '../repo.service';
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

  private async pull(): Promise<void> {
    const repo = this.selectedRepo$.value;
    this.notification.showLoading(`Updating ${repo.name} from the server...`);
    try {
      await this.repoService.pull(repo);
    }
    catch (err) {
      this.notification.showError(`Failed to update ${repo.name}!`);
      console.error(err);
      return;
    }
    this.notification.showSuccess(`Finished updating ${repo.name}`);
  }

  private async commit(): Promise<void> {
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

  private async renameFile(): Promise<void> {
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
    console.log(`file status is now ${await this.selectedRepo$.value.status(filepath)}`);
  }

  private async dirRenamed(repo: Repository, event: DirRenamed): Promise<void> {
    if (repo.dir === event.oldPath) {
      throw new Error('renameRepo is not implemented!');
    }
  }

  private async dirDeleted(repo: Repository, abspath: string): Promise<void> {
    if (repo.dir === abspath) {
      throw new Error('repository deletion is not implemented!');
    }
  }
}
