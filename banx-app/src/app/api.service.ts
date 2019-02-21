import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IProblem, Problem } from '../../../lib/schema';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  getProblems(ids: string[]): Observable<Problem[]> {
    return this.http.post<IProblem[]>('/api/problems', ids)
      .pipe(map(response => response.map(p => new Problem(p))));
  }

  getInstances(id: string, numInstances: number = 10): Observable<Problem[]> {
    return this.http.get<IProblem[]>(`/api/instance/${id}?numInstances=${numInstances}`)
      .pipe(map(response => response.map(m => new Problem(m))));
  }
}
