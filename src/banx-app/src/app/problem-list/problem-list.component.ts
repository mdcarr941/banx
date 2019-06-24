import { Component, Output, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Problem } from '../../../../lib/schema';
import { ProblemsService } from '../problems.service';
import { InstanceService } from '../instance.service';

@Component({
  selector: 'app-problem-list',
  templateUrl: './problem-list.component.html',
  styleUrls: ['./problem-list.component.css']
})
export class ProblemListComponent {
  @Input() problems$: BehaviorSubject<Problem[]>;
  @Output() problemsShown$ = new BehaviorSubject<boolean>(true);

  constructor(
    private api: ProblemsService,
    private instanceService: InstanceService
  ) { }

  private getInstances(problemId: string) {
    this.api.getInstances(problemId)
      .subscribe(instances => {
        this.problems$.next(instances);
        this.problemsShown$.next(false);
        document.body.scrollTop = document.documentElement.scrollTop = 0;
      })
  }
}
