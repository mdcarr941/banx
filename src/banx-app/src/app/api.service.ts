import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IProblem, Problem, IBanxUser, BanxUser,
         UserRole, KeyValPair } from '../../../lib/schema';
import { urlJoin, joinPairs } from '../../../lib/common';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  static readonly apiEndpoint: string = 'api';

  constructor(private http: HttpClient) { }

  private getUrl(end: string) {
    return urlJoin(ApiService.apiEndpoint, end);
  }

  getProblems(ids: string[]): Observable<Problem[]> {
    return this.http.post<IProblem[]>(this.getUrl('/problems'), ids)
      .pipe(map(response => response.map(p => new Problem(p))));
  }

  // Query problems by providing a list of `<tag name>@<tag value>` strings.
  findProblems(tags: string[]): Observable<Problem[]> {
    const tagsQuery = tags.map(s => 'tags=' + s).join('&');
    return this.http.get<IProblem[]>(this.getUrl('/problems?' + tagsQuery))
      .pipe(map(response => response.map(iproblem => new Problem(iproblem))));
  }

  getInstances(id: string, numInstances: number = 10): Observable<Problem[]> {
    return this.http.get<IProblem[]>(this.getUrl(`/instance/${id}?numInstances=${numInstances}`))
      .pipe(map(response => response.map(m => new Problem(m))));
  }

  submit(instances: Problem[]): Observable<Object> {
    return this.http.post(this.getUrl('/submission'), instances);
  }

  listUsers(): Observable<BanxUser[]> {
    return this.http.get<IBanxUser[]>('users')
      .pipe(map(response => response.map(iuser => new BanxUser(iuser))));
  }

  insertUser(user: BanxUser): Observable<BanxUser> {
    return this.http.post<BanxUser>('users', user)
      .pipe(map(response => new BanxUser(response)));
  }

  deleteUser(glid: string): Observable<Boolean> {
    return this.http.delete<any>(`users/${glid}`)
      .pipe(map(response => response.deleteSucceeded));
  }

  modifyUser(glid: string, roles: UserRole[]): Observable<Boolean> {
    return this.http.post<any>(`users/${glid}`, roles)
      .pipe(map(response => response.result));
  }
}
