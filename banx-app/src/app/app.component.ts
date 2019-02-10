import { Component } from '@angular/core';
import { ProblemIndex } from '../../../lib/schema';

declare const problemIndex: ProblemIndex;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'banx-app';
}
