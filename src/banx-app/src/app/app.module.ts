import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { Routes, RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { InstanceListComponent } from './instance-list/instance-list.component';
import { CollapsibleComponent } from './collapsible.component';
import { AdminComponent } from './admin/admin.component';
import { ProblemQueryComponent } from './problem-query/problem-query.component';
import { ProblemComponent } from './problem/problem.component';
import { TagQueryComponent } from './tag-query/tag-query.component';
import { ProblemListComponent } from './problem-list/problem-list.component';
import { QueryComponent } from './query/query.component';

const routes: Routes = [
  { path: '', redirectTo: '/problemquery', pathMatch: 'full'},
  { path: 'problemquery', component: ProblemQueryComponent },
  { path: 'instances', component: InstanceListComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'tagquery', component: TagQueryComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    InstanceListComponent,
    CollapsibleComponent,
    AdminComponent,
    ProblemQueryComponent,
    ProblemComponent,
    TagQueryComponent,
    ProblemListComponent,
    QueryComponent
  ],
  imports: [
    RouterModule.forRoot(routes),
    BrowserModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
