import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';

import { ProblemQueryComponent } from './problem-query.component';
import { QueryComponent } from '../query/query.component';
import { CollapsibleComponent } from '../collapsible.component';
import { ProblemListComponent } from '../problem-list/problem-list.component';
import { ProblemComponent } from '../problem/problem.component';
import { ModalComponent } from '../modal/modal.component';

describe('ProblemQueryComponent', () => {
  let component: ProblemQueryComponent;
  let fixture: ComponentFixture<ProblemQueryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        AngularMonacoEditorModule.forRoot(),
        FormsModule
      ],
      declarations: [
        ProblemQueryComponent,
        QueryComponent,
        CollapsibleComponent,
        ProblemListComponent,
        ProblemComponent,
        ModalComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProblemQueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
