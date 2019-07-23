import { Component, Input } from '@angular/core';
import { Problem } from '../../../../lib/schema';

@Component({
  selector: 'app-problem',
  templateUrl: './problem.component.html',
  styleUrls: ['./problem.component.css']
})
export class ProblemComponent {
  @Input() problem: Problem;

  private editorOptions = Object.freeze({
    language: 'latex',
    readonly: true
  })

  constructor() { }
}
