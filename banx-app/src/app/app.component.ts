import { Component, OnInit } from '@angular/core';

import { ApiService } from './api.service';
import { ProblemIndex, KeyValPair, Problem } from '../../../lib/schema';

declare const problemIndexInitial: ProblemIndex;
declare const $: Function;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  //private title = 'banx-app';
  private problemIndex: ProblemIndex;
  private topic: string;
  private subtopic: string;
  private tags: {[key: string]: string} = {};
  private problems: Problem[] = [];

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.problemIndex = problemIndexInitial;
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

  log(...msgs: string[]) {
    console.log(msgs.join(' '));
  }

  selectTopic(topic: string) {
    if (this.topic && topic != this.topic) {
      delete this.subtopic;
      this.tags = {};
    }
    this.topic = topic;
  }

  selectSubtopic(subtopic: string) {
    if (this.subtopic && subtopic != this.subtopic) {
      this.tags = {};
    }
    this.subtopic = subtopic;
  }

  toggleTag(tagKey: string, tagValue: string) {
    if (tagKey in this.tags) {
      delete this.tags[tagKey];
    }
    else {
      this.tags[tagKey] = tagValue;
    }
  }

  /**
   * Returns true if and only if every key value pair in this.tags is in problemTags.
   * @param problemTags tag array to check
   */
  containsAllTags(problemTags: KeyValPair[]): boolean {
    for (let tagKey in this.tags) {
      const tagValue = this.tags[tagKey];
      const index = problemTags.findIndex(problemTag => {
        return problemTag.key == tagKey && problemTag.value == tagValue
      });
      if (index < 0) return false;
    }
    return true;
  }

  selectedProblems(): string[] {
    const problems = this.problemIndex.index[this.topic][this.subtopic].problems;
    const selected: string[] = [];
    for (let problemId in problems) {
      if (this.containsAllTags(problems[problemId])) selected.push(problemId);
    }
    return selected;
  }

  getProblems() {
    this.api.getProblems(this.selectedProblems())
      .subscribe(problems => this.problems = problems);
  }
}
