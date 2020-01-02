import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseComponent } from './course.component';
import { DirViewComponent } from '../dir-view/dir-view.component';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';
import { FormsModule } from '@angular/forms';
import { CollapsibleComponent } from '../collapsible.component';
import { HttpClientModule } from '@angular/common/http';

describe('CourseComponent', () => {
  let component: CourseComponent;
  let fixture: ComponentFixture<CourseComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        FormsModule,
        AngularMonacoEditorModule.forRoot()
      ],
      declarations: [
        CourseComponent,
        DirViewComponent,
        CollapsibleComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CourseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
