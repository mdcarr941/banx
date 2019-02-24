import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InstanceListComponent } from './instance-list.component';
import { CollapsibleComponent } from './collapsible.component';

@NgModule({
  declarations: [
    AppComponent,
    InstanceListComponent,
    CollapsibleComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
