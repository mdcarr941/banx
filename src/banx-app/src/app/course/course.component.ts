import { Component, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { RepoService, Repository, cat, echo } from '../repo.service';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.css']
})
export class CourseComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new EventEmitter<void>();
  private readonly repos$ = new EventEmitter<Repository[]>();
  private readonly selectedFile$ = new BehaviorSubject<string>(null);
  private readonly editorOptions = Object.freeze({
    theme: 'vs-dark',
    language: 'latex'
  });
  private readonly collapseAllExcept$ = new EventEmitter<string>();

  private editorText: string;
  private selectedRepo: Repository;

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
  }

  public ngOnDestroy() {
    this.destroyed$.next();
  }

  private async toggleRepo(repo: Repository, collapsed: boolean): Promise<void> {
    if (collapsed) return;

    this.selectedRepo = repo;
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
    this.notification.showSuccess('Finished updating');
    this.selectedFile$.next(null);
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

  private async rename(): Promise<void> {

  }

  private async saveToServer(): Promise<void> {
    this.notification.showLoading(`Saving ${this.selectedRepo.name} to the server...`);
    try {
      await this.repoService.commit(this.selectedRepo);
    }
    catch (err) {
      this.notification.showError(`Failed to save ${this.selectedRepo.name}!`);
      console.error(err);
      return;
    }
    this.notification.showSuccess(`Finished saving ${this.selectedRepo.name}.`);
  }
}
