import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';
import { BehaviorSubject } from 'rxjs';

import { ProblemListComponent } from './problem-list.component';
import { ProblemComponent } from '../problem/problem.component';
import { ModalComponent } from '../modal/modal.component';

describe('ProblemListComponent', () => {
  let component: ProblemListComponent;
  let fixture: ComponentFixture<ProblemListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        FormsModule,
        AngularMonacoEditorModule.forRoot()
      ],
      declarations: [
        ProblemListComponent,
        ProblemComponent,
        ModalComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProblemListComponent);
    component = fixture.componentInstance;
    component.problems$ = new BehaviorSubject([]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
