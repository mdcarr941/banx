import { Component } from '@angular/core';

@Component({
  selector: 'app-upload-problems',
  templateUrl: './upload-problems.component.html',
  styleUrls: ['./upload-problems.component.css']
})
export class UploadProblemsComponent {
  constructor() { }

  onFileInputChange(event: Event) {
    const files = (<any>event.target).files;
    console.log(files);
  }
}
