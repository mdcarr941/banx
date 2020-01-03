import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { DirViewComponent } from './dir-view.component';
import { CollapsibleComponent } from '../collapsible.component';
import { ModalComponent } from '../modal/modal.component';

describe('DirViewComponent', () => {
  let component: DirViewComponent;
  let fixture: ComponentFixture<DirViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [
        DirViewComponent,
        CollapsibleComponent,
        ModalComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DirViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
