import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';

import { CourseComponent } from './course.component';
import { DirViewComponent } from '../dir-view/dir-view.component';
import { CollapsibleComponent } from '../collapsible.component';
import { ModalComponent } from '../modal/modal.component';

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
        CollapsibleComponent,
        ModalComponent
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
