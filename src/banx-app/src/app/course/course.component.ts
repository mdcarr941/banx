import { Component, EventEmitter } from '@angular/core';
//import {  }

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.css']
})
export class CourseComponent {
  private repos$ = new EventEmitter();

  constructor() { }
}
