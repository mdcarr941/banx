import { Component, Input, ViewChild, OnInit, Output, EventEmitter } from '@angular/core';
import { AngularMonacoEditorComponent } from 'angular-monaco-editor';
import { BehaviorSubject } from 'rxjs';

import { ProblemsService } from '../problems.service';
import { NotificationService } from '../notification.service';
import { RemoteUserService } from '../remote-user.service';
import { Problem } from '../../../../lib/schema';
import { parseTagString } from '../../../../lib/common';
import { ModalComponent } from '../modal/modal.component';
import { useMathJax } from '../app.component';
import { echo } from '../repo.service';

@Component({
  selector: 'app-problem',
  templateUrl: './problem.component.html',
  styleUrls: ['./problem.component.css']
})
export class ProblemComponent implements OnInit {
  @Input() problem: Problem;
  // When this EventEmitter emits it indicates that this problem
  // should be removed from which every component it is in.
  @Output() deleteMe = new EventEmitter<void>();

  private readonly editMode$ = new EventEmitter<boolean>();
  private readonly editorOptions = Object.freeze({
    language: 'LaTeX',
    minimap: { enabled: false }
  });
  public readonly showAddToFileModal$ = new EventEmitter<void>();
  public readonly hideAddToFileModal$ = new EventEmitter<void>();
  public readonly showFileBrowser$ = new EventEmitter<void>();
  public readonly hideFileBrowser$ = new EventEmitter<void>();

  // The path to the file that this problem should be appended to. 
  public selectedFile: string;
  public problem$: BehaviorSubject<Problem>;

  constructor(
    private problemsService: ProblemsService,
    private notifications: NotificationService,
    private remoteUserService: RemoteUserService
  ) { }

  private renderMath() {
    // BADBAD: Using setTimeout is an ugly hack.
    useMathJax(mathJax => {
      setTimeout(() => mathJax.Hub.Queue(["Typeset", mathJax.Hub]), 200);
    });
  }


  ngOnInit() {
    this.problem$ = new BehaviorSubject(this.problem);
    this.editMode$.subscribe(editing => {
      if (!editing) this.renderMath();
    });
    this.editMode$.next(false);
  }

  ngOnDestroy() {
    this.problem$.complete();
    this.editMode$.complete();
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

  private showEditor() {
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

  @ViewChild('confirmModal') private confirmModal: ModalComponent;

  private showConfirmModal() {
    this.confirmModal.show();
  }

  public deleteProblem() {
    const idStr = this.problem$.value.idStr;
    this.notifications.showLoading(`Deleting problem with id ${idStr}`);
    this.problemsService.delete(idStr)
    .subscribe(
      deletedProblem => {
        this.notifications.showSuccess('Problem deleted successfully');
        this.deleteMe.emit();
      },
      err => {
        this.notifications.showError('An error occured while deleting the problem');
        console.error(err);
      }
    );
  }

  public async addToFile(): Promise<void> {
    this.hideAddToFileModal$.next();
    const selectedFile = this.selectedFile;
    this.selectedFile = null;
    try {
      await echo(selectedFile, '\n\n' + this.problem.toString());
      this.notifications.showSuccess(`Added problem to '${selectedFile}'.`);
    }
    catch (err) {
      this.notifications.showError(`Failed to add problem to '${selectedFile}'!`);
      console.error(err);
    }
  }

  public selectFile(path: string): void {
    this.selectedFile = path;
  }
}
