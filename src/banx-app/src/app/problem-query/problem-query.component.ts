import { Component, ViewChild, OnInit, EventEmitter } from '@angular/core';

import { ProblemsService } from '../problems.service';
import { InstanceService } from '../instance.service';
import { KeyValPair, Problem } from '../../../../lib/schema';
import { forEach } from '../../../../lib/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { QueryComponent } from '../query/query.component';
import { NotificationService } from '../notification.service';

interface QueryNode {
  [key: string]: {selected: boolean, entries: QueryNode}
}

@Component({
  selector: 'app-problem-query',
  templateUrl: './problem-query.component.html',
  styleUrls: ['./problem-query.component.css']
})
export class ProblemQueryComponent implements OnInit {
  public readonly problems$ = new BehaviorSubject<Problem[]>(null);
  public readonly topics$ = new EventEmitter<string[]>();
  private subtopicCache: {[topic: string]: Observable<string[]>} = {};
  private tagCache: {[topic: string]: {[subtopic: string]: Observable<KeyValPair[]>} } = {};
  // This class uses queryRoot to keep track of
  // which `Problem Query` selections have been made.
  // It looks like this:
  // queryRoot: {
  //   [topic: string]:
  //     {selected: boolean, entries: {
  //       [subtopic: string]:
  //         {selected: boolean, entries: {
  //           [tagKey: string]:
  //             {selected: boolean, entries: {
  //               [tagValue: string]: {selected: boolean, entries: {}}
  //             }}
  //         }}
  //     }}
  private queryRoot: QueryNode = {};

  @ViewChild('queryComponent') queryComponent: QueryComponent;

  constructor(
    private problems: ProblemsService,
    private instanceService: InstanceService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.problems.getTopics().subscribe(this.topics$);
  }

  private _toggle(currentNode: QueryNode, keysToToggle: string[]): void {
    if (keysToToggle.length === 0) return;

    const currentKey = keysToToggle[0];
    if (1 == keysToToggle.length) {
      if (currentNode.hasOwnProperty(currentKey)) {
        const selected = currentNode[currentKey].selected;
        currentNode[currentKey].selected = !selected;
      }
      else {
        currentNode[currentKey] = {selected: true, entries: {}};
      }
    }
    else {
      if (!currentNode.hasOwnProperty(currentKey)) {
        currentNode[currentKey] = {selected: true, entries: {}};
      }
      this._toggle(currentNode[currentKey].entries, keysToToggle.slice(1));
    }
  }

  // Disable the query button if there is no (topic, subtopic) pair selected.
  public queryButtonDisabled(): boolean {
    for (let topic in this.queryRoot) {
      if (!this.queryRoot[topic].selected) continue;
      const topicEntries = this.queryRoot[topic].entries;
      for (let subtopic in topicEntries) {
        if (topicEntries[subtopic].selected) return false;
      }
    }
    return true;
  }

  private toggle(...args: string[]): void {
    this._toggle(this.queryRoot, args);
  }

  private compileQuery(): KeyValPair[] {
    const output = [];
    forEach(this.queryRoot, (topic: string, topicNode: QueryNode) => {
      if (!topicNode.selected) return;
      output.push({key: 'Topic', value: topic});
      forEach(topicNode.entries, (subtopic: string, subtopicNode: QueryNode) => {
        if (!subtopicNode.selected) return;
        output.push({key: 'Sub', value: subtopic});
        forEach(subtopicNode.entries, (tagKey: string, tagKeyNode: QueryNode) => {
          if (!tagKeyNode.selected) return;
          forEach(tagKeyNode.entries, (tagValue: string, tagValueNode: QueryNode) => {
            if (!tagValueNode.selected) return;
            output.push({key: tagKey, value: tagValue});
          });
        });
      });
    });
    return output;
  }

  public getProblems(): void {
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

  public removeProblem(problem: Problem) {
    this.problems$.next(this.problems$.value.filter(p => p.idStr !== problem.idStr));
    this.problems.getTopics().subscribe(topics => {
      this.queryRoot = {};
      this.topics$.next(topics);
      this.subtopicCache = {};
      this.tagCache = {};
    });
  }

  private getSubtopics(topic: string): Observable<string[]> {
    if (!this.subtopicCache[topic]) {
      this.subtopicCache[topic] = this.problems.getSubtopics(topic);
    }
    return this.subtopicCache[topic];
  }

  private getTags(topic: string, subtopic: string): Observable<KeyValPair[]> {
    if (!this.subtopicCache[topic]) (<any>this.subtopicCache[topic]) = {};
    if (!this.subtopicCache[topic][subtopic]) {
      this.subtopicCache[topic][subtopic] = this.problems.getTags(topic, subtopic);
    }
    return this.subtopicCache[topic][subtopic];
  }
}
