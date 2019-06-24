import { Component, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Problem } from '../../../../lib/schema';
import { ApiService } from '../api.service';

const enterKeyCode = 13; // The key code of the enter key.

@Component({
  selector: 'app-tag-query',
  templateUrl: './tag-query.component.html',
  styleUrls: ['./tag-query.component.css']
})
export class TagQueryComponent {
  @ViewChild('tagsInput') private tagsInput;
  private problems$ = new BehaviorSubject<Problem[]>([]);
  static readonly whiteSpaceRgx = /[\s]+/;

  constructor(private api: ApiService) { }

  private searchTags() {
    const queryInput: string = this.tagsInput.nativeElement.value;
    this.api.findProblems(queryInput.split(TagQueryComponent.whiteSpaceRgx))
      .subscribe(problems => this.problems$.next(problems));
  }

  private onKeyUp(event: any) {
    if (event.keyCode === enterKeyCode) this.searchTags();
  }
}
