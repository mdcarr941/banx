import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Problem } from '../../../lib/schema';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  getProblems(ids: string[]): Observable<Problem[]> {
    return this.http.post('/api/problems', ids)
      .pipe(map((array: Object[]) => array.map(p => new Problem(p))));
  }
}
