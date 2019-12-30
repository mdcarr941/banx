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
  private readonly selectedRepo$ = new BehaviorSubject<Repository>(null);
  private readonly currentDir$ = new EventEmitter<string>();
  private readonly selectedFile$ = new BehaviorSubject<string>(null);
  private readonly editorOptions = Object.freeze({
    theme: 'vs-dark',
    language: 'latex'
  });

  private editorText: string;

  constructor(
    private readonly repoService: RepoService,
    private readonly notifcation: NotificationService
  ) {}

  public ngOnInit() {
    this.repoService.list().subscribe(repos => this.repos$.next(repos));

    this.selectedRepo$
    .pipe(
      takeUntil(this.destroyed$),
      filter(repo => !!repo)
    )
    .subscribe(async repo => {
      this.notifcation.showLoading(`Updating ${repo.name} from the server...`);
      try {
        await this.repoService.updateFromServer(repo);
      }
      catch (err) {
        this.notifcation.showError(`Failed to update ${repo.name}!`);
        console.error(err);
      }
      this.notifcation.showSuccess('Finished updating');
      this.currentDir$.next(repo.dir);
      this.selectedFile$.next(null);
    });

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

  private async saveEdits(): Promise<void> {
    const filepath = this.selectedFile$.value;
    if (!filepath) {
      this.notifcation.showError('Can\'t save, no file has been selected.');
    }
    else {
      this.notifcation.showLoading('Saving changes...');
      await echo(filepath, this.editorText, true);
      this.notifcation.showSuccess('Saved changes.');
    }
  }

  private displayName(filepath: string): string {
    const repo = this.selectedRepo$.value;
    if (!repo) return filepath;
    else return repo.name + filepath.slice(repo.dir.length);
  }

  private async rename(): Promise<void> {

  }
}
