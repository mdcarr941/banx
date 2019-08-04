import { Component, Output, Input, EventEmitter } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

import { Problem } from '../../../../lib/schema';
import { ProblemsService } from '../problems.service';
import { InstanceService } from '../instance.service';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-problem-list',
  templateUrl: './problem-list.component.html',
  styleUrls: ['./problem-list.component.css']
})
export class ProblemListComponent {
  @Input() problems$: BehaviorSubject<Problem[]>;

  private readonly _problemsShown$ = new BehaviorSubject(true);

  @Output() problemsShown$: Observable<boolean> = this._problemsShown$;
  @Output() removeProblem$ = new EventEmitter<Problem>();

  constructor(
    private api: ProblemsService,
    private instanceService: InstanceService,
    private notifications: NotificationService
  ) { }

  private getInstances(problemId: string) {
    this.notifications.showLoading('Getting instances.');
    this.api.getInstances(problemId)
      .subscribe(instances => {
        this.notifications.showSuccess('Finished getting instances.');
        this.problems$.next(instances);
        this._problemsShown$.next(false);
        document.body.scrollTop = document.documentElement.scrollTop = 0;
      }, err => {
        this.notifications.showError('Failed to get instances.');
        console.error(err);
      });
  }
}
