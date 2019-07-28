import { Component, Input, ViewChild } from '@angular/core';
import { AngularMonacoEditorComponent } from 'angular-monaco-editor';
import { BehaviorSubject } from 'rxjs';

import { ProblemsService } from '../problems.service';
import { NotificationService } from '../notification.service';
import { Problem } from '../../../../lib/schema';

@Component({
  selector: 'app-problem',
  templateUrl: './problem.component.html',
  styleUrls: ['./problem.component.css']
})
export class ProblemComponent {
  @Input() problem: Problem;

  private editMode$ = new BehaviorSubject(false);
  private problemBackup: Problem;

  private editorOptions = Object.freeze({
    language: 'latex',
    minimap: { enabled: false }
  });

  constructor(
    private problemsService: ProblemsService,
    private notifications: NotificationService
  ) { }

  @ViewChild('codeInput') private codeInput: AngularMonacoEditorComponent;

  private onEditorInit(event: any) {
    /* Place any code that needs to run after the monaco editor is loaded here. */
  }

  private showEditor() {
    this.problemBackup = this.problem.copy();
    this.editMode$.next(true);
  }

  private saveChanges() {
    this.notifications.showLoading('Saving problem...');
    this.problemsService.upsert(this.problem)
      .subscribe(problem => {
        this.problem = problem;
        this.notifications.showSuccess('Problem saved successfully.');
      }, err => {
        console.error(err);
        this.notifications.showError('An error occured while trying to save a problem.');
      });
    this.editMode$.next(false);
  }

  private cancelChanges() {
    this.problem = this.problemBackup;
    this.editMode$.next(false);
  }
}
