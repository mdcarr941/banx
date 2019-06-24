import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IProblem, Problem } from '../../../lib/schema';
import { urlJoin } from '../../../lib/common';

@Injectable({
  providedIn: 'root'
})
export class ProblemsService {
  static readonly apiEndpoint: string = 'problems';

  constructor(private http: HttpClient) { }

  private getUrl(end?: string) {
    if (!end) end = '';
    return urlJoin(ProblemsService.apiEndpoint, end);
  }

  // Query problems by providing a list of `<tag name>@<tag value>` strings.
  find(tags: string[]): Observable<Problem[]> {
    const tagsQuery = tags.map(s => 'tags=' + s).join('&');
    return this.http.get<IProblem[]>(this.getUrl('?' + tagsQuery))
      .pipe(map(response => response.map(iproblem => new Problem(iproblem))));
  }

  get(ids: string[]): Observable<Problem[]> {
    return this.http.post<IProblem[]>(this.getUrl(), ids)
      .pipe(map(response => response.map(p => new Problem(p))));
  }

  getInstances(id: string, numInstances: number = 10): Observable<Problem[]> {
    return this.http.get<IProblem[]>(this.getUrl(`/instance/${id}?numInstances=${numInstances}`))
      .pipe(map(response => response.map(m => new Problem(m))));
  }

  submit(instances: Problem[]): Observable<Object> {
    return this.http.post(this.getUrl('/submit'), instances);
  }
}
