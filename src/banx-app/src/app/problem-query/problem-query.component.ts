import { Component, OnInit, ViewChild } from '@angular/core';

import { ProblemsService } from '../problems.service';
import { InstanceService } from '../instance.service';
import { ProblemIndex, KeyValPair, Problem } from '../../../../lib/schema';
import { BehaviorSubject } from 'rxjs';
import { QueryComponent } from '../query/query.component';
import { NotificationService } from '../notification.service';

// this is rendered into the index template
declare const problemIndexInitial: ProblemIndex
//declare const MathJax: any // MathJax global object.

interface StringBag {
  [key: string]: StringBag
}

@Component({
  selector: 'app-problem-query',
  templateUrl: './problem-query.component.html',
  styleUrls: ['./problem-query.component.css']
})
export class ProblemQueryComponent implements OnInit {
  private problems$ = new BehaviorSubject<Problem[]>([]);
  private problemIndex: ProblemIndex;
  private query: StringBag = {};
  // This class uses query to keep track of
  // which `Problem Query` selections have been made.
  // It looks like this:
  // query = {
  //   [topic: string]: {
  //     [subtopic: string]: {
  //       [tagKey: string]: {
  //         [tagValue: string] : {}
  //       }
  //     }
  //   }
  // };

  constructor(
    private problems: ProblemsService,
    private instanceService: InstanceService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.problemIndex = problemIndexInitial;
  }

  private _toggle(superState: StringBag, args: string[]): void {
    const arg = args[0];
    if (1 == args.length) {
      if (arg in superState) delete superState[arg];
      else superState[arg] = {};
      return;
    }

    if (!(arg in superState)) {
      superState[arg] = {};
    }
    this._toggle(superState[arg], args.slice(1));
    return
    
  }

  @ViewChild('queryButton') queryButton;

  private toggleQueryButton(query: StringBag): void {
    // The query is ready if there is at least one (topic, subtopic) pair.
    for (let topic in query) {
      const subtopic = query[topic];
      for (let tagKey in subtopic) {
        if (subtopic[tagKey]) {
          this.queryButton.nativeElement.disabled = false;
          return
        }
      }
    }
    this.queryButton.nativeElement.disabled = true;
  }

  private toggle(...args: string[]) {
    this._toggle(this.query, args);
    this.toggleQueryButton(this.query);
    return;
  }

  /**
   * Returns true if and only if every key value pair in queryTags is in problemTags.
   * @param problemTags tag array to check
   * @param queryTags: The tags which must all be present in the query.
   */
  private containsAllTags(problemTags: KeyValPair[], queryTags: StringBag): boolean {
    for (let queryKey in queryTags) {
      for (let queryValue in queryTags[queryKey]) {
        const index = problemTags.findIndex(problemTag => {
          return problemTag.key == queryKey && problemTag.value == queryValue
        });
        if (index < 0) return false;
      }
    }
    return true;
  }

  private selectProblemsWhere(topic: string, subtopic: string, tags: StringBag): string[] {
    const problems = this.problemIndex.index[topic][subtopic].problems;
    const selection: string[] = [];
    for (let problemId in problems) {
      if (this.containsAllTags(problems[problemId], tags)) selection.push(problemId);
    }
    return selection;
  }

  private selectAllProblems(): string[] {
    const selection: string[] = [];
    for (let topic in this.query) {
      const subtopics = this.query[topic];
      for (let subtopic in subtopics) {
        const tags = subtopics[subtopic];
        selection.push(...this.selectProblemsWhere(topic, subtopic, tags));
      }
    }
    return selection;
  }

  @ViewChild('queryComponent') queryComponent: QueryComponent;

  private getProblems() {
    this.notificationService.showLoading('Getting problems.');
    this.problems.get(this.selectAllProblems())
      .subscribe(problems => {
        this.notificationService.showSuccess('Finished gettings problems.');
        this.problems$.next(problems);
      }, err => {
        this.notificationService.showError('Failed to get problems.');
        console.error(err);
      });
  }
}
