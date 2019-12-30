import { Component, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { takeUntil } from 'rxjs/operators';

import { RepoService, Repository, lsStats } from '../repo.service';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.css']
})
export class CourseComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new EventEmitter<void>();
  private readonly repos$ = new EventEmitter<Repository[]>();
  private readonly selectedRepo$ = new EventEmitter<Repository>();
  private readonly currentDir$ = new EventEmitter<string>();
  private readonly selectedFile$ = new EventEmitter<string>();

  constructor(private readonly repoService: RepoService) {}

  public ngOnInit() {
    this.repoService.list().subscribe(repos => this.repos$.next(repos));

    this.selectedRepo$
    .pipe(takeUntil(this.destroyed$))
    .subscribe(async (repo: Repository) => {
      await this.repoService.updateFromServer(repo);
      this.currentDir$.next(repo.dir);
      this.selectedFile$.next(null);
    });
  }

  public ngOnDestroy() {
    this.destroyed$.next();
  }
}
