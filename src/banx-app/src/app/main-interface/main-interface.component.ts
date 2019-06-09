import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';

import { ApiService } from '../api.service';
import { InstanceService } from '../instance.service';
import { ProblemIndex, KeyValPair, Problem } from '../../../../lib/schema';

// this is rendered into the index template
declare const problemIndexInitial: ProblemIndex
declare const MathJax: any // MathJax global object.
declare const $: any // Jquery

interface StringBag {
  [key: string]: StringBag
}

@Component({
  selector: 'app-main-interface',
  templateUrl: './main-interface.component.html',
  styleUrls: ['./main-interface.component.css']
})
export class MainInterfaceComponent implements OnInit {
  private problemIndex: ProblemIndex;
  private problems: Problem[] = [];
  private instances: Problem[] = [];
  private query: StringBag = {};
  // This class uses query to keep track of
  // which Problem Query selections have been made.
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
    private api: ApiService,
    private instanceService: InstanceService
  ) { }

  ngOnInit() {
    this.problemIndex = problemIndexInitial;
  }

  _toggle(superState: StringBag, args: string[]): void {
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

  toggleQueryButton(query: StringBag): void {
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

  toggle(...args: string[]) {
    this._toggle(this.query, args);
    this.toggleQueryButton(this.query);
    return;
  }

  /**
   * Returns true if and only if every key value pair in queryTags is in problemTags.
   * @param problemTags tag array to check
   * @param queryTags: The tags which must all be present in the query.
   */
  containsAllTags(problemTags: KeyValPair[], queryTags: StringBag): boolean {
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

  selectProblemsWhere(topic: string, subtopic: string, tags: StringBag): string[] {
    const problems = this.problemIndex.index[topic][subtopic].problems;
    const selection: string[] = [];
    for (let problemId in problems) {
      if (this.containsAllTags(problems[problemId], tags)) selection.push(problemId);
    }
    return selection;
  }

  selectAllProblems(): string[] {
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

  @ViewChild('resultCounter') resultCounter;

  getProblems() {
    this.api.getProblems(this.selectAllProblems())
      .subscribe(problems => {
        this.instances = [];
        this.problems = problems;
        if (this.problems.length > 0) {
          this.resultCounter.nativeElement.classList.remove('invisible');
        }
        else {
          this.resultCounter.nativeElement.classList.add('invisible');
        }
      });
  }

  @ViewChild('instanceDiv') instanceDiv;

  getInstances(problemId: string) {
    this.api.getInstances(problemId)
      .subscribe(instances => {
        this.problems = [];
        this.instances = instances;
        // Re-typeset mathematics on the page.
        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
        // Scroll to the top of the page.
        document.body.scrollTop = document.documentElement.scrollTop = 0;
      })
  }

  selectInstance(instance: Problem) {
    this.instanceService.select(instance);
  }

  deselectInstance(instance: Problem) {
    this.instanceService.deselect(instance);
  }
}
