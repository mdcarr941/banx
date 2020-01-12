import { Component, OnInit, ViewChild, Output, Input, OnDestroy, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { InstanceService } from '../instance.service';
import { ProblemListComponent } from '../problem-list/problem-list.component';
import { Problem } from '../../../../lib/schema';
import { takeUntil } from 'rxjs/operators';

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

  @ViewChild('resultCounter') resultCounter;
  @ViewChild('problemList') problemList: ProblemListComponent;

  private readonly destroyed$ = new EventEmitter<null>();

  constructor(
    public readonly instanceService: InstanceService
  ) { }

  ngOnInit() {
    this.problemsShown$ = this.problemList.problemsShown$;
    
    this.problemList.removeProblem$.pipe(takeUntil(this.destroyed$))
      .subscribe(problem => this.removeProblem$.next(problem));
  }

  ngOnDestroy() {
    this.destroyed$.next(null);
  }
}
