import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IProblem, Problem, KeyValPair } from '../../../lib/schema';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root'
})
export class ProblemsService extends BaseService {
  protected readonly endpoint = 'problems';

  constructor(private http: HttpClient) {
    super();
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

  upsert(problem: Problem): Observable<Problem> {
    return this.http.post<IProblem>(this.getUrl(problem.idStr), problem)
      .pipe(map(iproblem => new Problem(iproblem)));
  }

  create(problem: Problem): Observable<Problem> {
    return this.http.post<IProblem>(this.getUrl('/create'), problem)
      .pipe(map(iproblem => new Problem(iproblem)));
  }

  delete(idStr: string): Observable<Problem> {
    return this.http.delete<IProblem>(this.getUrl(idStr))
      .pipe(map(iproblem => new Problem(iproblem)));
  }

  listTagValues(tagKey: string): Observable<string[]> {
    return this.http.get<string[]>(this.getUrl(`/listTagValues/${tagKey}`));
  }

  getSubtopics(topic: string): Observable<string[]> {
    return this.http.get<string[]>(this.getUrl(`/getSubtopics/${topic}`));
  }

  getTags(topic: string, subtopic: string): Observable<KeyValPair[]> {
    return this.http.get<KeyValPair[]>(this.getUrl(`/getTags/${topic}/${subtopic}`));
  }
}