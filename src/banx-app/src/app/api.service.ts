import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IProblem, Problem, IBanxUser, BanxUser } from '../../../lib/schema';
import { urlJoin } from '../../../lib/common';

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

  getInstances(id: string, numInstances: number = 10): Observable<Problem[]> {
    return this.http.get<IProblem[]>(this.getUrl(`/instance/${id}?numInstances=${numInstances}`))
      .pipe(map(response => response.map(m => new Problem(m))));
  }

  submit(instances: Problem[]): Observable<Object> {
    return this.http.post(this.getUrl('/submission'), instances);
  }

  listUsers(): Observable<BanxUser[]> {
    return this.http.get<IBanxUser[]>(this.getUrl('/users'))
      .pipe(map(response => response.map(iuser => new BanxUser(iuser))));
  }

  insertUser(user: BanxUser): Observable<BanxUser> {
    return this.http.post<BanxUser>(this.getUrl('/users'), user)
      .pipe(map(response => new BanxUser(response)));
  }

  deleteUser(user: BanxUser): Observable<Boolean> {
    return this.http.delete<any>(this.getUrl(`/users/${user.glid}`))
      .pipe(map(response => response.deleteSucceeded));
  }
}
