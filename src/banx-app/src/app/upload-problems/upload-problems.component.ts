import { Component, ViewChild } from '@angular/core';

import { ProblemsService } from '../problems.service';
import { NotificationService } from '../notification.service';
import { problemStringParser } from '../../../../lib/common';

@Component({
  selector: 'app-upload-problems',
  templateUrl: './upload-problems.component.html',
  styleUrls: ['./upload-problems.component.css']
})
export class UploadProblemsComponent {
  constructor(
    private problemsService: ProblemsService,
    private notificationService: NotificationService
  ) { }

  @ViewChild('fileInput', { static: true }) private fileInput;

  private uploadFiles() {
    const files: FileList = (<any>this.fileInput.nativeElement).files;
    for (let k = 0, numFiles = files.length; k < numFiles; ++k) {
      const reader = new FileReader();
      reader.addEventListener('load', async () => {
        this.notificationService.showLoading(`Uploading ${files[k].name}`);
        const problems = problemStringParser(reader.result as string);
        let noError = true;
        for (let problem of problems) {
          try {
            await this.problemsService.create(problem).toPromise();
          }
          catch (err) {
            this.notificationService.showError(`An error occured while uploading ${files[k].name}`);
            console.error(err);
            noError = false;
            break;
          }
        }
        if (noError) this.notificationService.showSuccess(`Finished uploading ${files[k].name}`);
      });
      reader.readAsText(files[k]);
    }
  }
}