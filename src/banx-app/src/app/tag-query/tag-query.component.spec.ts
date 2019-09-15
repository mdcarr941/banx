import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';

import { TagQueryComponent } from './tag-query.component';
import { QueryComponent } from '../query/query.component';
import { ProblemListComponent } from '../problem-list/problem-list.component';
import { ProblemComponent } from '../problem/problem.component';
import { ModalComponent } from '../modal/modal.component';

describe('TagQueryComponent', () => {
  let component: TagQueryComponent;
  let fixture: ComponentFixture<TagQueryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        AngularMonacoEditorModule.forRoot(),
        FormsModule
      ],
      declarations: [
        TagQueryComponent,
        QueryComponent,
        ProblemListComponent,
        ProblemComponent,
        ModalComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TagQueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
