import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';
import { EventEmitter } from '@angular/core';

import { QueryComponent } from './query.component';
import { ProblemListComponent } from '../problem-list/problem-list.component';
import { ProblemComponent } from '../problem/problem.component';
import { ModalComponent } from '../modal/modal.component';
import { Problem } from '../../../../lib/schema';

describe('QueryComponent', () => {
  let component: QueryComponent;
  let fixture: ComponentFixture<QueryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        FormsModule,
        AngularMonacoEditorModule
      ],
      declarations: [
        QueryComponent,
        ProblemListComponent,
        ProblemComponent,
        ModalComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QueryComponent);
    component = fixture.componentInstance;
    component.problems$ = new EventEmitter<Problem[]>();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
