import { Component, Input, ViewChild, OnInit, OnDestroy, DoCheck } from '@angular/core';
import { AngularMonacoEditorComponent } from 'angular-monaco-editor';
import { BehaviorSubject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { ProblemsService } from '../problems.service';
import { NotificationService } from '../notification.service';
import { RemoteUserService } from '../remote-user.service';
import { Problem } from '../../../../lib/schema';
import { parseTagString } from '../../../../lib/common';

declare const MathJax: any;

@Component({
  selector: 'app-problem',
  templateUrl: './problem.component.html',
  styleUrls: ['./problem.component.css']
})
export class ProblemComponent implements OnInit {
  @Input() problem: Problem;

  private editMode$ = new BehaviorSubject(false);

  private readonly editorOptions = Object.freeze({
    language: 'LaTeX',
    minimap: { enabled: false }
  });

  constructor(
    private problemsService: ProblemsService,
    private notifications: NotificationService,
    private remoteUserService: RemoteUserService
  ) { }

  private renderMath() {
    // BADBAD: Using setTimeout is an ugly hack.
    setTimeout(() => MathJax.Hub.Queue(["Typeset", MathJax.Hub]), 200);
  }

  private problem$: BehaviorSubject<Problem>;

  ngOnInit() {
    this.problem$ = new BehaviorSubject(this.problem);
    this.renderMath();
  }

  ngOnDestroy() {
    this.problem$.complete();
  }

  private static readonly sageCodeRgx = /\\begin{sagesilent}[\s\S]*\\end{sagesilent}/;

  private isStatic(problem: Problem): boolean {
    return ProblemComponent.sageCodeRgx.exec(problem.content) === null;
  }

  private static readonly problemContentRgx = /\\begin{problem}([\s\S]*)\\end{problem}/m;

  private cleanContent(content: string): string {
    const match = ProblemComponent.problemContentRgx.exec(content);
    if (!match) return content;
    return match[1];
  }

  @ViewChild('codeInput') private codeInput: AngularMonacoEditorComponent;

  private onEditorInit(event: any) {
    /* Place any code that needs to run after the monaco editor is loaded here. */
  }

  private problemSub: Subscription;

  private showEditor() {
    if (!this.problemSub) {
      this.problemSub = this.problem$.subscribe(() => this.renderMath());
    }
    this.editMode$.next(true);
  }

  @ViewChild('newTagsInput') private newTagsInput;

  private saveChanges() {
    const problem = this.problem$.value;
    problem.tags = parseTagString(this.newTagsInput.nativeElement.value);

    this.notifications.showLoading('Saving problem...');
    this.problemsService.upsert(problem)
      .subscribe(problem => {
        this.notifications.showSuccess('Problem saved successfully.');
        this.problem$.next(problem);
        this.editMode$.next(false);
      }, err => {
        this.notifications.showError('An error occured while trying to save a problem.');
        console.error(err);
      });
  }

  private cancelChanges() {
    this.problem$.next(this.problem$.value);
    this.editMode$.next(false);
  }
}
