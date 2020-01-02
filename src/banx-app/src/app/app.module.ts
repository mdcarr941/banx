import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Routes, RouterModule } from '@angular/router';
import { AngularMonacoEditorConfig, AngularMonacoEditorModule } from 'angular-monaco-editor';

import { AppComponent } from './app.component';
import { InstanceListComponent } from './instance-list/instance-list.component';
import { CollapsibleComponent } from './collapsible.component';
import { SimpleCollapsibleComponent } from './simple-collapsible.component';
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
import { CourseComponent } from './course/course.component';
import { DirViewComponent } from './dir-view/dir-view.component';

const routes: Routes = [
  { path: '', redirectTo: '/problemquery', pathMatch: 'full'},
  { path: 'problemquery', component: ProblemQueryComponent },
  { path: 'instances', component: InstanceListComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'tagquery', component: TagQueryComponent },
  { path: 'sageshell', component: SageShellComponent },
  { path: 'uploadproblems', component: UploadProblemsComponent },
  { path: 'authorproblems', component: AuthorProblemsComponent },
  { path: 'course', component: CourseComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    InstanceListComponent,
    CollapsibleComponent,
    SimpleCollapsibleComponent,
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
    AuthorProblemsComponent,
    CourseComponent,
    DirViewComponent
  ],
  imports: [
    RouterModule.forRoot(routes),
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    AngularMonacoEditorModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
