import { Component, OnInit, ViewChild } from '@angular/core';

import { ProblemsService } from '../problems.service';
import { InstanceService } from '../instance.service';
import { KeyValPair, Problem } from '../../../../lib/schema';
import { forEach } from '../../../../lib/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { QueryComponent } from '../query/query.component';
import { NotificationService } from '../notification.service';

// This is rendered into the index template by the index controller.
declare const topics: string[];

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
  private topics: string[] = topics;
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

  ngOnInit() { }

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

  private compileQuery() {
    const output = [];
    forEach(this.query, (topic: string, subtopics: StringBag) => {
      output.push({key: 'Topic', value: topic});
      forEach(subtopics, (subtopic: string, tags: StringBag) => {
        output.push({key: 'Sub', value: subtopic});
        forEach(tags, (tagKey: string, tagValues: StringBag) => {
          forEach(tagValues, (tagValue: string) => {
            output.push({key: tagKey, value: tagValue});
          });
        }) 
      });
    });
    return output;
  }

  @ViewChild('queryComponent') queryComponent: QueryComponent;

  private getProblems() {
    this.notificationService.showLoading('Getting problems.');
    this.problems.findKeyValue(this.compileQuery())
      .subscribe(problems => {
        this.notificationService.showSuccess('Finished gettings problems.');
        this.problems$.next(problems);
      }, err => {
        this.notificationService.showError('Failed to get problems.');
        console.error(err);
      });
  }

  private removeProblem(problem: Problem) {
    this.problems$.next(this.problems$.value.filter(p => p.idStr !== problem.idStr));
  }

  private subtopicCache: {[topic: string]: Observable<string[]>} = {};

  private getSubtopics(topic: string): Observable<string[]> {
    if (!this.subtopicCache[topic]) {
      this.subtopicCache[topic] = this.problems.getSubtopics(topic);
    }
    return this.subtopicCache[topic];
  }

  private tagCache: {[topic: string]: {[subtopic: string]: Observable<KeyValPair[]>} } = {};

  private getTags(topic: string, subtopic: string): Observable<KeyValPair[]> {
    if (!this.subtopicCache[topic]) (<any>this.subtopicCache[topic]) = {};
    if (!this.subtopicCache[topic][subtopic]) {
      this.subtopicCache[topic][subtopic] = this.problems.getTags(topic, subtopic);
    }
    return this.subtopicCache[topic][subtopic];
  }
}
