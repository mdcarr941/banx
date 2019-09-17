import { Component, ViewChild, OnInit, EventEmitter } from '@angular/core';

import { ProblemsService } from '../problems.service';
import { InstanceService } from '../instance.service';
import { KeyValPair, Problem } from '../../../../lib/schema';
import { forEach } from '../../../../lib/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { QueryComponent } from '../query/query.component';
import { NotificationService } from '../notification.service';

interface StringBag {
  [key: string]: StringBag
}

interface QueryNode {
  [key: string]: {selected: boolean, entries: QueryNode}
}

@Component({
  selector: 'app-problem-query',
  templateUrl: './problem-query.component.html',
  styleUrls: ['./problem-query.component.css']
})
export class ProblemQueryComponent implements OnInit {
  private readonly problems$ = new BehaviorSubject<Problem[]>(null);
  private query: StringBag = {};
  private queryRoot: QueryNode = {};
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
  private readonly topics$ = new EventEmitter<string[]>();
  private subtopicCache: {[topic: string]: Observable<string[]>} = {};
  private tagCache: {[topic: string]: {[subtopic: string]: Observable<KeyValPair[]>} } = {};

  @ViewChild('queryButton') queryButton;
  @ViewChild('queryComponent') queryComponent: QueryComponent;

  constructor(
    private problems: ProblemsService,
    private instanceService: InstanceService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.problems.getTopics()
      .subscribe(this.topics$);
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

  private _toggleNew(currentNode: QueryNode, keysToToggle: string[]): void {
    if (keysToToggle.length === 0) return;

    const currentKey = keysToToggle[0];
    if (1 == keysToToggle.length) {
      if (currentKey in currentNode) {
        const selected = currentNode[currentKey].selected;
        currentNode[currentKey].selected = !selected;
      }
      else {
        currentNode[currentKey] = {selected: true, entries: {}};
      }
    }
    else {
      if (!(currentKey in currentNode)) {
        currentNode[currentKey] = {selected: true, entries: {}};
      }
      this._toggleNew(currentNode[currentKey].entries, keysToToggle.slice(1));
    }
  }

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

  private queryButtonDisabled(): void {
  }

  private toggle(...args: string[]): void {
    this._toggle(this.query, args);
    this.toggleQueryButton(this.query);
  }

  private toggleNew(...args: string[]): void {
    this._toggleNew(this.queryRoot, args);
    //this.toggleQueryButton(t)
  }

  private compileQuery(): KeyValPair[] {
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


  private getProblems(): void {
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
    this.problems.getTopics().subscribe(topics => {
      this.query = {};
      this.topics$.next(topics);
      this.subtopicCache = {};
      this.tagCache = {};
    });
  }

  public getSubtopics(topic: string): Observable<string[]> {
    if (!this.subtopicCache[topic]) {
      this.subtopicCache[topic] = this.problems.getSubtopics(topic);
    }
    return this.subtopicCache[topic];
  }

  public getTags(topic: string, subtopic: string): Observable<KeyValPair[]> {
    if (!this.subtopicCache[topic]) (<any>this.subtopicCache[topic]) = {};
    if (!this.subtopicCache[topic][subtopic]) {
      this.subtopicCache[topic][subtopic] = this.problems.getTags(topic, subtopic);
    }
    return this.subtopicCache[topic][subtopic];
  }
}
