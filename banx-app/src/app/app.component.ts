import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { ProblemIndex } from '../../../lib/schema';

declare const problemIndexInitial: ProblemIndex;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public title = 'banx-app';
  public problemIndex$ = new BehaviorSubject(null);

  ngOnInit() {
    this.problemIndex$.next(problemIndexInitial);
  }
}
