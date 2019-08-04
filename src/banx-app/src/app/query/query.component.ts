import { Component, OnInit, ViewChild, Output, Input, OnDestroy, EventEmitter } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { InstanceService } from '../instance.service';
import { ProblemListComponent } from '../problem-list/problem-list.component';
import { Problem } from '../../../../lib/schema';

declare let MathJax: any;

@Component({
  selector: 'app-query',
  templateUrl: './query.component.html',
  styleUrls: ['./query.component.css']
})
export class QueryComponent implements OnInit, OnDestroy {
  @Input() title = "Query Component";
  @Input() problems$: Observable<Problem[]>;
  @Output() problemsShown$: Observable<boolean>;
  @Output() removeProblem$ = new EventEmitter<Problem>();

  private problemSub: Subscription;

  constructor(
    private instanceService: InstanceService
  ) { }
  
  @ViewChild('problemList') problemList: ProblemListComponent;
  private removeProblemSub: Subscription;

  ngOnInit() {
    this.problemsShown$ = this.problemList.problemsShown$;
    this.removeProblemSub = this.problemList.removeProblem$
      .subscribe(problem => this.removeProblem$.next(problem));
    this.problemSub = this.problems$.subscribe(problems => {
      if (problems.length > 0) this.showResultCounter();
      else this.hideResultCounter();
    })
  }

  ngOnDestroy() {
    this.problemSub.unsubscribe();
    this.removeProblemSub.unsubscribe();
  }

  @ViewChild('resultCounter') resultCounter;

  private showResultCounter() {
    if (!this.resultCounter) return;
    this.resultCounter.nativeElement.classList.remove('invisible');
  }

  private hideResultCounter() {
    if (!this.resultCounter) return;
    this.resultCounter.nativeElement.classList.add('invisible');
  }
}
