import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';

import { AppComponent } from './app.component';
import { InstanceListComponent } from './instance-list/instance-list.component';
import { CollapsibleComponent } from './collapsible.component';
import { AdminComponent } from './admin/admin.component';
import { ProblemQueryComponent } from './problem-query/problem-query.component';
import { ProblemListComponent} from './problem-list/problem-list.component';
import { ProblemComponent } from './problem/problem.component';
import { TagQueryComponent } from './tag-query/tag-query.component';
import { QueryComponent } from './query/query.component';
import { SageShellComponent } from './sage-shell/sage-shell.component';
import { NotificationComponent } from './notification/notification.component';
import { ModalComponent } from './modal/modal.component';
import { NotificationViewComponent } from './notification-view/notification-view.component';
import { UploadProblemsComponent } from './upload-problems/upload-problems.component';
import { AuthorProblemsComponent } from './author-problems/author-problems.component';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        FormsModule,
        AngularMonacoEditorModule.forRoot()
      ],
      declarations: [
        AppComponent,
        InstanceListComponent,
        CollapsibleComponent,
        AdminComponent,
        ProblemQueryComponent,
        ProblemListComponent,
        ProblemComponent,
        TagQueryComponent,
        QueryComponent,
        SageShellComponent,
        NotificationComponent,
        ModalComponent,
        NotificationViewComponent,
        UploadProblemsComponent,
        AuthorProblemsComponent
      ],
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  // it('should render title in a h1 tag', () => {
  //   const fixture = TestBed.createComponent(AppComponent);
  //   fixture.detectChanges();
  //   const compiled = fixture.debugElement.nativeElement;
  //   expect(compiled.querySelector('h1').textContent).toContain('Welcome to banx-app!');
  // });
});
