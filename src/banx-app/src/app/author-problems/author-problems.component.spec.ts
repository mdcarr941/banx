import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AngularMonacoEditorModule, AngularMonacoEditorConfig } from 'angular-monaco-editor';

import { AuthorProblemsComponent } from './author-problems.component';

describe('AuthorProblemsComponent', () => {
  let component: AuthorProblemsComponent;
  let fixture: ComponentFixture<AuthorProblemsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ 
        FormsModule,
        HttpClientModule,
        AngularMonacoEditorModule.forRoot()
      ],
      declarations: [ AuthorProblemsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthorProblemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
