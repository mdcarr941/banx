import { Component, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Problem } from '../../../../lib/schema';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-tag-query',
  templateUrl: './tag-query.component.html',
  styleUrls: ['./tag-query.component.css']
})
export class TagQueryComponent {
  @ViewChild('tagsInput') private tagsInput;
  private problems$ = new BehaviorSubject<Problem[]>([]);
  static readonly notWhiteSpaceRgx = /[^\s]+/g;

  constructor(private api: ApiService) { }

  searchTags() {
    const queryInput = this.tagsInput.nativeElement.value;
    const query: string[] = [];
    let match = TagQueryComponent.notWhiteSpaceRgx.exec(queryInput);
    while (match) {
      query.push(match[0]);
      match = TagQueryComponent.notWhiteSpaceRgx.exec(queryInput);
    }
    console.log(query);
  }
}
