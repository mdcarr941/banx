import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { AngularMonacoEditorModule } from 'angular-monaco-editor';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ProblemQueryComponent } from './problem-query.component';
import { QueryComponent } from '../query/query.component';
import { CollapsibleComponent } from '../collapsible.component';
import { ProblemListComponent } from '../problem-list/problem-list.component';
import { ProblemComponent } from '../problem/problem.component';
import { ModalComponent } from '../modal/modal.component';

describe('ProblemQueryComponent', () => {
  let component: ProblemQueryComponent;
  let fixture: ComponentFixture<ProblemQueryComponent>;
  let httpTestingController: HttpTestingController;
  let nativeElement: HTMLElement;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
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
    httpTestingController = TestBed.get(HttpTestingController);
    fixture = TestBed.createComponent(ProblemQueryComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;
  });

  afterEach(() => {
    httpTestingController.verify();
  })

  it('should be instantiated', () => {
    expect(component).toBeTruthy();
  });

  it('should get topic OnInit', () => {
    fixture.detectChanges(); // do ngOnInit()

    const req = httpTestingController.expectOne('problems/getTopics')
    expect(req.request.method).toEqual('GET');

    req.flush(['Test Problems']);
  });

  it('should remember query parameters when a tag value is closed and then reopened', () => {
    fixture.detectChanges(); // do ngOnInit()

    const reqs = httpTestingController.match('problems/getTopics');
    expect(reqs.length).toEqual(1);
    expect(reqs[0].request.method).toEqual('GET');

    const topic = 'TestProblems';
    reqs[0].flush([topic]);

    fixture.detectChanges();

    const firstTopic: HTMLElement =  nativeElement.querySelector(
      'app-query > div:nth-child(2) > div.col-md-3 > nav > div > ul > app-collapsible > li > button'
    )
    firstTopic.click();

    const reqs2 = httpTestingController.match(`problems/getSubtopics/${topic}`);
    expect(reqs2.length).toEqual(1);
    expect(reqs2[0].request.method).toEqual('GET');

    const subtopic = 'Set0';
    reqs2[0].flush([subtopic]);

    fixture.detectChanges();

    const firstSubtopic: HTMLElement = nativeElement.querySelector(
      'app-query > div:nth-child(2) > div.col-md-3 > nav > div > ul > app-collapsible > ul > app-collapsible:nth-child(2) > li > button'
    );
    firstSubtopic.click();

    const reqs3 = httpTestingController.match(`problems/getTags/${topic}/${subtopic}`);
    expect(reqs3.length).toEqual(1);
    expect(reqs3[0].request.method).toEqual('GET');

    const tags = [
      {key: 'Color', values: ['blue']},
      {key: 'Index', values: ['1']}
    ];
    reqs3[0].flush(tags);

    fixture.detectChanges();

    const firstTag: HTMLElement = nativeElement.querySelector(
      'app-query > div:nth-child(2) > div.col-md-3 > nav > div > ul > app-collapsible > ul > app-collapsible:nth-child(2) > ul > app-collapsible:nth-child(2) > li > button'
    )
    firstTag.click();

    const firstValue: HTMLInputElement = nativeElement.querySelector(
      'app-query > div:nth-child(2) > div.col-md-3 > nav > div > ul > app-collapsible > ul > app-collapsible:nth-child(2) > ul > app-collapsible:nth-child(2) > ul > li > div > input[type=checkbox]'
    );
    firstValue.click();

    // The first value checkbox should now be checked.
    expect(firstValue.checked).toEqual(true);

    const queryButton: HTMLElement = nativeElement.querySelector(
      'app-query > div:nth-child(2) > div.col-md-3 > button'
    );
    queryButton.click();

    const firstColor = tags.find(t => t.key === 'Color').values[0];
    const queryUrl = `problems/?tags=Topic@${topic}&tags=Sub@${subtopic}&tags=Color@${firstColor}`;
    const reqs4 = httpTestingController.match(queryUrl);

    expect(reqs4.length).toEqual(1);
    expect(reqs4[0].request.method).toEqual('GET');

    const problemId = 'TestProblem';
    const problems = [
      {_id: null, idStr: problemId, content: 'Test problem content.', tags: [
        {key: 'Topic', value: topic},
        {key: 'Subtopic', value: subtopic},
        {key: 'Color', value: firstColor},
        {key: 'Unique', value: '1'}
      ]},
      {_id: null, idStr: problemId, content: 'Test problem 2 content.', tags: [
        {key: 'Topic', value: topic},
        {key: 'Subtopic', value: subtopic},
        {key: 'Color', value: firstColor},
        {key: 'Unique', value: '2'}
      ]}
    ];
    reqs4[0].flush(problems);
    
    fixture.detectChanges();

    const problemIdSpan: HTMLElement = nativeElement.querySelector(
      'app-query > div:nth-child(2) > div.col-md-9 > app-problem-list > app-problem:nth-child(1) > div:nth-child(2) > span.col-11'
    );
    expect(problemIdSpan.innerText).toEqual(problemId);

    const hitCounter: HTMLElement = nativeElement.querySelector(
      'app-query > div:nth-child(2) > div.col-md-3 > div > span:nth-child(2)'
    );
    expect(hitCounter.innerText).toEqual('2');

    // The first click will collapse the tag value list...
    firstTag.click();

    // and the second will open it back up.
    firstTag.click();

    // Now when we query we should be using the same parameters as before.
    queryButton.click();

    const reqs5 = httpTestingController.match(queryUrl);
    expect(reqs5.length).toEqual(1);
    expect(reqs5[0].request.method).toEqual('GET');

    reqs5[0].flush(problems);

    fixture.detectChanges();

    expect(hitCounter.innerText).toEqual('2');
  });
});
