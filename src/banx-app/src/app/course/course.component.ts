import { Component, EventEmitter, OnInit } from '@angular/core';

import { RepoService, Repository, ls } from '../repo.service';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.css']
})
export class CourseComponent implements OnInit {
  private readonly repos$ = new EventEmitter<Repository[]>();
  private readonly selectedRepo$ = new EventEmitter<Repository>();

  constructor(private readonly repoService: RepoService) {}

  ngOnInit() {
    this.repoService.list().subscribe(repos => this.repos$.next(repos));

    this.selectedRepo$.subscribe(async (repo: Repository) => {
      await this.repoService.updateFromServer(repo);
      console.log(await ls(repo.dir));
    });
  }

  public selectRepo(repo: Repository): void {
    this.selectedRepo$.next(repo);
  }
}
