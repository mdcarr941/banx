import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { Routes, RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { InstanceListComponent } from './instance-list/instance-list.component';
import { CollapsibleComponent } from './collapsible.component';
import { AdminComponent } from './admin/admin.component';
import { MainInterfaceComponent } from './main-interface/main-interface.component';
import { ProblemComponent } from './problem/problem.component';
import { TagQueryComponent } from './tag-query/tag-query.component';
import { ProblemListComponent } from './problem-list/problem-list.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full'},
  { path: 'home', component: MainInterfaceComponent },
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
    MainInterfaceComponent,
    ProblemComponent,
    TagQueryComponent,
    ProblemListComponent
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
