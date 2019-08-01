import { Component, Input, ViewChild, OnInit, OnDestroy } from '@angular/core';
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
export class ProblemComponent implements OnInit, OnDestroy {
  @Input() problem: Problem;

  private editMode$ = new BehaviorSubject(false);

  private editorOptions = Object.freeze({
    language: 'latex',
    minimap: { enabled: false }
  });

  constructor(
    private problemsService: ProblemsService,
    private notifications: NotificationService,
    private remoteUserService: RemoteUserService
  ) { }

  private renderMath() {
    console.log('renderMath called');
    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
  }

  private problem$: BehaviorSubject<Problem>;

  ngOnInit() {
    this.problem$ = new BehaviorSubject(this.problem);
    this.renderMath();
  }

  private static readonly sageCodeRgx = /\\begin{sagesilent}[\s\S]*\\end{sagesilent}/;

  private isStatic(problem: Problem): boolean {
    return ProblemComponent.sageCodeRgx.exec(problem.content) === null;
  }

  private static readonly problemContentRgx = /\\begin{problem}([\s\S]*)\\end{problem}/m;
  private problemSub: Subscription = null;

  private cleanContent(content: string): string {
    if (!this.problemSub) {
      console.log('subscribing');
      this.problemSub = this.problem$.subscribe(() => this.renderMath());
    }

    const match = ProblemComponent.problemContentRgx.exec(content);
    if (!match) return content;
    return match[1];
  }

  ngOnDestroy() {
    if (this.problemSub) this.problemSub.unsubscribe();
  }

  @ViewChild('codeInput') private codeInput: AngularMonacoEditorComponent;

  private onEditorInit(event: any) {
    /* Place any code that needs to run after the monaco editor is loaded here. */
  }

  private showEditor() {
    this.editMode$.next(true);
  }

  @ViewChild('newTagsInput') private newTagsInput;

  private saveChanges() {
    const problem = this.problem$.value;
    problem.tags = parseTagString(this.newTagsInput.nativeElement.value);

    const sub = this.problem$.subscribe(() => this.renderMath());

    this.notifications.showLoading('Saving problem...');
    this.problemsService.upsert(problem)
      .subscribe(problem => {
        this.notifications.showSuccess('Problem saved successfully.');
        this.problem$.next(problem);
        this.editMode$.next(false);
        sub.unsubscribe();
      }, err => {
        this.notifications.showError('An error occured while trying to save a problem.');
        console.error(err);
        sub.unsubscribe();
      });
  }

  private cancelChanges() {
    this.problem$.next(this.problem$.value);
    this.editMode$.next(false);
  }
}
