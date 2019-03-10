import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IProblem, Problem } from '../../../lib/schema';

export const apiEndpoint: string = '/api';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) { }

  private getUrl(end: string) {
    return apiEndpoint + end;
  }

  getProblems(ids: string[]): Observable<Problem[]> {
    return this.http.post<IProblem[]>(this.getUrl('/problems'), ids)
      .pipe(map(response => response.map(p => new Problem(p))));
  }

  getInstances(id: string, numInstances: number = 10): Observable<Problem[]> {
    return this.http.get<IProblem[]>(this.getUrl(`/instance/${id}?numInstances=${numInstances}`))
      .pipe(map(response => response.map(m => new Problem(m))));
  }

  submit(instances: Problem[]): Observable<Object> {
    return this.http.post(this.getUrl('/submission'), instances);
  }
}