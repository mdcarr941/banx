import { Component, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Problem } from '../../../../lib/schema';
import { ProblemsService } from '../problems.service';
import { QueryComponent } from '../query/query.component';
import { enterKeyCode } from '../app.component';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-tag-query',
  templateUrl: './tag-query.component.html',
  styleUrls: ['./tag-query.component.css']
})
export class TagQueryComponent {
  @ViewChild('tagsInput') private tagsInput;
  private problems$ = new BehaviorSubject<Problem[]>([]);
  static readonly whiteSpaceRgx = /[\s]+/;

  constructor(
    private problems: ProblemsService,
    private notifcations: NotificationService
  ) { }

  @ViewChild('queryComponent') queryComponent: QueryComponent;

  private searchTags() {
    const queryInput: string = this.tagsInput.nativeElement.value;
    if (queryInput.length == 0) return;

    this.notifcations.showLoading('Getting problems.');
    this.problems.find(queryInput.split(TagQueryComponent.whiteSpaceRgx))
      .subscribe(problems => {
        this.notifcations.showSuccess('Finished getting problems.');
        this.problems$.next(problems);
      },
      err => {
        this.notifcations.showError('Failed to get problems.');
        console.error(err);
      });
  }

  private onKeyUp(event: any) {
    if (event.keyCode === enterKeyCode) this.searchTags();
  }
}
