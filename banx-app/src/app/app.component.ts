import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from './api.service';
import { ProblemIndex, KeyValPair, Problem } from '../../../lib/schema';

// this is rendered into the index template
declare const problemIndexInitial: ProblemIndex
declare const MathJax: any // MathJax global object.

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
  private instances: Problem[] = [];
  private selectedInstances: Problem[] = [];
  private showSelectedInstances: boolean = false;
  // treeState is hierarchical. Keep this diagram in mind when reading this code.
  // treeState = {
  //   [topic: string]: {
  //     [subtopic: string]: {
  //       [tagKey: string]: {
  //         [tagValue: string] : {}
  //       }
  //     }
  //   }
  // };
  private treeState: StringBag = {};

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
    return this._toggle(this.treeState, args);
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
    for (let topic in this.treeState) {
      const subtopics = this.treeState[topic];
      for (let subtopic in subtopics) {
        const tags = subtopics[subtopic];
        selected.push(...this.selectedProblems(topic, subtopic, tags));
      }
    }
    return selected;
  }

  getProblems() {
    this.api.getProblems(this.allSelectedProblems())
      .subscribe(problems => {
        this.instances = [];
        this.problems = problems
      });
  }

  @ViewChild('instanceDiv') instanceDiv;

  getInstances(problemId: string) {
    this.api.getInstances(problemId)
      .subscribe(instances => {
        this.problems = [];
        this.instances = instances;
        MathJax.Hub.Queue(["Typeset", MathJax.Hub])
      })
  }

  selectInstance(instance: Problem) {
    this.selectedInstances.push(instance);
  }

  deselectInstance(instance: Problem) {
    const index = this.selectedInstances.findIndex(inst => inst === instance);
    if (index < 0) {
      console.error(`AppComponent.deselectInstance: failed to find instance.`);
      return;
    }
    this.selectedInstances.splice(index, 1);
  }

  onSubmissionSuccess(response: any) {
    alert('Submission Successful');
    location.reload();
  }

  onSubmissionFailure(err: HttpErrorResponse) {
    console.error(err);
    alert(`Submission Failed:\n${err.error}`);
  }

  submit() {
    if (this.selectedInstances.length <= 0) {
      alert('Select at least one instance before submitting.');
      return;
    }
    this.api.submit(this.selectedInstances).subscribe(
      (response: any) => this.onSubmissionSuccess(response),
      (err: HttpErrorResponse) => this.onSubmissionFailure(err)
    );
  }
}
