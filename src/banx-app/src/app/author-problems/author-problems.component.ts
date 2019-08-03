import { Component } from '@angular/core';

import { Problem } from '../../../../lib/schema';
import { ProblemsService } from '../problems.service';
import { NotificationService } from '../notification.service';
import { parseTagString } from '../../../../lib/common';

@Component({
  selector: 'app-author-problems',
  templateUrl: './author-problems.component.html',
  styleUrls: ['./author-problems.component.css']
})
export class AuthorProblemsComponent {
  private problem = new Problem();

  private readonly editorOptions = Object.freeze({
    language: 'LaTeX',
    minimap: { enabled: false }
  });

  constructor(
    private problemsService: ProblemsService,
    private notificationService: NotificationService
  ) { }

  private tagsString: string = "";

  private submitProblem() {
    if (!this.problem.content || this.problem.content.length <= 0) {
      this.notificationService.showError('Please add content to the problem before submitting it.');
      return;
    }
    this.problem.tags = parseTagString(this.tagsString);
    if (this.tagsString.length <= 0 || this.problem.tags.length <= 0) {
      this.notificationService.showError('You must add at least one tag to the problem.');
      return;
    }

    this.notificationService.showLoading('Uploading your problem');
    this.problemsService.create(this.problem).subscribe(() => {
      this.notificationService.showSuccess('Problem created successfully.')
      this.problem = new Problem();
      this.tagsString = "";
    }, err => {
      this.notificationService.showError('An error occured while creating your problem.');
      console.error(err);
    });
  }
}
