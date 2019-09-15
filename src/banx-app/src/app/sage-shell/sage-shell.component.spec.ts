import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';

import { SageShellComponent } from './sage-shell.component';
import { QueryComponent } from '../query/query.component';
import { ProblemListComponent } from '../problem-list/problem-list.component';
import { ProblemComponent } from '../problem/problem.component';
import { ModalComponent } from '../modal/modal.component';

describe('SageShellComponent', () => {
  let component: SageShellComponent;
  let fixture: ComponentFixture<SageShellComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        AngularMonacoEditorModule.forRoot(),
        FormsModule
      ],
      declarations: [
        SageShellComponent,
        QueryComponent,
        ProblemListComponent,
        ProblemComponent,
        ModalComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SageShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
