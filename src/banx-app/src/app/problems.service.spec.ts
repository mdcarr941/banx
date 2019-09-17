import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'

import { ProblemsService } from './problems.service';
import { IProblem, Problem } from '../../../lib/schema';

class HttpClientStub extends HttpClient {
  private readonly endpoint: string;

  constructor(endpoint: string) {
    super(null);
    this.endpoint = endpoint;
  }

  private newError(message?: string): Error {
    let errMessage = 'Bad call to HttpClient';
    if (message && message.length > 0)  errMessage += ':\n' + message;
    else errMessage += '.';
    return new Error(errMessage);
  }

  private static makeTestingProb(setNum: number, color: string, index: number): IProblem {
    return {
      _id: null,
      idStr: `TestingProblem${setNum}${index}`,
      tags: [
        {key: 'Topic', value: 'Testing Problems'},
        {key: 'Sub', value: `Set${setNum}`},
        {key: 'Color', value: 'blue'},
        {key: 'Index', value: index.toString()}
      ]
    }
  }

  private checkEndpoint(path: string): void {
    if (!path.startsWith(this.endpoint)) throw this.newError(
      `The beginning of path "${path}" did not match endpoint "${this.endpoint}".`
    );
  }

  public get<T>(path: string): Observable<T> {
    this.checkEndpoint(path);
    return of(<T><unknown>[
      {setNum: 0, color: 'blue', index: 1},
      {setNum: 0, color: 'red', index: 2},
      {setNum: 0, color: 'blue', index: 3},
      {setNum: 0, color: 'red', index: 4},
      {setNum: 0, color: 'blue', index: 5},
      {setNum: 0, color: 'red', index: 6},
      {setNum: 1, color: 'blue', index: 1},
      {setNum: 1, color: 'red', index: 2},
      {setNum: 1, color: 'blue', index: 3},
      {setNum: 1, color: 'red', index: 4},
      {setNum: 1, color: 'blue', index: 5},
      {setNum: 1, color: 'red', index: 6}
    ].map(args => HttpClientStub.makeTestingProb(args.setNum, args.color, args.index)));
  }

  public post<T>(path: string, body: any): Observable<T> {
    this.checkEndpoint(path);
    throw this.newError();
  }

  public delete<T>(path: string): Observable<T> {
    this.checkEndpoint(path);
    throw this.newError();
  }
}

describe('ProblemsService', () => {
  let problemsService: ProblemsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule ]
    })
    problemsService = TestBed.get(ProblemsService);
    httpTestingController = TestBed.get(HttpTestingController);
  });

  it('should be created', () => {
    expect(problemsService).toBeTruthy();
  });

  it('should be able to query problems', () => {
    const testData: IProblem[] = [{
      _id: null,
      idStr: `TestingProblem0`,
      tags: [
        {key: 'Topic', value: 'Testing Problems'},
        {key: 'Sub', value: `Set0`},
        {key: 'Color', value: 'blue'},
        {key: 'Index', value: '1'}
      ]
    }];

    problemsService.find(['Topic@Set0']).subscribe(problems => {
      expect(problems.length).toBeGreaterThanOrEqual(1);
    });

    const req = httpTestingController.expectOne('problems/?tags=Topic@Set0');
    expect(req.request.method).toEqual('GET');

    req.flush(testData);

    httpTestingController.verify();
  });
});
