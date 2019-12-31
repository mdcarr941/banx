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

  constructor(
    private readonly repoService: RepoService,
    private readonly notifcation: NotificationService
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

    // Collapse each DirViewComponent except the one
    // for repo.dir.
    this.collapseAllExcept$.next(repo.dir);

    this.notifcation.showLoading(`Updating ${repo.name} from the server...`);
    try {
      await this.repoService.updateFromServer(repo);
    }
    catch (err) {
      this.notifcation.showError(`Failed to update ${repo.name}!`);
      console.error(err);
    }
    this.notifcation.showSuccess('Finished updating');
    this.selectedFile$.next(null);
  }

  private async saveEdits(): Promise<void> {
    const filepath = this.selectedFile$.value;
    if (!filepath) {
      // The way the template is structured this should never happen,
      // but this is here just in case.
      this.notifcation.showError('Can\'t save, no file has been selected.');
    }
    else {
      this.notifcation.showLoading('Saving changes...');
      await echo(filepath, this.editorText, true);
      this.notifcation.showSuccess('Saved changes.');
    }
  }

  private async rename(): Promise<void> {

  }
}
