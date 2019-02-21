import { Component, OnInit } from '@angular/core';

import { ApiService } from './api.service';
import { ProblemIndex, KeyValPair, Problem } from '../../../lib/schema';

declare const problemIndexInitial: ProblemIndex;
declare const $: Function;

interface StringBag {
  [key: string]: StringBag
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private problemIndex: ProblemIndex;
  private problems: Problem[] = [];
  // state is hierarchical. Keep this diagram in mind when reading this code.
  // state = {
  //   [topic: string]: {
  //     [subtopic: string]: {
  //       [tagKey: string]: {
  //         [tagValue: string] : {}
  //       }
  //     }
  //   }
  // };
  private state: StringBag = {};

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.problemIndex = problemIndexInitial;
  }

  _toggle(superState: StringBag, args: string[]) {
    const arg = args[0];
    if (1 == args.length) {
      if (arg in superState) delete superState[arg];
      else superState[arg] = {};
      return;
    }

    if (!(arg in superState)) {
      superState[arg] = {};
    }
    return this._toggle(superState[arg], args.slice(1));
    
  }

  toggle(...args: string[]) {
    return this._toggle(this.state, args);
  }

  topicId(topicKey: string): string {
    return topicKey;
  }

  subtopicId(topicKey: string, subtopicKey: string) {
    return `${this.topicId(topicKey)}-${subtopicKey}`;
  }

  tagKeyId(topicKey: string, subtopicKey: string, tagKey: string): string {
    return `${this.subtopicId(topicKey, subtopicKey)}-${tagKey}`;
  }

  toggleCollapsed(id: string) {
    $(`#${id}`).collapse('toggle');
  }

  log(...msgs: any[]) {
    console.log(...msgs);
  }

  /**
   * Returns true if and only if every key value pair in tags is in problemTags.
   * @param problemTags tag array to check
   * @param tags: The tags which must all be present.
   */
  containsAllTags(problemTags: KeyValPair[], tags: StringBag): boolean {
    for (let tagKey in tags) {
      for (let tagValue in tags[tagKey]) {
        const index = problemTags.findIndex(problemTag => {
          return problemTag.key == tagKey && problemTag.value == tagValue
        });
        if (index < 0) return false;
      }
    }
    return true;
  }

  selectedProblems(topic: string, subtopic: string, tags: StringBag): string[] {
    const problems = this.problemIndex.index[topic][subtopic].problems;
    const selected: string[] = [];
    for (let problemId in problems) {
      if (this.containsAllTags(problems[problemId], tags)) selected.push(problemId);
    }
    return selected;
  }

  allSelectedProblems(): string[] {
    const selected: string[] = [];
    for (let topic in this.state) {
      const subtopics = this.state[topic];
      for (let subtopic in subtopics) {
        const tags = subtopics[subtopic];
        selected.push(...this.selectedProblems(topic, subtopic, tags));
      }
    }
    return selected;
  }

  getProblems() {
    this.api.getProblems(this.allSelectedProblems())
      .subscribe(problems => this.problems = problems);
  }
}
